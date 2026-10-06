// Business-facing pages: Advertise landing, Partner toolkit + console, Legal, Support.
(function () {
  "use strict";

  const TM = window.TM;
  const D = window.TM_DATA;
  const { TERMS, AUDIENCE_LABEL, LEGAL_REVIEWED } = window.TM_TERMS;
  const { esc, icon, ui, href } = TM;

  const pageFooter = (audience, supportLabel, termsLabel) => `<div class="page-footer">
    <a class="link" href="#/legal/${audience}">${termsLabel}</a>
    <a class="link" href="#/support/${audience}">${supportLabel}</a>
  </div>`;

  /** Simple required-field checks; returns {field: message}. */
  function check(values, rules) {
    const issues = {};
    for (const [k, rule] of Object.entries(rules)) {
      const msg = rule(values[k] ?? "", values);
      if (msg) issues[k] = msg;
    }
    return issues;
  }
  TM.check = check;
  TM.rules = {
    required: (label) => (v) => (String(v).trim().length < 2 ? `Enter ${label}.` : null),
    email: (v) => (TM.isEmail(v.trim()) ? null : "Enter a valid email."),
    optionalUrl: (v) => (!v.trim() || /^https?:\/\/\S+\.\S+/.test(v.trim()) ? null : "Enter a full URL, starting with https://"),
  };

  // --- Advertise landing: app/src/app/advertise.tsx -------------------------------------------

  const FORMATS = [
    { icon: "sparkles-outline", title: "Sponsored result", body: "A clearly labelled card in search results, shown when a traveller's request matches your targeting." },
    { icon: "location-outline", title: "Destination targeting", body: "Reach people planning a trip to the cities you serve, at the moment they're choosing what to do." },
    { icon: "pricetags-outline", title: "Interest targeting", body: 'Our AI understands requests like "wine and food, not too much walking". Target food, history, family, nightlife and more.' },
    { icon: "stats-chart-outline", title: "Transparent reporting", body: "Impressions and clicks per campaign. No tracking of individual travellers." },
  ];

  TM.route(/^\/advertise$/, () => {
    let form = { company: "", contactName: "", email: "", website: "", markets: "", monthlyBudget: "", message: "" };
    let issues = {};
    let sent = false;
    let sending = false;
    return {
      title: "Advertise · TourMatch",
      render() {
        const account = TM.advertiser.signedInAccount();
        const f = (name, label, extra = {}) => ui.field({ name, label, value: form[name], error: issues[name], ...extra });
        return `${ui.screenHeader("Advertise with TourMatch")}
        <div class="page"><div class="narrow">
          <div class="kicker">For brands, attractions & travel services</div>
          <h1 class="display">Be there when travellers decide what to do.</h1>
          <p class="body lede">TourMatch travellers describe their trip in their own words, so you can place your offer next to requests where it genuinely fits.</p>
          <div class="btn-row">
            ${
              account
                ? ui.button("Open Ads Manager", { icon: "stats-chart-outline", href: "#/advertiser" })
                : ui.button("Create account", { href: "#/advertiser/signup" }) + ui.button("Sign in", { variant: "outline", href: "#/advertiser/login" })
            }
          </div>
          <p class="caption mt-3">Self-serve: create ads, set a budget, pay by card and launch. Pay only for clicks.</p>

          <div class="formats">
            ${FORMATS.map(
              (x) => `<div class="format"><span class="icon-box lg tint">${icon(x.icon)}</span><div class="grow"><div class="strong">${esc(x.title)}</div><div class="caption">${esc(x.body)}</div></div></div>`,
            ).join("")}
          </div>

          <div class="card mt-4">
            <h2 class="heading">Our ad standards</h2>
            <p class="caption" style="font-size:14px;line-height:20px;margin:8px 0 0">Every placement is labelled "Sponsored" and never changes the order of organic results. We review every campaign, and we don't accept ads that make licensing or safety claims we can't verify.</p>
          </div>

          <h2 class="title mt-10 mb-1">Planning a larger campaign?</h2>
          <p class="caption mb-5" style="font-size:14px">Talk to our partnerships team about destination sponsorships and custom packages.</p>
          ${
            sent
              ? `<div class="card center">${icon("checkmark-circle", "")}<h2 class="heading mt-2">Thanks. We've got your details.</h2>
                 <p class="caption" style="font-size:14px">Our partnerships team will email ${esc(form.email)}.</p>
                 <p class="caption mt-2">(Preview: nothing was sent.)</p></div>`
              : `<form data-submit="inquiry" novalidate>
                  ${f("company", "Company", { attrs: 'autocomplete="organization"' })}
                  ${f("contactName", "Your name", { attrs: 'autocomplete="name"' })}
                  ${f("email", "Work email", { type: "email", attrs: 'autocomplete="email"' })}
                  ${f("website", "Website (optional)", { type: "url" })}
                  ${f("markets", "Cities or regions to target", { placeholder: "e.g. Rome, Florence, Amalfi Coast" })}
                  ${f("monthlyBudget", "Monthly budget (optional)", { placeholder: "e.g. $2,000" })}
                  ${f("message", "Anything else? (optional)", { multiline: true })}
                  ${ui.button("Send inquiry", { type: "submit", busy: sending })}
                </form>`
          }
          ${pageFooter("advertiser", "Advertiser support", "Advertiser Terms")}
        </div></div>`;
      },
      actions: {
        async inquiry(formEl, root, view) {
          form = TM.formData(formEl);
          issues = check(form, { company: TM.rules.required("your company"), contactName: TM.rules.required("your name"), email: TM.rules.email, website: TM.rules.optionalUrl });
          if (Object.keys(issues).length) return view.refresh();
          sending = true;
          view.refresh();
          await TM.delay(600);
          sending = false;
          sent = true;
          view.refresh();
        },
      },
    };
  });

  // --- Partner toolkit: app/src/app/partners/index.tsx ------------------------------------------------

  const STEPS = [
    { title: "A traveller asks", body: '"Private Vatican tour, licensed guide, 4 of us, one uses a wheelchair."' },
    { title: "We send you a structured request", body: "Destination, dates, group size, budget, style, languages and accessibility, signed with your secret." },
    { title: "You reply with matching tours", body: "Query your own inventory or booking API and return tours in our JSON format." },
    { title: "We rank and send them to you", body: "Your tours are ranked alongside other sources. Bookings happen on your site via your bookingUrl." },
  ];

  const openSpec = () => {
    const { tourFields, ...spec } = D.PARTNER_SPEC;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  };

  TM.route(/^\/partners$/, () => {
    let lang = "node";
    const spec = D.PARTNER_SPEC;
    return {
      title: "Partner toolkit · TourMatch",
      render() {
        const sample = { node: ["server.js", D.NODE_SAMPLE], python: ["app.py", D.PYTHON_SAMPLE], curl: ["test.sh", D.CURL_SAMPLE] }[lang];
        return `${ui.screenHeader("Partner toolkit")}
        <div class="page"><div class="wide">
          <div class="kicker">For tour companies & guides</div>
          <h1 class="display">Plug your tours into TourMatch.</h1>
          <p class="body lede">Build one small endpoint and your inventory appears in AI-matched search results. Travellers book directly with you, so you keep the customer and the booking.</p>
          <div class="btn-row">
            ${ui.button("Get credentials", { icon: "key-outline", href: "#/partners/console" })}
            ${ui.button("View spec", { variant: "outline", icon: "document-text-outline", action: "spec" })}
          </div>

          <h2 class="section-title">How it works</h2>
          ${STEPS.map((s, i) => `<div class="step"><span class="step-num">${i + 1}</span><div class="grow"><div class="strong">${esc(s.title)}</div><div class="caption">${esc(s.body)}</div></div></div>`).join("")}

          <h2 class="section-title">1. What you receive</h2>
          <p class="para">A <span class="code-inline">POST</span> to your HTTPS endpoint with these headers. Respond within ${spec.transport.timeoutMs / 1000}s. We skip slow endpoints for that search rather than make travellers wait.</p>
          <div class="card flush mb-4">
            ${Object.entries(spec.headers).map(([name, desc]) => `<div class="row"><span class="code-inline">${esc(name)}</span><div class="caption mt-1">${esc(desc)}</div></div>`).join("")}
          </div>
          ${ui.codeBlock("Request body", JSON.stringify(spec.requestExample, null, 2))}

          <h2 class="section-title">2. What you return</h2>
          <p class="para"><span class="code-inline">{ tours: [...] }</span> with up to ${spec.transport.maxTours} tours. An empty list is fine when nothing fits.</p>
          <div class="card flush mb-4">
            ${spec.tourFields
              .map(
                (p) => `<div class="row"><div class="field-head"><span class="code-inline">${esc(p.name)}</span><span class="caption">${esc(p.type)}</span>${p.required ? '<span class="req">required</span>' : ""}</div>
                ${p.description ? `<div class="caption mt-1">${esc(p.description)}</div>` : ""}</div>`,
              )
              .join("")}
          </div>
          ${ui.codeBlock("Response body", JSON.stringify(spec.responseExample, null, 2))}

          <h2 class="section-title">3. Verify the signature</h2>
          <p class="para">Every request is signed with HMAC-SHA256 over <span class="code-inline">timestamp.rawBody</span> using your secret. Reject anything unsigned or older than 5 minutes.</p>
          ${ui.segmented("lang", lang, [
            { value: "node", label: "Node.js" },
            { value: "python", label: "Python" },
            { value: "curl", label: "curl" },
          ])}
          <div class="mt-3">${ui.codeBlock(sample[0], sample[1])}</div>

          <h2 class="section-title">Partner rules</h2>
          ${spec.rules.map((r) => `<div class="rule">${icon("checkmark-circle-outline")}<span class="body grow">${esc(r)}</span></div>`).join("")}

          <div class="card alt mt-8">
            <h2 class="heading">Machine-readable spec</h2>
            <p class="caption" style="font-size:14px;margin:4px 0 16px">Request and response format (protocol version ${esc(spec.version)}). Generate types or validate in CI.</p>
            ${ui.button("Open spec JSON", { variant: "outline", icon: "document-text-outline", action: "spec" })}
          </div>

          <div class="mt-8">${ui.button("Register your endpoint", { href: "#/partners/console" })}</div>
          ${pageFooter("partner", "Partner support", "Partner Terms")}
        </div></div>`;
      },
      onSegment(name, value, view) {
        lang = value;
        view.refresh({ keepScroll: true });
      },
      actions: { spec: openSpec },
    };
  });

  // --- Partner console: app/src/app/partners/console.tsx ----------------------------------------------
  // The real console talks to the server and sends signed requests to the partner's endpoint.
  // Here registration is stored locally and test requests are simulated.

  const partnerStore = {
    get: () => TM.storage.get("partner", null),
    set: (p) => TM.storage.set("partner", p),
  };
  let partnerSession = null; // { id } once signed in for this page view

  function simulateTest(endpointUrl) {
    const latencyMs = 140 + Math.floor(Math.random() * 380);
    const broken = /fail|error|broken/i.test(endpointUrl);
    if (broken) {
      return {
        at: new Date().toISOString(),
        ok: false,
        httpStatus: 200,
        latencyMs,
        tourCount: 0,
        errors: ["tours.0.bookingUrl: must be an https:// URL", "tours.0.currency: expected a 3-letter ISO 4217 code"],
        tours: [],
      };
    }
    const tours = [
      D.PARTNER_SPEC.responseExample.tours[0],
      { id: "rome-food-evening-014", title: "Testaccio food market evening, small group", priceFrom: 79, currency: "EUR", isPrivate: false, durationMinutes: 180, city: "Rome", licensedGuide: null, bookingUrl: "https://example-tours.com/t/rome-food-evening-014" },
    ];
    return { at: new Date().toISOString(), ok: true, httpStatus: 200, latencyMs, tourCount: tours.length, errors: [], tours };
  }

  TM.route(/^\/partners\/console$/, () => {
    let mode = "register";
    let issues = {};
    let error = null;
    let busy = false;
    let freshSecret = null;
    let lastTest = null;
    let editing = false;

    const onboarding = (form = {}) => `
      <h1 class="display">Partner console</h1>
      <p class="body lede">Register your company and endpoint to get a partner ID and signing secret. Then send test requests to check your integration.</p>
      <div class="mt-6 mb-6">${ui.segmented("mode", mode, [
        { value: "register", label: "Register" },
        { value: "signin", label: "I have credentials" },
      ])}</div>
      ${
        mode === "register"
          ? `<form data-submit="register" novalidate>
              ${ui.field({ name: "companyName", label: "Company name", value: form.companyName, error: issues.companyName, attrs: 'autocomplete="organization"' })}
              ${ui.field({ name: "contactEmail", label: "Contact email", type: "email", value: form.contactEmail, error: issues.contactEmail })}
              ${ui.field({ name: "website", label: "Website (optional)", type: "url", value: form.website, error: issues.website })}
              ${ui.field({ name: "endpointUrl", label: "Endpoint URL", type: "url", value: form.endpointUrl, error: issues.endpointUrl, placeholder: "https://yourdomain.com/tourmatch/search", hint: "Must be https:// on the public internet. You can change it later." })}
              ${ui.termsCheck("partner", "Partner Terms", form.acceptTerms, issues.acceptTerms)}
              ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
              ${ui.button("Register & get credentials", { type: "submit", busy })}
            </form>`
          : `<form data-submit="signin" novalidate>
              ${ui.field({ name: "partnerId", label: "Partner ID", value: form.partnerId, error: issues.partnerId, placeholder: "p_…" })}
              ${ui.field({ name: "secret", label: "Secret", type: "password", value: "", error: issues.secret, placeholder: "tmsk_…" })}
              ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
              ${ui.button("Sign in", { type: "submit", busy, variant: "dark" })}
            </form>`
      }
      <p class="caption mt-4">Credentials are kept for this browser tab only. The secret is a signing key: store it like a password.</p>`;

    const dashboard = (p) => {
      const statusCls = { pending: "pill-warn", approved: "pill-ok", suspended: "pill-bad" }[p.status];
      const t = lastTest || p.lastTest;
      return `
        <div class="between"><h1 class="display">${esc(p.companyName)}</h1><span class="status-pill ${statusCls}">${esc(TM.titleCase(p.status))}</span></div>
        <p class="caption mt-2">Partner ID <span class="code-inline">${esc(p.id)}</span> · ${esc(p.contactEmail)}</p>

        ${
          freshSecret
            ? `<div class="card mt-6" style="border-color:var(--warn-fg);background:var(--warn-bg)">
                <div class="strong">Save your secret now</div>
                <p class="caption" style="color:var(--warn-fg)">We only show it once. You'll need it to verify our signatures and to sign in here.</p>
                <div class="label mt-3">Partner ID</div><div class="secret">${esc(p.id)}</div>
                <div class="label">Secret</div><div class="secret">${esc(freshSecret)}</div>
                <div class="flex"><button type="button" class="copy-btn" data-action="copy" data-text="${esc(freshSecret)}">${icon("copy-outline")}Copy secret</button>
                <button type="button" class="copy-btn" data-action="dismiss-secret">${icon("checkmark")}I've saved it</button></div>
              </div>`
            : ""
        }

        ${
          p.status === "pending"
            ? `<div class="banner warn mt-6">${icon("time-outline")}<span class="grow">Pending review. Your tours aren't shown to travellers until we approve your account. Pass a test request to speed that up.</span></div>`
            : ""
        }

        <h2 class="section-heading">Endpoint</h2>
        ${
          editing
            ? `<form data-submit="save-endpoint" novalidate>
                ${ui.field({ name: "endpointUrl", label: "Endpoint URL", type: "url", value: p.endpointUrl, error: issues.endpointUrl })}
                <div class="btn-row" style="margin-top:0">${ui.button("Save", { type: "submit", variant: "dark" })}${ui.button("Cancel", { variant: "outline", action: "cancel-edit" })}</div>
              </form>`
            : `<div class="card between"><span class="code-inline grow" style="word-break:break-all">${esc(p.endpointUrl)}</span><button type="button" class="link" data-action="edit-endpoint">Change</button></div>`
        }

        <h2 class="section-heading">Test your endpoint</h2>
        <p class="para">We send a signed sample request (Rome, 4 guests, private, licensed) and validate your response against the schema.</p>
        ${ui.button(busy ? "Sending…" : "Send test request", { icon: "paper-plane-outline", action: "test", busy, variant: "dark" })}
        <p class="caption mt-2">Preview: test requests are simulated. Put "fail" in the URL to see a failing result.</p>
        ${t ? renderTest(t) : ""}

        ${ui.codeBlock("Sample request we send", JSON.stringify(D.PARTNER_SPEC.requestExample, null, 2))}

        <div class="btn-row">
          ${ui.button("Toolkit & docs", { variant: "outline", icon: "book-outline", href: "#/partners" })}
          ${ui.button("Sign out", { variant: "outline", icon: "log-out-outline", action: "signout" })}
        </div>
        ${pageFooter("partner", "Partner support", "Partner Terms")}`;
    };

    const renderTest = (t) => `<div class="card mt-4">
      <div class="between"><div class="flex">${icon(t.ok ? "checkmark-circle" : "close-circle")}<span class="strong">${t.ok ? "Passed" : "Failed"}</span></div>
      <span class="caption">HTTP ${t.httpStatus ?? "–"} · ${t.latencyMs} ms · ${t.tourCount} ${t.tourCount === 1 ? "tour" : "tours"}</span></div>
      ${t.errors.length ? `<ul class="caption" style="color:var(--brand-dark);margin:12px 0 0;padding-left:18px">${t.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${
        t.tours?.length
          ? `<div class="mt-3">${t.tours
              .map(
                (x) => `<div style="padding:8px 0;border-top:1px solid var(--hairline)"><div class="strong">${esc(x.title)}</div>
                <div class="caption">${esc([x.city, TM.formatPrice({ ...x, isFree: !!x.isFree }), TM.formatDuration(x.durationMinutes), x.licensedGuide === true ? "Licensed guide" : null].filter(Boolean).join(" · "))}</div></div>`,
              )
              .join("")}</div>`
          : ""
      }
    </div>`;

    let draft = {};
    return {
      title: "Partner console · TourMatch",
      render() {
        const p = partnerSession && partnerStore.get();
        return `${ui.screenHeader("Partner console", { fallback: "/partners" })}<div class="page"><div class="narrow">${p ? dashboard(p) : onboarding(draft)}</div></div>`;
      },
      onSegment(name, value, view) {
        mode = value;
        issues = {};
        error = null;
        view.refresh({ keepScroll: true });
      },
      actions: {
        async register(formEl, root, view) {
          draft = TM.formData(formEl);
          issues = check(draft, {
            companyName: TM.rules.required("your company name"),
            contactEmail: TM.rules.email,
            website: TM.rules.optionalUrl,
            endpointUrl: (v) => (TM.isHttps(v.trim()) && !/localhost|127\.0\.0\.1/.test(v) ? null : "Use a public https:// URL."),
            acceptTerms: (v) => (v ? null : "You need to accept the Partner Terms."),
          });
          if (Object.keys(issues).length) return view.refresh({ keepScroll: true });
          busy = true;
          view.refresh({ keepScroll: true });
          await TM.delay(500);
          const secret = `tmsk_${TM.randomId(16)}`;
          const partner = {
            id: `p_${TM.randomId(4)}`,
            companyName: draft.companyName.trim(),
            contactEmail: draft.contactEmail.trim(),
            website: draft.website.trim() || null,
            endpointUrl: draft.endpointUrl.trim(),
            status: "pending",
            createdAt: new Date().toISOString(),
            lastTest: null,
            secret, // preview only; the real server stores a hash
          };
          partnerStore.set(partner);
          partnerSession = { id: partner.id };
          freshSecret = secret;
          busy = false;
          view.refresh();
        },
        async signin(formEl, root, view) {
          draft = TM.formData(formEl);
          const p = partnerStore.get();
          busy = true;
          view.refresh({ keepScroll: true });
          await TM.delay(400);
          busy = false;
          if (!p || p.id !== draft.partnerId.trim() || p.secret !== draft.secret.trim()) {
            error = "Invalid partner ID or secret.";
            return view.refresh({ keepScroll: true });
          }
          error = null;
          partnerSession = { id: p.id };
          view.refresh();
        },
        "dismiss-secret"(el, root, view) {
          freshSecret = null;
          view.refresh({ keepScroll: true });
        },
        "edit-endpoint"(el, root, view) {
          editing = true;
          view.refresh({ keepScroll: true });
        },
        "cancel-edit"(el, root, view) {
          editing = false;
          issues = {};
          view.refresh({ keepScroll: true });
        },
        "save-endpoint"(formEl, root, view) {
          const url = TM.formData(formEl).endpointUrl.trim();
          if (!TM.isHttps(url) || /localhost|127\.0\.0\.1/.test(url)) {
            issues = { endpointUrl: "Use a public https:// URL." };
            return view.refresh({ keepScroll: true });
          }
          partnerStore.set({ ...partnerStore.get(), endpointUrl: url });
          editing = false;
          issues = {};
          lastTest = null;
          TM.toast("Endpoint updated");
          view.refresh({ keepScroll: true });
        },
        async test(el, root, view) {
          busy = true;
          view.refresh({ keepScroll: true });
          const p = partnerStore.get();
          const result = simulateTest(p.endpointUrl);
          await TM.delay(result.latencyMs + 300);
          busy = false;
          lastTest = result;
          const { tours, ...stored } = result;
          partnerStore.set({ ...p, lastTest: stored });
          view.refresh({ keepScroll: true });
        },
        signout(el, root, view) {
          partnerSession = null;
          freshSecret = null;
          lastTest = null;
          mode = "signin";
          draft = {};
          view.refresh();
        },
      },
    };
  });

  // --- Legal: app/src/app/legal/[audience].tsx ----------------------------------------------------

  TM.route(/^\/legal\/(traveler|advertiser|partner)$/, (ctx) => {
    const audience = ctx.match[0];
    return {
      title: `${TERMS[audience].title} · TourMatch`,
      render() {
        const doc = TERMS[audience];
        return `${ui.screenHeader("Terms")}
        <div class="page"><div class="narrow">
          ${ui.segmented(
            "audience",
            audience,
            Object.keys(TERMS).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] })),
          )}
          ${!LEGAL_REVIEWED ? `<div class="banner warn mt-6">${icon("alert-circle-outline")}<span class="grow">Draft pending legal review. Not yet in effect.</span></div>` : ""}
          <h1 class="display mt-6">${esc(doc.title)}</h1>
          <p class="caption mt-2">Version ${esc(doc.version)}</p>
          <div class="card alt mt-4"><p class="body" style="margin:0">${esc(doc.summary)}</p></div>
          ${doc.sections
            .map((s) => `<section class="legal-section"><h2>${esc(s.heading)}</h2>${s.body.map((p) => `<p class="body">${esc(p)}</p>`).join("")}</section>`)
            .join("")}
          <div class="page-footer"><a class="link" href="#/support/${audience}">Questions? Contact support</a></div>
        </div></div>`;
      },
      onSegment(name, value) {
        TM.go(`/legal/${value}`, null, { replace: true });
      },
    };
  });

  // --- Support: app/src/app/support/[audience].tsx ---------------------------------------------------

  const SUPPORT_COPY = {
    traveler: {
      intro: "Questions about search results, a listing, or your data. For an existing booking, contact the tour provider directly. They handle bookings and refunds.",
      referenceLabel: "Tour name or link (optional)",
      referenceHint: "Helps us find the listing you mean.",
    },
    advertiser: {
      intro: "Help with your advertiser account, billing and refunds, ad review, or campaign performance.",
      referenceLabel: "Ad ID (optional)",
      referenceHint: "Starts with c_. You'll find it on the ad's page.",
    },
    partner: {
      intro: "Help connecting your booking system, the test console, approval status, or your listings.",
      referenceLabel: "Partner ID (optional)",
      referenceHint: "Starts with p_. Never send your secret.",
    },
  };

  TM.route(/^\/support\/(traveler|advertiser|partner)$/, (ctx) => {
    const audience = ctx.match[0];
    const account = audience === "advertiser" ? TM.advertiser.signedInAccount() : null;
    let form = { name: account?.contactName ?? "", email: account?.email ?? "", topic: "", reference: ctx.params.reference ?? "", message: "" };
    let issues = {};
    let ticket = null;
    let busy = false;
    return {
      title: "Support · TourMatch",
      render() {
        const copy = SUPPORT_COPY[audience];
        const topics = D.SUPPORT_TOPICS[audience];
        return `${ui.screenHeader("Support")}
        <div class="page"><div class="narrow">
          ${ui.segmented(
            "audience",
            audience,
            Object.keys(SUPPORT_COPY).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] })),
          )}
          <h1 class="display mt-6">Contact support</h1>
          <p class="body lede">${esc(copy.intro)}</p>
          ${
            ticket
              ? `<div class="card center mt-6">${icon("checkmark-circle")}<h2 class="heading mt-2">Request received</h2>
                 <p class="body">Your reference is <strong>${esc(ticket)}</strong>.</p>
                 <p class="caption">We'll reply to ${esc(form.email)}, usually within one business day. (Preview: nothing was sent.)</p>
                 <div class="mt-5" style="max-width:240px;margin-left:auto;margin-right:auto">${ui.button("Back to TourMatch", { variant: "outline", href: "#/" })}</div></div>`
              : `<form data-submit="send" class="mt-6" novalidate>
                  <div class="label">Topic</div>
                  <div class="chips mb-4">${topics
                    .map((t) => `<button type="button" class="chip${form.topic === t ? " on" : ""}" data-action="topic" data-topic="${esc(t)}">${esc(t)}</button>`)
                    .join("")}</div>
                  ${issues.topic ? `<p class="form-error" style="font-size:12px;margin-top:-8px">${esc(issues.topic)}</p>` : ""}
                  ${ui.field({ name: "name", label: "Your name", value: form.name, error: issues.name, attrs: 'autocomplete="name"' })}
                  ${ui.field({ name: "email", label: "Email", type: "email", value: form.email, error: issues.email, attrs: 'autocomplete="email"' })}
                  ${ui.field({ name: "reference", label: copy.referenceLabel, value: form.reference, hint: copy.referenceHint })}
                  ${ui.field({ name: "message", label: "How can we help?", value: form.message, error: issues.message, multiline: true })}
                  ${ui.button("Send", { type: "submit", busy })}
                </form>`
          }
          <div class="page-footer"><a class="link" href="#/legal/${audience}">${esc(TERMS[audience].title)}</a></div>
        </div></div>`;
      },
      onSegment(name, value) {
        TM.go(`/support/${value}`, null, { replace: true });
      },
      actions: {
        topic(el, root, view) {
          form = { ...form, ...TM.formData(root.querySelector("form")), topic: el.dataset.topic };
          view.refresh({ keepScroll: true });
        },
        async send(formEl, root, view) {
          form = { ...form, ...TM.formData(formEl) };
          issues = check(form, {
            topic: (v) => (v ? null : "Choose a topic."),
            name: TM.rules.required("your name"),
            email: TM.rules.email,
            message: (v) => (v.trim().length < 10 ? "Tell us a little more (at least 10 characters)." : null),
          });
          if (Object.keys(issues).length) return view.refresh({ keepScroll: true });
          busy = true;
          view.refresh({ keepScroll: true });
          await TM.delay(500);
          ticket = `SR-${TM.randomId(3).toUpperCase()}`;
          TM.storage.set("support", [...TM.storage.get("support", []), { id: ticket, audience, ...form, createdAt: new Date().toISOString() }]);
          busy = false;
          view.refresh({ keepScroll: true });
        },
      },
    };
  });
})();
