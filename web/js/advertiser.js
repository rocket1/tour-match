// Self-serve Ads Manager: app/src/app/advertiser/* and server/src/ads.ts, simulated in the browser.
// Campaign lifecycle matches the server: draft → in review → live ⇄ paused → ended, with rejection
// and re-enable. Billing runs in "test mode" (no card is ever charged).
(function () {
  "use strict";

  const TM = window.TM;
  const D = window.TM_DATA;
  const { esc, icon, ui, href } = TM;
  const CFG = D.ADVERTISER_CONFIG;
  const CAT_LABEL = D.AD_CATEGORY_LABEL;
  const CAT_ICON = D.AD_CATEGORY_ICON;

  const img = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=70&auto=format&fit=crop`;
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

  const CREATIVE_KEYS = ["headline", "body", "imageUrl", "url", "ctaLabel", "category"];
  const contentHash = (c) => JSON.stringify(CREATIVE_KEYS.map((k) => c[k] ?? null));

  const EMPTY_AD = {
    headline: "",
    body: "",
    imageUrl: null,
    url: "https://",
    ctaLabel: "Learn more",
    category: "attractions",
    destinations: [],
    interests: [],
    startDate: null,
    endDate: null,
  };

  // --- Model -----------------------------------------------------------------------------------

  const S = TM.storage;
  const A = (TM.advertiser = {
    account: () => S.get("advertiser.account", null),
    campaigns: () => sweep(S.get("advertiser.campaigns", [])),
    charges: () => S.get("advertiser.charges", []),
    get: (id) => A.campaigns().find((c) => c.id === id) ?? null,

    saveAll(list) {
      S.set("advertiser.campaigns", list);
    },
    update(id, fn) {
      const list = A.campaigns();
      const c = list.find((x) => x.id === id);
      if (!c) return null;
      fn(c);
      c.updatedAt = now();
      A.saveAll(list);
      return c;
    },

    signUp(data) {
      const account = {
        id: `adv_${TM.randomId(4)}`,
        email: data.email.trim().toLowerCase(),
        companyName: data.companyName.trim(),
        contactName: data.contactName.trim(),
        website: data.website.trim() || null,
        termsVersion: CFG.termsVersion,
        termsAcceptedAt: now(),
        card: null,
        createdAt: now(),
      };
      S.set("advertiser.account", account);
      S.set("advertiser.signedIn", true);
      seedCampaigns(account);
      return account;
    },
    signIn: () => S.set("advertiser.signedIn", true),
    signOut: () => S.set("advertiser.signedIn", false),
    signedIn: () => !!A.account() && S.get("advertiser.signedIn", false),
    deleteAll() {
      ["advertiser.account", "advertiser.campaigns", "advertiser.charges", "advertiser.signedIn"].forEach(S.remove);
    },

    create(content) {
      const acct = A.account();
      const c = {
        ...content,
        id: `c_${TM.randomId(4)}`,
        advertiser: acct.companyName,
        status: "draft",
        endReason: null,
        rejectionReason: null,
        budgetCents: 0,
        spentCents: 0,
        impressions: 0,
        clicks: 0,
        approvedContentHash: null,
        createdAt: now(),
        updatedAt: now(),
        endedAt: null,
      };
      A.saveAll([c, ...A.campaigns()]);
      return c;
    },

    edit(id, content) {
      return A.update(id, (c) => {
        Object.assign(c, content);
        // Changing the creative of a running ad sends it back to review.
        if ((c.status === "active" || c.status === "paused") && contentHash(c) !== c.approvedContentHash) c.status = "in_review";
      });
    },

    launch(id, addCents, endDate) {
      return A.update(id, (c) => {
        c.budgetCents += addCents;
        if (endDate !== undefined) c.endDate = endDate || null;
        c.endReason = null;
        c.rejectionReason = null;
        c.endedAt = null;
        // A creative that was approved before goes straight back live.
        c.status = c.approvedContentHash && contentHash(c) === c.approvedContentHash ? "active" : "in_review";
        if (addCents > 0) addCharge(c, addCents);
      });
    },

    pause: (id) => A.update(id, (c) => (c.status = "paused")),
    resume: (id) => A.update(id, (c) => (c.status = "active")),
    end: (id) =>
      A.update(id, (c) => {
        refund(c);
        c.status = "ended";
        c.endReason = "stopped";
        c.endedAt = now();
      }),
    approve: (id) =>
      A.update(id, (c) => {
        c.status = "active";
        c.approvedContentHash = contentHash(c);
      }),
    reject: (id, reason) =>
      A.update(id, (c) => {
        refund(c);
        c.status = "rejected";
        c.rejectionReason = reason;
      }),
    duplicate(id) {
      const src = A.get(id);
      const content = Object.fromEntries(Object.keys(EMPTY_AD).map((k) => [k, src[k]]));
      return A.create({ ...content, headline: src.headline.slice(0, 73) + " (copy)" });
    },
    remove: (id) => A.saveAll(A.campaigns().filter((c) => c.id !== id)),

    // --- Delivery: used by the traveller results page ---
    liveAdsFor(intent) {
      if (!A.account()) return [];
      const dest = intent.destination?.toLowerCase() ?? null;
      return A.campaigns()
        .filter((c) => c.status === "active" && c.spentCents < c.budgetCents)
        .filter((c) => !c.startDate || c.startDate <= today())
        .filter((c) => !c.destinations.length || (dest && c.destinations.includes(dest)))
        .filter((c) => !c.interests.length || c.interests.some((i) => intent.interests.includes(i) || (i === "family" && intent.interests.includes("family"))))
        .map((c) => ({ campaignId: c.id, advertiser: c.advertiser, headline: c.headline, body: c.body, imageUrl: c.imageUrl, ctaLabel: c.ctaLabel, url: c.url }));
    },
    recordImpression(id) {
      if (id?.startsWith("c_")) A.update(id, (c) => c.impressions++);
    },
    recordClick(id) {
      if (!id?.startsWith("c_")) return;
      A.update(id, (c) => {
        c.clicks++;
        c.spentCents = Math.min(c.budgetCents, c.spentCents + CFG.cpcCents);
        if (c.spentCents >= c.budgetCents) {
          c.status = "ended";
          c.endReason = "budget_spent";
          c.endedAt = now();
        }
      });
    },
  });

  // Ads past their end date finish on their own.
  function sweep(list) {
    let changed = false;
    for (const c of list) {
      if ((c.status === "active" || c.status === "paused") && c.endDate && c.endDate < today()) {
        refund(c);
        Object.assign(c, { status: "ended", endReason: "completed", endedAt: now() });
        changed = true;
      }
    }
    if (changed) S.set("advertiser.campaigns", list);
    return list;
  }

  function addCharge(c, cents) {
    const charges = A.charges();
    charges.unshift({
      id: `ch_${TM.randomId(4)}`,
      campaignId: c.id,
      amountCents: cents,
      refundedCents: 0,
      currency: "USD",
      status: "not_billed",
      description: `Budget for "${c.headline}"`,
      createdAt: now(),
    });
    S.set("advertiser.charges", charges);
  }

  function refund(c) {
    let left = Math.max(0, c.budgetCents - c.spentCents);
    if (!left) return;
    const charges = A.charges();
    for (const ch of charges.filter((x) => x.campaignId === c.id)) {
      const give = Math.min(left, ch.amountCents - ch.refundedCents);
      ch.refundedCents += give;
      left -= give;
      if (!left) break;
    }
    S.set("advertiser.charges", charges);
    c.budgetCents = c.spentCents;
  }

  // Sample campaigns so a new account has something to explore in every tab.
  function seedCampaigns(acct) {
    const base = { advertiser: acct.companyName, endReason: null, rejectionReason: null, startDate: null, endDate: null, endedAt: null };
    const mk = (o) => {
      const c = { ...base, id: `c_${TM.randomId(4)}`, createdAt: daysAgo(o.age ?? 10), updatedAt: daysAgo(1), ...o };
      delete c.age;
      if (c.status !== "draft" && c.status !== "in_review" && c.status !== "rejected") c.approvedContentHash = contentHash(c);
      return c;
    };
    const list = [
      mk({ status: "active", headline: "Skip the lines at the Colosseum", body: "Timed entry plus a 90-minute guided walk of the Forum. Free cancellation up to 24 hours before.", imageUrl: img("1552832230-c0197dd311b5"), url: "https://example.com/colosseum", ctaLabel: "Book now", category: "tours", destinations: ["rome"], interests: ["history"], budgetCents: 15000, spentCents: 4260, impressions: 9840, clicks: 71, approvedContentHash: null, age: 12 }),
      mk({ status: "paused", headline: "Gelato-making class in Trastevere", body: "Learn the craft from a third-generation gelatiere, then eat your work.", imageUrl: img("1515542622106-78bda8ba0e5b"), url: "https://example.com/gelato", ctaLabel: "Learn more", category: "food_drink", destinations: ["rome"], interests: ["food", "family"], budgetCents: 6000, spentCents: 1920, impressions: 3105, clicks: 32, approvedContentHash: null, age: 20 }),
      mk({ status: "in_review", headline: "Sunset kayak on the Tagus", body: "Paddle under the 25 de Abril bridge at golden hour. All levels welcome.", imageUrl: img("1585208798174-6cedd86e019a"), url: "https://example.com/kayak", ctaLabel: "See times", category: "tours", destinations: ["lisbon"], interests: ["outdoors"], budgetCents: 5000, spentCents: 0, impressions: 0, clicks: 0, approvedContentHash: null, age: 1 }),
      mk({ status: "draft", headline: "Family pasta night", body: "", imageUrl: null, url: "https://", ctaLabel: "Learn more", category: "food_drink", destinations: ["rome"], interests: ["family"], budgetCents: 0, spentCents: 0, impressions: 0, clicks: 0, approvedContentHash: null, age: 2 }),
      mk({ status: "ended", endReason: "completed", endedAt: daysAgo(30), headline: "Christmas market walking tour", body: "Mulled wine and carols through Covent Garden and Leicester Square.", imageUrl: img("1513635269975-59663e0ac1ad"), url: "https://example.com/xmas", ctaLabel: "Book now", category: "events", destinations: ["london"], interests: [], endDate: "2025-12-24", budgetCents: 4800, spentCents: 4800, impressions: 12400, clicks: 80, approvedContentHash: null, age: 300 }),
      mk({ status: "ended", endReason: "budget_spent", endedAt: daysAgo(60), headline: "Fiumicino airport transfer, flat fare", body: "Meet-and-greet at arrivals and a fixed price to central Rome.", imageUrl: null, url: "https://example.com/transfer", ctaLabel: "Get a quote", category: "transport", destinations: ["rome"], interests: [], budgetCents: 3000, spentCents: 3000, impressions: 6120, clicks: 50, approvedContentHash: null, age: 90 }),
      mk({ status: "rejected", rejectionReason: "Unverifiable claim in headline. We can't confirm \"only official\" guides.", headline: "Rome's only official licensed guides", body: "Every guide state-certified. Book with confidence.", imageUrl: null, url: "https://example.com/guides", ctaLabel: "Book now", category: "tours", destinations: ["rome"], interests: ["history"], budgetCents: 0, spentCents: 0, impressions: 0, clicks: 0, approvedContentHash: null, age: 5 }),
    ];
    S.set("advertiser.campaigns", list);
    S.set(
      "advertiser.charges",
      list
        .filter((c) => c.status !== "draft")
        .map((c) => ({ id: `ch_${TM.randomId(4)}`, campaignId: c.id, amountCents: c.status === "rejected" ? 4000 : c.budgetCents || 5000, refundedCents: c.status === "rejected" ? 4000 : 0, currency: "USD", status: "not_billed", description: `Budget for "${c.headline}"`, createdAt: c.createdAt })),
    );
  }

  // --- Shared UI ------------------------------------------------------------------------------------

  const STATUS = {
    draft: ["Draft", "pill-off"],
    in_review: ["In review", "pill-warn"],
    active: ["Live", "pill-ok"],
    paused: ["Paused", "pill-paused"],
    rejected: ["Rejected", "pill-bad"],
    ended: ["Ended", "pill-off"],
  };
  const END_REASON = { completed: "Completed", budget_spent: "Budget spent", stopped: "Stopped early" };
  const statusPill = (c) => {
    const [label, cls] = STATUS[c.status];
    return `<span class="status-pill ${cls}">${c.status === "ended" && c.endReason ? END_REASON[c.endReason] : label}</span>`;
  };
  const ctr = (c) => (c.impressions ? `${((c.clicks / c.impressions) * 100).toFixed(1)}%` : "–");
  const stat = (label, value) => `<div class="stat"><div class="caption">${esc(label)}</div><div class="title">${esc(value)}</div></div>`;
  const toPlacement = (c) => ({ campaignId: c.id, advertiser: c.advertiser, headline: c.headline || "Your headline", body: c.body, imageUrl: c.imageUrl, ctaLabel: c.ctaLabel || "Learn more", url: c.url });
  const footer = `<div class="page-footer"><a class="link" href="#/support/advertiser">Advertiser support</a><a class="link" href="#/legal/advertiser">Advertiser Terms</a></div>`;

  /** Redirect to sign-in when there's no session. Returns the account or null. */
  function requireAccount() {
    if (A.signedIn()) return A.account();
    setTimeout(() => TM.go("/advertiser/login", { next: location.hash.slice(1) }, { replace: true }));
    return null;
  }

  // --- Sign up / sign in ---------------------------------------------------------------------------------

  TM.route(/^\/advertiser\/signup$/, () => {
    let form = {};
    let issues = {};
    let busy = false;
    return {
      title: "Create advertiser account · TourMatch",
      render() {
        return `${ui.screenHeader("Create account", { fallback: "/advertise" })}
        <div class="page"><div class="narrow">
          <h1 class="display">Start advertising</h1>
          <p class="body lede">Create ads, set a budget and launch in minutes. You only pay for clicks.</p>
          <form data-submit="signup" class="mt-6" novalidate>
            ${ui.field({ name: "companyName", label: "Business name", value: form.companyName, error: issues.companyName, attrs: 'autocomplete="organization"' })}
            ${ui.field({ name: "contactName", label: "Your name", value: form.contactName, error: issues.contactName, attrs: 'autocomplete="name"' })}
            ${ui.field({ name: "email", label: "Work email", type: "email", value: form.email, error: issues.email, attrs: 'autocomplete="email"' })}
            ${ui.field({ name: "website", label: "Website (optional)", type: "url", value: form.website, error: issues.website })}
            ${ui.field({ name: "password", label: "Password", type: "password", error: issues.password, hint: "At least 8 characters.", attrs: 'autocomplete="new-password"' })}
            ${ui.termsCheck("advertiser", "Advertiser Terms", form.acceptTerms, issues.acceptTerms)}
            ${ui.button("Create account", { type: "submit", busy })}
          </form>
          <p class="caption mt-4">Preview: your account lives in this browser only, and sample ads are added so you can explore. Passwords aren't stored.</p>
          <p class="body center-text mt-6">Already have an account? <a class="link" href="#/advertiser/login">Sign in</a></p>
        </div></div>`;
      },
      actions: {
        async signup(formEl, root, view) {
          form = TM.formData(formEl);
          issues = TM.check(form, {
            companyName: TM.rules.required("your business name"),
            contactName: TM.rules.required("your name"),
            email: TM.rules.email,
            website: TM.rules.optionalUrl,
            password: (v) => (v.length < 8 ? "Use at least 8 characters." : null),
            acceptTerms: (v) => (v ? null : "You need to accept the Advertiser Terms."),
          });
          form.password = "";
          if (Object.keys(issues).length) return view.refresh({ keepScroll: true });
          busy = true;
          view.refresh({ keepScroll: true });
          await TM.delay(500);
          A.signUp(form);
          TM.go("/advertiser", null, { replace: true });
        },
      },
    };
  });

  TM.route(/^\/advertiser\/login$/, (ctx) => {
    let email = "";
    let error = null;
    let busy = false;
    return {
      title: "Sign in · Ads Manager",
      render() {
        return `${ui.screenHeader("Sign in", { fallback: "/advertise" })}
        <div class="page"><div class="narrow">
          <h1 class="display">Ads Manager</h1>
          <p class="body lede">Sign in to manage your ads and billing.</p>
          <form data-submit="login" class="mt-6" novalidate>
            ${ui.field({ name: "email", label: "Email", type: "email", value: email, attrs: 'autocomplete="email"' })}
            ${ui.field({ name: "password", label: "Password", type: "password", attrs: 'autocomplete="current-password"' })}
            ${error ? `<p class="form-error">${error}</p>` : ""}
            ${ui.button("Sign in", { type: "submit", busy, variant: "dark" })}
          </form>
          <p class="caption mt-4">Preview: use the email you signed up with in this browser. Any password works.</p>
          <p class="body center-text mt-6">New to TourMatch ads? <a class="link" href="#/advertiser/signup">Create an account</a></p>
        </div></div>`;
      },
      actions: {
        async login(formEl, root, view) {
          const data = TM.formData(formEl);
          email = data.email.trim();
          busy = true;
          view.refresh({ keepScroll: true });
          await TM.delay(400);
          busy = false;
          const acct = A.account();
          if (!acct || acct.email !== email.toLowerCase() || !data.password) {
            error = acct || !email
              ? "Wrong email or password."
              : `No account for that email in this browser. <a class="link" href="#/advertiser/signup">Create one</a>.`;
            return view.refresh({ keepScroll: true });
          }
          A.signIn();
          TM.go(ctx.params.next || "/advertiser", null, { replace: true });
        },
      },
    };
  });

  // --- Dashboard: app/src/app/advertiser/index.tsx ----------------------------------------------------

  const LIVE = new Set(["active", "paused", "in_review"]);
  const PAST_GROUPS = [
    { key: "completed", label: "Completed", match: (c) => c.status === "ended" && c.endReason === "completed" },
    { key: "budget_spent", label: "Budget spent", match: (c) => c.status === "ended" && c.endReason === "budget_spent" },
    { key: "stopped", label: "Stopped early", match: (c) => c.status === "ended" && c.endReason === "stopped" },
    { key: "rejected", label: "Rejected", match: (c) => c.status === "rejected" },
  ];

  const adRow = (c) => {
    const action = { ended: "Re-enable", rejected: "Edit & resubmit", draft: "Finish & launch" }[c.status];
    return `<a class="ad-row" href="${href(`/advertiser/ads/${c.id}`)}">
      <span class="icon-box lg">${icon(CAT_ICON[c.category])}</span>
      <span class="grow">
        <span class="inline">${statusPill(c)}<span class="caption">${esc(CAT_LABEL[c.category])}</span></span>
        <span class="strong clamp2">${esc(c.headline || "Untitled ad")}</span>
        ${
          c.status !== "draft"
            ? `<span class="caption">${c.impressions.toLocaleString()} views · ${c.clicks.toLocaleString()} clicks · ${ctr(c)} CTR · ${TM.formatCents(c.spentCents)} of ${TM.formatCents(c.budgetCents)}</span>`
            : ""
        }
        ${c.destinations.length ? `<span class="caption ellipsis">${icon("location-outline")} ${esc(c.destinations.map(TM.titleCase).join(", "))}</span>` : ""}
        ${action ? `<span class="row-action">${action} →</span>` : ""}
      </span>
    </a>`;
  };

  TM.route(/^\/advertiser$/, () => {
    let tab = TM.storage.get("advertiser.tab", "live");
    let category = "all";
    return {
      title: "Ads Manager · TourMatch",
      render() {
        const account = requireAccount();
        if (!account) return "";
        const list = A.campaigns();
        const groups = { live: list.filter((c) => LIVE.has(c.status)), drafts: list.filter((c) => c.status === "draft"), past: list.filter((c) => c.status === "ended" || c.status === "rejected") };
        const totals = { live: list.filter((c) => c.status === "active").length, clicks: list.reduce((n, c) => n + c.clicks, 0), spent: list.reduce((n, c) => n + c.spentCents, 0) };
        const pastCats = [...new Set(groups.past.map((c) => c.category))];
        const pastFiltered = groups.past.filter((c) => category === "all" || c.category === category);

        let body = "";
        if (tab === "live") body = groups.live.length ? `<div class="mt-4">${groups.live.map(adRow).join("")}</div>` : `<p class="caption center-text mt-10" style="font-size:15px">No running ads. Create one, or re-enable a past ad.</p>`;
        if (tab === "drafts") body = groups.drafts.length ? `<div class="mt-4">${groups.drafts.map(adRow).join("")}</div>` : `<p class="caption center-text mt-10" style="font-size:15px">No drafts.</p>`;
        if (tab === "past") {
          body = `${
            pastCats.length > 1
              ? `<div class="chips scroll" style="padding:16px 0">
                  <button type="button" class="chip${category === "all" ? " on" : ""}" data-action="cat" data-cat="all">All categories</button>
                  ${pastCats.map((c) => `<button type="button" class="chip${category === c ? " on" : ""}" data-action="cat" data-cat="${c}">${icon(CAT_ICON[c])}${esc(CAT_LABEL[c])}</button>`).join("")}
                </div>`
              : ""
          }
          ${!pastFiltered.length ? `<p class="caption center-text mt-10" style="font-size:15px">Ads that finish, are stopped, or are rejected show up here.</p>` : ""}
          ${PAST_GROUPS.map((g) => {
            const items = pastFiltered.filter(g.match);
            return items.length ? `<div><h3 class="group-title">${g.label} · ${items.length}</h3>${items.map(adRow).join("")}</div>` : "";
          }).join("")}`;
        }

        return `<div class="screen-header">
          <button type="button" class="circle-btn" data-action="back" aria-label="Back">${icon("chevron-back")}</button>
          <div class="title-text"><div>Ads Manager</div><div class="caption" style="font-weight:400">${esc(account.companyName)}</div></div>
          <a class="circle-btn" href="#/advertiser/account" aria-label="Account">${icon("person-outline")}</a>
        </div>
        <div class="page"><div class="medium">
          <div class="stats">${stat("Live ads", String(totals.live))}${stat("Clicks", totals.clicks.toLocaleString())}${stat("Spent", TM.formatCents(totals.spent))}</div>
          <div class="banner info">${icon("flask-outline")}<span class="grow">Test mode: billing isn't configured, so ads launch without charging a card.</span></div>
          <div style="margin:20px 0">${ui.button("Create an ad", { icon: "add", href: "#/advertiser/ads/new" })}</div>
          ${ui.segmented("tab", tab, [
            { value: "live", label: `Live (${groups.live.length})` },
            { value: "drafts", label: `Drafts (${groups.drafts.length})` },
            { value: "past", label: `Past (${groups.past.length})` },
          ])}
          ${body}
          <div class="flex mt-8" style="justify-content:center"><a class="link" href="#/advertiser/billing">Billing</a><span class="muted">·</span><a class="link" href="#/advertiser/account">Account</a></div>
          ${footer}
        </div></div>`;
      },
      onSegment(name, value, view) {
        tab = value;
        TM.storage.set("advertiser.tab", value);
        view.refresh({ keepScroll: true });
      },
      actions: {
        cat(el, root, view) {
          category = el.dataset.cat;
          view.refresh({ keepScroll: true });
        },
      },
    };
  });

  // --- Ad editor: app/src/advertiser/AdEditor.tsx -----------------------------------------------------

  function adEditor(ad, { submitLabel, note, issues = {} }) {
    const f = (name, label, extra = {}) => ui.field({ name, label, value: ad[name] ?? "", error: issues[name], ...extra });
    return `<form data-submit="save-ad" data-input="ad-preview" novalidate>
      <h2 class="section-heading" style="margin-top:0">Preview</h2>
      <div id="ad-preview">${ui.sponsoredCard(toPlacement(ad), { preview: true })}</div>

      <h2 class="section-heading">Creative</h2>
      ${f("headline", `Headline`, { placeholder: "Skip the lines at the Colosseum", attrs: 'maxlength="80"', hint: "Up to 80 characters." })}
      ${f("body", "Description", { multiline: true, placeholder: "One or two sentences on why travellers should click.", attrs: 'maxlength="200"', hint: "Up to 200 characters." })}
      ${f("ctaLabel", "Button label", { attrs: 'maxlength="30"' })}
      ${f("url", "Landing page URL", { type: "url", hint: "Must start with https://. Add your own tracking parameters.", attrs: 'autocapitalize="off" autocorrect="off"' })}
      ${f("imageUrl", "Image URL (optional)", { type: "url", hint: "A square image of at least 400×400 works best.", attrs: 'autocapitalize="off" autocorrect="off"' })}

      <h2 class="section-heading">Category</h2>
      <div class="chips">${Object.keys(CAT_LABEL)
        .map((c) => `<label class="chip pick"><input type="radio" name="category" value="${c}" ${ad.category === c ? "checked" : ""} />${icon(CAT_ICON[c])}${esc(CAT_LABEL[c])}</label>`)
        .join("")}</div>

      <h2 class="section-heading">Targeting</h2>
      ${ui.field({ name: "destinations", label: "Destinations", value: (ad.destinations || []).map(TM.titleCase).join(", "), placeholder: "Rome, Florence, Venice", hint: "Comma-separated cities. Leave empty to show in every destination." })}
      <div class="label">Interests (optional)</div>
      <div class="chips">${D.AD_INTERESTS.map((i) => `<label class="chip pick"><input type="checkbox" name="interest" value="${i}" ${ad.interests.includes(i) ? "checked" : ""} />${esc(i)}</label>`).join("")}</div>
      <p class="caption mt-2">With interests selected, your ad only shows to searches that mention at least one of them.</p>

      <h2 class="section-heading">Schedule</h2>
      <div class="field-row">
        ${f("startDate", "Start date (optional)", { type: "date", error: issues.startDate })}
        ${f("endDate", "End date (optional)", { type: "date", error: issues.endDate })}
      </div>
      ${note ? `<div class="card alt mb-4"><p class="caption" style="margin:0">${esc(note)}</p></div>` : ""}
      ${ui.button(submitLabel, { type: "submit", variant: "dark" })}
    </form>`;
  }

  /** Read the editor form into CampaignContent. */
  function readEditor(form) {
    const get = (n) => form.elements[n]?.value?.trim() ?? "";
    return {
      headline: get("headline"),
      body: get("body"),
      ctaLabel: get("ctaLabel"),
      url: get("url"),
      imageUrl: get("imageUrl") || null,
      category: form.querySelector("input[name=category]:checked")?.value ?? "attractions",
      destinations: get("destinations").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean),
      interests: [...form.querySelectorAll("input[name=interest]:checked")].map((i) => i.value),
      startDate: get("startDate") || null,
      endDate: get("endDate") || null,
    };
  }

  function validateAd(ad) {
    const issues = {};
    if (ad.headline.length < 5) issues.headline = "Write a headline (at least 5 characters).";
    if (!TM.isHttps(ad.url)) issues.url = "Enter a full https:// URL.";
    if (ad.imageUrl && !TM.isHttps(ad.imageUrl)) issues.imageUrl = "Image URLs must start with https://.";
    if (!ad.ctaLabel) issues.ctaLabel = "Add a button label.";
    if (ad.startDate && ad.endDate && ad.endDate < ad.startDate) issues.endDate = "End date must be after the start date.";
    return issues;
  }

  let previewTimer;
  const editorActions = {
    "ad-preview"(formEl, root) {
      const ad = readEditor(formEl);
      const box = root.querySelector("#ad-preview");
      box.querySelector('[data-preview="headline"]').textContent = ad.headline || "Your headline";
      box.querySelector('[data-preview="body"]').textContent = ad.body;
      box.querySelector('[data-preview="cta"]').textContent = ad.ctaLabel || "Learn more";
      // Only swap the image once typing pauses and the URL looks complete.
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        const current = box.querySelector("[data-preview-img]");
        const want = ad.imageUrl && /^https:\/\/[^\s/]+\.[^\s/]+\/\S+$/.test(ad.imageUrl) ? ad.imageUrl : null;
        if ((current.tagName === "IMG" ? current.getAttribute("src") : null) === want) return;
        const tmp = document.createElement("div");
        tmp.innerHTML = want ? `<img class="sponsored-img" src="${esc(want)}" alt="" data-preview-img />` : `<div class="sponsored-img" data-preview-img>${icon("megaphone-outline")}</div>`;
        current.replaceWith(tmp.firstChild);
      }, 600);
    },
  };

  TM.route(/^\/advertiser\/ads\/new$/, () => {
    let ad = { ...EMPTY_AD };
    let issues = {};
    return {
      title: "Create an ad · Ads Manager",
      render() {
        const account = requireAccount();
        if (!account) return "";
        return `${ui.screenHeader("Create an ad", { fallback: "/advertiser" })}
        <div class="page"><div class="medium">${adEditor({ ...ad, advertiser: account.companyName }, { submitLabel: "Save draft & continue", issues, note: "Next you'll set a budget and launch. Every new ad is reviewed before it runs, usually within one business day." })}</div></div>`;
      },
      actions: {
        ...editorActions,
        "save-ad"(formEl, root, view) {
          ad = readEditor(formEl);
          issues = validateAd(ad);
          if (Object.keys(issues).length) {
            view.refresh({ keepScroll: true });
            root.querySelector(".field.invalid input, .field.invalid textarea")?.focus();
            return;
          }
          const c = A.create(ad);
          TM.go(`/advertiser/ads/${c.id}`, null, { replace: true });
        },
      },
    };
  });

  TM.route(/^\/advertiser\/ads\/(c_[\w]+)\/edit$/, (ctx) => {
    const id = ctx.match[0];
    let draft = null;
    let issues = {};
    return {
      title: "Edit ad · Ads Manager",
      render() {
        const account = requireAccount();
        if (!account) return "";
        const c = A.get(id);
        if (!c) return `${ui.screenHeader("Edit ad", { fallback: "/advertiser" })}<div class="empty"><h2 class="heading">Ad not found</h2></div>`;
        const live = c.status === "active" || c.status === "paused";
        return `${ui.screenHeader("Edit ad", { fallback: `/advertiser/ads/${id}` })}
        <div class="page"><div class="medium">${adEditor({ ...c, ...(draft || {}) }, {
          submitLabel: "Save changes",
          issues,
          note: live ? "Changing the headline, description, image, link or category sends a live ad back to review. Targeting and schedule changes apply right away." : null,
        })}</div></div>`;
      },
      actions: {
        ...editorActions,
        "save-ad"(formEl, root, view) {
          draft = readEditor(formEl);
          issues = validateAd(draft);
          if (Object.keys(issues).length) return view.refresh({ keepScroll: true });
          const c = A.edit(id, draft);
          TM.toast(c.status === "in_review" ? "Saved. Sent back for review." : "Saved");
          TM.go(`/advertiser/ads/${id}`, null, { replace: true });
        },
      },
    };
  });

  // --- Ad detail: app/src/app/advertiser/ads/[id]/index.tsx ------------------------------------------------

  TM.route(/^\/advertiser\/ads\/(c_[\w]+)$/, (ctx) => {
    const id = ctx.match[0];
    let notice = null;
    let error = null;
    let armed = null;
    let budgetInput = "";
    return {
      title: "Ad details · Ads Manager",
      render() {
        const account = requireAccount();
        if (!account) return "";
        const c = A.get(id);
        if (!c) return `${ui.screenHeader("Ad", { fallback: "/advertiser" })}<div class="empty"><h2 class="heading">Ad not found</h2><p class="caption">It may have been deleted.</p></div>`;
        document.title = `${c.headline || "Ad"} · Ads Manager`;
        const remaining = c.budgetCents - c.spentCents;
        const canLaunch = c.status === "draft" || c.status === "rejected" || c.status === "ended";
        const canEdit = c.status !== "in_review";
        const pct = c.budgetCents ? Math.min(100, (c.spentCents / c.budgetCents) * 100) : 0;
        const line = (ic, label, value) => `<div class="detail-line">${icon(ic)}<div class="grow"><div class="caption">${esc(label)}</div><div class="body">${esc(value)}</div></div></div>`;
        const verb = c.status === "ended" ? "Re-enable" : c.status === "rejected" ? "Resubmit" : "Launch";
        const reuse = c.approvedContentHash && contentHash(c) === c.approvedContentHash;
        const defaultBudget = budgetInput || (remaining > 0 ? "" : "50");

        return `${ui.screenHeader("Ad details", { fallback: "/advertiser" })}
        <div class="page"><div class="medium">
          <div class="flex">${statusPill(c)}<span class="caption">${esc(CAT_LABEL[c.category])} · ${esc(c.id)}</span></div>
          <h1 class="title mt-2 mb-5">${esc(c.headline || "Untitled ad")}</h1>
          ${ui.sponsoredCard(toPlacement(c), { preview: true })}

          ${
            c.status === "rejected"
              ? `<div class="card mt-4" style="background:var(--brand-tint);border:0"><div class="flex">${icon("close-circle", "")}<span class="strong">Not approved</span></div>
                 <p class="body" style="margin:4px 0 0">${esc(c.rejectionReason)}</p><p class="caption mt-2">Unspent budget was refunded to your card. Edit the ad and resubmit.</p></div>`
              : ""
          }
          ${c.status === "in_review" ? `<div class="card mt-4" style="background:var(--warn-bg);border:0"><p class="body" style="margin:0">We're reviewing this ad, usually within one business day. It goes live automatically once approved.</p></div>` : ""}

          ${notice ? `<p class="notice">${esc(notice)}</p>` : ""}
          ${error ? `<p class="form-error mt-3">${esc(error)}</p>` : ""}

          ${
            c.status !== "draft"
              ? `<h2 class="section-heading">Performance</h2>
                 <div class="stats">${stat("Impressions", c.impressions.toLocaleString())}${stat("Clicks", c.clicks.toLocaleString())}${stat("CTR", ctr(c))}</div>
                 <div><div class="between"><span class="strong">${TM.formatCents(c.spentCents)} spent of ${TM.formatCents(c.budgetCents)}</span><span class="caption">${TM.formatCents(Math.max(0, remaining))} left</span></div>
                 <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>`
              : ""
          }

          <h2 class="section-heading">Targeting & schedule</h2>
          ${line("location-outline", "Destinations", c.destinations.length ? c.destinations.map(TM.titleCase).join(", ") : "All destinations")}
          ${line("pricetags-outline", "Interests", c.interests.length ? c.interests.join(", ") : "Any")}
          ${line("calendar-outline", "Runs", `${c.startDate ?? "On approval"} → ${c.endDate ?? "Until budget is spent"}`)}
          ${line("link-outline", "Landing page", c.url)}

          ${
            canLaunch
              ? `<div class="card mt-6">
                  <h2 class="heading">${verb} this ad</h2>
                  <p class="caption mt-1 mb-4">${
                    reuse ? "This exact creative was approved before, so it goes live right away." : "New and changed ads are reviewed before they run, usually within one business day."
                  } You pay ${TM.formatCents(CFG.cpcCents)} per click, from a prepaid budget.</p>
                  ${remaining > 0 ? `<p class="body mb-3">${TM.formatCents(remaining)} of unspent budget carries over.</p>` : ""}
                  <form data-submit="launch" novalidate>
                    ${ui.field({ name: "budget", label: remaining > 0 ? "Add budget (USD)" : "Budget (USD)", type: "number", value: defaultBudget, attrs: 'min="0" step="1" inputmode="decimal"', hint: `Minimum ${TM.formatCents(CFG.minBudgetCents)} in total.` })}
                    ${ui.field({ name: "endDate", label: "End date (optional)", type: "date", value: c.endDate ?? "" })}
                    <div class="between card alt mb-4" style="padding:12px 16px">${icon("flask-outline")}<span class="body grow">Test mode, no charge</span></div>
                    <p class="caption mb-4">By continuing you agree to the <a class="link" href="#/legal/advertiser" style="font-size:13px">Advertiser Terms</a>. Unspent budget is refunded if the ad is rejected or ended early.</p>
                    ${ui.button(verb, { type: "submit" })}
                  </form>
                </div>`
              : ""
          }

          <h2 class="section-heading">Manage</h2>
          <div class="btn-stack">
            ${c.status === "active" ? ui.button("Pause ad", { icon: "pause", variant: "outline", action: "pause" }) : ""}
            ${c.status === "paused" ? ui.button("Resume ad", { icon: "play", variant: "dark", action: "resume" }) : ""}
            ${canEdit ? ui.button("Edit ad", { icon: "create-outline", variant: "outline", href: `#/advertiser/ads/${c.id}/edit` }) : ""}
            ${ui.button("Duplicate", { icon: "copy-outline", variant: "outline", action: "duplicate" })}
            ${
              LIVE.has(c.status)
                ? armed === "end"
                  ? `<div class="btn-row" style="margin:0">${ui.button("End ad & refund", { action: "end" })}${ui.button("Cancel", { variant: "outline", action: "disarm" })}</div>`
                  : ui.button("End ad", { icon: "stop-circle-outline", variant: "outline", action: "arm", data: 'data-what="end"' })
                : ""
            }
            ${
              c.status === "draft"
                ? armed === "delete"
                  ? `<div class="btn-row" style="margin:0">${ui.button("Delete draft", { action: "delete" })}${ui.button("Cancel", { variant: "outline", action: "disarm" })}</div>`
                  : ui.button("Delete draft", { icon: "trash-outline", variant: "outline", action: "arm", data: 'data-what="delete"' })
                : ""
            }
          </div>

          ${
            c.status === "in_review"
              ? `<div class="demo-tools"><div class="label">${icon("construct-outline")}Preview only: play the reviewer</div>
                  <div class="btn-row" style="margin-top:8px">${ui.button("Approve", { variant: "dark", action: "approve", block: true })}${ui.button("Reject", { variant: "outline", action: "reject", block: true })}</div></div>`
              : ""
          }
          ${
            c.status === "active"
              ? `<div class="demo-tools"><div class="label">${icon("construct-outline")}Preview only</div>
                  <p class="caption" style="margin:4px 0 0">Live ads appear as sponsored results in matching searches${c.destinations.length ? ` for ${esc(c.destinations.map(TM.titleCase).join(", "))}` : ""}. Clicks there deduct ${TM.formatCents(CFG.cpcCents)} from the budget.</p>
                  <div class="mt-3">${ui.button("Try a matching search", { variant: "outline", icon: "search", href: TM.href("/results", { q: `Tours in ${TM.titleCase(c.destinations[0] || "Rome")}${c.interests[0] ? ` for ${c.interests[0]}` : ""}` }) })}</div></div>`
              : ""
          }
          <div class="page-footer"><a class="link" href="${href("/support/advertiser", { reference: c.id })}">Get help with this ad</a></div>
        </div></div>`;
      },
      actions: {
        launch(formEl, root, view) {
          const c = A.get(id);
          const { budget, endDate } = TM.formData(formEl);
          budgetInput = budget;
          const addCents = Math.round(Number(budget || 0) * 100);
          const remaining = c.budgetCents - c.spentCents;
          error = null;
          if (!Number.isFinite(addCents) || addCents < 0) error = "Enter a budget in dollars.";
          else if (remaining + addCents < CFG.minBudgetCents) error = `The total budget must be at least ${TM.formatCents(CFG.minBudgetCents)}.`;
          else if (endDate && endDate < today()) error = "The end date is in the past.";
          if (error) return view.refresh({ keepScroll: true });
          const updated = A.launch(id, addCents, endDate);
          budgetInput = "";
          notice = updated.status === "active" ? "Your ad is live." : "Submitted for review. It goes live automatically once approved.";
          view.refresh({ keepScroll: true });
        },
        pause(el, root, view) {
          A.pause(id);
          notice = "Paused. Resume any time.";
          view.refresh({ keepScroll: true });
        },
        resume(el, root, view) {
          A.resume(id);
          notice = "Your ad is live again.";
          view.refresh({ keepScroll: true });
        },
        duplicate() {
          const copy = A.duplicate(id);
          TM.toast("Duplicated as a draft");
          TM.go(`/advertiser/ads/${copy.id}/edit`);
        },
        arm(el, root, view) {
          armed = el.dataset.what;
          view.refresh({ keepScroll: true });
        },
        disarm(el, root, view) {
          armed = null;
          view.refresh({ keepScroll: true });
        },
        end(el, root, view) {
          A.end(id);
          armed = null;
          notice = "Ad ended. Unspent budget was refunded.";
          view.refresh({ keepScroll: true });
        },
        delete() {
          A.remove(id);
          TM.toast("Draft deleted");
          TM.go("/advertiser", null, { replace: true });
        },
        approve(el, root, view) {
          A.approve(id);
          notice = "Approved. Your ad is live.";
          view.refresh({ keepScroll: true });
        },
        reject(el, root, view) {
          A.reject(id, "Landing page didn't match the ad. Make sure the offer in your headline is on the page you link to.");
          notice = null;
          view.refresh({ keepScroll: true });
        },
      },
    };
  });

  // --- Billing: app/src/app/advertiser/billing.tsx ---------------------------------------------------------

  const CHARGE_STATUS = { succeeded: "Paid", refunded: "Refunded", partially_refunded: "Partly refunded", not_billed: "Test (not billed)" };

  TM.route(/^\/advertiser\/billing$/, () => ({
    title: "Billing · Ads Manager",
    render() {
      const account = requireAccount();
      if (!account) return "";
      const charges = A.charges();
      const byId = Object.fromEntries(A.campaigns().map((c) => [c.id, c]));
      return `${ui.screenHeader("Billing", { fallback: "/advertiser" })}
      <div class="page"><div class="medium">
        <h1 class="display">Billing</h1>
        <h2 class="section-heading">Payment method</h2>
        <div class="card" style="background:var(--info-bg);border:0"><p class="body" style="margin:0;color:var(--info-fg)">Billing isn't configured in this preview, so ads launch without charging. With Stripe keys on the server, you add a card here using Stripe Elements: card numbers never touch TourMatch.</p></div>
        <div class="card mt-4 between" style="opacity:0.6"><span class="icon-box">${icon("card-outline")}</span><span class="grow body">Add a card</span>${icon("lock-closed-outline", "muted")}</div>

        <h2 class="section-heading">Charges & refunds</h2>
        ${
          charges.length
            ? `<div class="card flush">${charges
                .map((ch) => {
                  const c = byId[ch.campaignId];
                  const net = ch.amountCents - ch.refundedCents;
                  const label = ch.refundedCents ? (net ? "Partly refunded" : "Refunded") : CHARGE_STATUS[ch.status];
                  return `<div class="row between">
                    <div class="grow">
                      <div class="strong ellipsis">${c ? `<a href="#/advertiser/ads/${c.id}" style="text-decoration:none">${esc(ch.description)}</a>` : esc(ch.description)}</div>
                      <div class="caption">${TM.formatDate(ch.createdAt)} · ${esc(label)}${ch.refundedCents ? ` · ${TM.formatCents(ch.refundedCents)} refunded` : ""}</div>
                    </div>
                    <div class="strong">${TM.formatCents(ch.amountCents)}</div>
                  </div>`;
                })
                .join("")}</div>`
            : `<p class="caption">No charges yet. Budgets you set when launching ads show up here.</p>`
        }
        ${footer}
      </div></div>`;
    },
  }));

  // --- Account: app/src/app/advertiser/account.tsx --------------------------------------------------------

  TM.route(/^\/advertiser\/account$/, () => {
    let issues = {};
    let armed = false;
    return {
      title: "Account · Ads Manager",
      render() {
        const a = requireAccount();
        if (!a) return "";
        return `${ui.screenHeader("Account", { fallback: "/advertiser" })}
        <div class="page"><div class="narrow">
          <h1 class="display">Account</h1>
          <p class="caption mt-2">${esc(a.email)} · Advertiser Terms v${esc(a.termsVersion)} accepted ${TM.formatDate(a.termsAcceptedAt)}</p>
          <h2 class="section-heading">Business details</h2>
          <form data-submit="save" novalidate>
            ${ui.field({ name: "companyName", label: "Business name", value: a.companyName, error: issues.companyName })}
            ${ui.field({ name: "contactName", label: "Contact name", value: a.contactName, error: issues.contactName })}
            ${ui.field({ name: "website", label: "Website (optional)", type: "url", value: a.website ?? "", error: issues.website })}
            ${ui.button("Save details", { type: "submit", variant: "dark" })}
          </form>
          <h2 class="section-heading">Password</h2>
          <p class="caption">Changing your password signs out your other sessions. (Not available in the preview.)</p>
          <h2 class="section-heading">Session</h2>
          <div class="btn-stack">
            ${ui.button("Sign out", { variant: "outline", icon: "log-out-outline", action: "signout" })}
            ${
              armed
                ? `<div class="btn-row" style="margin:0">${ui.button("Delete everything", { action: "wipe" })}${ui.button("Cancel", { variant: "outline", action: "disarm" })}</div>`
                : ui.button("Delete preview account", { variant: "outline", icon: "trash-outline", action: "arm" })
            }
          </div>
          ${footer}
        </div></div>`;
      },
      actions: {
        save(formEl, root, view) {
          const data = TM.formData(formEl);
          issues = TM.check(data, { companyName: TM.rules.required("your business name"), contactName: TM.rules.required("a contact name"), website: TM.rules.optionalUrl });
          if (!Object.keys(issues).length) {
            const a = A.account();
            S.set("advertiser.account", { ...a, companyName: data.companyName.trim(), contactName: data.contactName.trim(), website: data.website.trim() || null });
            A.saveAll(A.campaigns().map((c) => ({ ...c, advertiser: data.companyName.trim() })));
            TM.toast("Details saved");
          }
          view.refresh({ keepScroll: true });
        },
        signout() {
          A.signOut();
          TM.go("/advertise", null, { replace: true });
        },
        arm(el, root, view) {
          armed = true;
          view.refresh({ keepScroll: true });
        },
        disarm(el, root, view) {
          armed = false;
          view.refresh({ keepScroll: true });
        },
        wipe() {
          A.deleteAll();
          TM.toast("Preview account deleted");
          TM.go("/advertise", null, { replace: true });
        },
      },
    };
  });

  TM.advertiser.signedInAccount = () => (A.signedIn() ? A.account() : null);
})();
