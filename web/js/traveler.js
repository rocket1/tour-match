// Traveller screens: Explore, Search, Results, Tour detail, Saved, More.
// Each mirrors the matching file in app/src/app/.
(function () {
  "use strict";

  const TM = window.TM;
  const D = window.TM_DATA;
  const { esc, icon, ui, href } = TM;

  // --- Explore: app/src/app/(tabs)/index.tsx ----------------------------------------------

  TM.route(/^\/$/, () => ({
    title: "TourMatch",
    tab: "explore",
    navSearch: true,
    render() {
      const recent = TM.recent.list();
      return `
        <div class="explore-head">
          <div class="explore-head-inner">
            ${ui.searchPill({ title: "Where to?", subtitle: "Describe your perfect tour" })}
            <div class="categories" role="list">
              ${D.CATEGORIES.map(
                (c) => `<button type="button" class="category" role="listitem" data-action="open-search" data-draft="${esc(c.draft)}">${icon(c.icon)}${esc(c.label)}</button>`,
              ).join("")}
            </div>
          </div>
        </div>
        <div class="page">
          <div class="hero">
            <h1 class="display">Find a local guide<br />who gets you.</h1>
            <p class="caption" style="font-size:15px;margin:0">Tell us the trip in your own words. We search tour marketplaces and rank what fits.</p>
          </div>

          <h2 class="section-heading">Try asking</h2>
          <div class="ideas">
            ${D.IDEAS.map(
              (idea) => `<a class="idea" href="${href("/results", { q: idea })}">
                ${icon("sparkles-outline", "brand-icon")}<span class="grow body">${esc(idea)}</span>${icon("arrow-forward", "muted")}
              </a>`,
            ).join("")}
          </div>

          <h2 class="section-heading">Popular destinations</h2>
          <div class="hscroll">
            ${D.DESTINATIONS.map(
              (d) => `<a class="dest" href="${href("/results", { q: `Best guided tours in ${d.city}` })}" style="text-decoration:none">
                <img class="dest-img" src="${esc(d.image)}" alt="" loading="lazy" />
                <div class="strong">${esc(d.city)}</div>
              </a>`,
            ).join("")}
          </div>

          ${
            recent.length
              ? `<h2 class="section-heading">Recent searches</h2>
                 ${recent
                   .slice(0, 4)
                   .map(
                     (r) => `<a class="row-link" href="${href("/results", { q: r })}">
                       <span class="icon-box">${icon("time-outline")}</span><span class="grow body ellipsis">${esc(r)}</span>
                     </a>`,
                   )
                   .join("")}`
              : ""
          }

          <div class="footer-links">
            ${ui.businessLinks()}
            ${ui.helpLinks()}
          </div>
        </div>`;
    },
  }));

  // --- Search prompt: app/src/app/search.tsx ------------------------------------------------

  TM.route(/^\/search$/, (ctx) => {
    let text = ctx.params.draft ?? "";
    const submit = (q) => {
      const prompt = (q ?? text).trim();
      if (prompt.length < 2) return;
      TM.go("/results", { q: prompt }, { replace: true });
    };
    const syncButton = (root) => {
      root.querySelector("[data-action=submit-search]").disabled = text.trim().length < 2;
    };
    return {
      title: "Search · TourMatch",
      render() {
        const recent = TM.recent.list();
        return `<div class="search-screen">
          <div class="search-top"><button type="button" class="circle-btn" data-action="back" aria-label="Close">${icon("close")}</button></div>
          <div class="search-body">
            <div class="search-card">
              <h1 class="title"><label for="prompt">What are you looking for?</label></h1>
              <textarea id="prompt" class="search-input" maxlength="1000" data-input="text"
                placeholder="e.g. A private food tour in Lisbon for my parents, licensed guide, nothing too walk-heavy">${esc(text)}</textarea>
              <div class="chips mt-4">
                ${D.ADD_ONS.map((c) => `<button type="button" class="chip" data-action="add-chip" data-chip="${esc(c)}">${icon("add")}${esc(c)}</button>`).join("")}
              </div>
            </div>
            ${
              recent.length
                ? `<div class="mt-6">
                    <div class="between" style="padding:0 8px;margin-bottom:8px"><h2 class="heading">Recent</h2><button type="button" class="link" data-action="clear-recent" style="font-size:15px">Clear</button></div>
                    ${recent
                      .map(
                        (r) => `<button type="button" class="row-link" data-action="run" data-q="${esc(r)}" style="margin:0;width:100%;padding:12px 8px">
                          ${icon("time-outline", "muted")}<span class="grow body clamp2">${esc(r)}</span></button>`,
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
          <div class="search-footer">
            <div class="search-footer-inner">
              <button type="button" class="link" style="font-size:15px" data-action="clear-text">Clear all</button>
              <button type="button" class="btn primary" data-action="submit-search" ${text.trim().length < 2 ? "disabled" : ""}>${icon("sparkles")}<span>Search</span></button>
            </div>
          </div>
        </div>`;
      },
      mount(root) {
        const ta = root.querySelector("#prompt");
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        ta.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        });
      },
      actions: {
        text(el, root) {
          text = el.value;
          syncButton(root);
        },
        "add-chip"(el, root) {
          const chip = el.dataset.chip;
          text = text.trim() ? `${text.trim()} ${chip}` : chip;
          const ta = root.querySelector("#prompt");
          ta.value = text;
          ta.focus();
          syncButton(root);
        },
        "clear-text"(el, root) {
          text = "";
          root.querySelector("#prompt").value = "";
          root.querySelector("#prompt").focus();
          syncButton(root);
        },
        "clear-recent"(el, root, view) {
          TM.recent.clear();
          view.refresh();
        },
        run: (el) => submit(el.dataset.q),
        "submit-search": () => submit(),
      },
    };
  });

  // --- Results: app/src/app/results.tsx -------------------------------------------------

  TM.route(/^\/results$/, (ctx) => {
    const q = ctx.params.q ?? "";
    let state = { status: "loading" };
    let impressionLogged = false;

    const load = async (view) => {
      state = { status: "loading" };
      try {
        const data = await TM.search(q);
        state = { status: "done", data };
        TM.recent.add(q);
      } catch (e) {
        state = { status: "error", message: e.message };
      }
      if (view.isCurrent()) view.refresh();
    };

    return {
      title: `${q} · TourMatch`,
      render() {
        const data = state.status === "done" ? state.data : null;
        return `
          <div class="results-header">
            <div class="results-header-inner">
              <button type="button" class="circle-btn" data-action="back" aria-label="Back">${icon("chevron-back")}</button>
              ${ui.searchPill({
                title: data?.intent.headline || q,
                subtitle: state.status === "loading" ? "Searching tour sites…" : "Tap to refine",
                data: `data-draft="${esc(q)}"`,
              })}
            </div>
          </div>
          <div class="page">
            ${state.status === "loading" ? renderLoading() : ""}
            ${state.status === "error" ? renderError(state.message) : ""}
            ${data ? renderResults(data) : ""}
          </div>`;
      },
      mount(root, view) {
        if (state.status === "loading" && !view.loading) {
          view.loading = true;
          load(view);
        }
        // Count one impression per results view, like the server does.
        if (state.status === "done" && state.data.sponsored && !impressionLogged) {
          impressionLogged = true;
          TM.advertiser?.recordImpression(state.data.sponsored.campaignId);
        }
      },
      actions: {
        retry(el, root, view) {
          view.loading = false;
          state = { status: "loading" };
          view.refresh();
        },
      },
    };
  });

  function renderLoading() {
    return `<div class="thinking">${icon("sparkles")}<span class="caption">Reading your request and checking providers…</span></div>
      <div class="grid">${ui.skeletonCard()}${ui.skeletonCard()}${ui.skeletonCard()}</div>`;
  }

  function renderError(message) {
    return `<div class="empty">${icon("cloud-offline-outline")}<h2 class="heading">Couldn't reach the search server</h2>
      <p class="caption">${esc(message)}</p><div class="mt-5">${ui.button("Try again", { variant: "dark", action: "retry", block: false })}</div></div>`;
  }

  function renderResults(data) {
    const chips = TM.intentChips(data.intent);
    const { intent } = data;
    const header = `
      <div class="mb-5">
        ${chips.length ? `<div class="chips scroll mb-4">${chips.map((c) => `<span class="chip static">${esc(c)}</span>`).join("")}</div>` : ""}
        ${
          intent.followUpQuestion && !intent.destination
            ? `<a class="follow-up" href="${href("/search", { draft: "" })}">${icon("chatbubble-ellipses-outline")}<span class="grow">${esc(intent.followUpQuestion)}</span>${icon("arrow-forward")}</a>`
            : data.summary
              ? `<div class="summary">${icon("sparkles")}<span class="grow">${esc(data.summary)}</span></div>`
              : ""
        }
        ${data.sponsored ? `<div class="mt-5" style="max-width:760px">${ui.sponsoredCard(data.sponsored)}</div>` : ""}
        ${data.tours.length ? `<p class="caption mt-4">${data.tours.length} ${data.tours.length === 1 ? "tour" : "tours"} · best match first</p>` : ""}
      </div>`;

    const empty =
      !data.tours.length && intent.destination
        ? `<div class="empty">${icon("map-outline")}<h2 class="heading">No bookable tours matched</h2>
           <p class="caption">${
             D.KNOWN_CITIES.includes(intent.destination)
               ? "Try loosening a filter, or browse the guide marketplaces below."
               : `The preview catalog covers ${D.KNOWN_CITIES.join(", ")}. Try the guide marketplaces below for ${esc(intent.destination)}.`
           }</p></div>`
        : "";

    const failed = data.providers.filter((p) => p.error);
    const footer = `
      <div class="results-footer mt-4">
        ${
          data.links.length
            ? `<h2 class="heading mb-1">Search more local-guide sites</h2>
               <p class="caption mb-3">These don't offer a public API, so we open their search for you.</p>
               ${data.links
                 .map(
                   (l) => `<a class="provider-link" href="${esc(l.url)}" target="_blank" rel="noopener">
                     <span class="provider-initial">${esc(l.providerName[0])}</span>
                     <span class="grow"><span class="strong" style="display:block">${esc(l.providerName)}</span><span class="caption">${esc(l.blurb)}</span></span>
                     ${icon("open-outline", "muted")}
                   </a>`,
                 )
                 .join("")}`
            : ""
        }
        ${failed.length ? `<p class="caption mt-4">Unavailable right now: ${esc(failed.map((f) => f.providerName).join(", "))}</p>` : ""}
        ${!data.aiUsed ? `<p class="caption mt-2">Preview mode: results use keyword matching on the sample catalog. With the server, Claude reads the request and ranks results.</p>` : ""}
      </div>`;

    return `${header}<div class="grid">${data.tours.map((t) => ui.tourCard(t)).join("")}</div>${empty}${footer}`;
  }

  // --- Tour detail: app/src/app/tour/[id].tsx -------------------------------------------------

  TM.route(/^\/tour\/(.+)$/, (ctx) => {
    const id = ctx.match[0];
    return {
      title: "Tour · TourMatch",
      bodyClass: "detail-page",
      render() {
        const tour = TM.getCachedTour(id);
        if (!tour) {
          return `${ui.screenHeader("Tour")}<div class="empty"><h2 class="heading">This tour isn't loaded anymore</h2>
            <div class="mt-4"><button type="button" class="link" data-action="back">Go back</button></div></div>`;
        }
        document.title = `${tour.title} · TourMatch`;
        const price = TM.formatPrice(tour);
        const dur = TM.formatDuration(tour.durationMinutes);
        const facts = [
          dur && { icon: "time-outline", label: dur },
          tour.isPrivate != null && { icon: "people-outline", label: tour.isPrivate ? "Private: just your group" : "Group tour" },
          tour.languages.length && { icon: "language-outline", label: `Offered in ${tour.languages.map((l) => l.toUpperCase()).join(", ")}` },
          tour.isFree && { icon: "cash-outline", label: "Free to join. Tip what you think it's worth." },
        ].filter(Boolean);
        const license =
          tour.licensedGuide === true ? "Licensed guide" : tour.licensedGuide === false ? "Local guide (not licensed)" : "License status: check on provider";
        const bookLabel = tour.isDemo ? "Sample only" : "Check availability";
        const bookBtn = tour.isDemo
          ? `<button type="button" class="btn primary" disabled>${bookLabel}</button>`
          : `<a class="btn primary" href="${esc(tour.bookingUrl)}" target="_blank" rel="noopener">${bookLabel}</a>`;
        const priceBlock = `${price ? `<div class="strong">${esc(price)}</div>` : ""}<div class="caption">${tour.isFree ? "per person" : `per person · on ${esc(tour.providerName)}`}</div>`;

        return `<article class="detail">
          <div class="detail-topbar">
            <button type="button" class="ghost-btn" data-action="back" style="text-decoration:none">${icon("chevron-back")}Back</button>
            <div class="actions">
              <button type="button" class="ghost-btn" data-action="share">${icon("share-outline")}Share</button>
              <button type="button" class="ghost-btn" data-action="toggle-save" data-id="${esc(tour.id)}" data-label="1">${icon(TM.saved.has(tour.id) ? "heart" : "heart-outline")}${TM.saved.has(tour.id) ? "Saved" : "Save"}</button>
            </div>
          </div>
          <div class="detail-hero">
            ${tour.imageUrl ? `<img src="${esc(tour.imageUrl)}" alt="" />` : `<div style="height:320px;background:var(--surface-alt)"></div>`}
            <div class="detail-float">
              <button type="button" class="circle-btn" data-action="back" aria-label="Back">${icon("chevron-back")}</button>
              <span class="heart-wrap">${ui.heart(tour, { onLight: true })}</span>
            </div>
          </div>
          <div class="detail-content">
            <div class="detail-grid">
              <div>
                <h1 class="title">${esc(tour.title)}</h1>
                <div class="meta-row">
                  ${
                    tour.rating != null
                      ? `${icon("star")}<span class="strong">${tour.rating.toFixed(2)}</span><span>·</span><span class="strong" style="text-decoration:underline">${tour.reviewCount.toLocaleString()} reviews</span><span>·</span>`
                      : ""
                  }
                  <span class="caption">${esc(tour.city ?? "")}</span>
                </div>
                <hr class="divider" />
                <div class="host">
                  <div class="avatar">${esc((tour.guideName ?? tour.providerName)[0])}${tour.licensedGuide === true ? `<span class="avatar-badge">${icon("shield-checkmark")}</span>` : ""}</div>
                  <div class="grow">
                    <div class="strong">${esc(tour.guideName ? `Hosted by ${tour.guideName}` : `Listed on ${tour.providerName}`)}</div>
                    <div class="caption">${license} · via ${esc(tour.providerName)}</div>
                  </div>
                </div>
                <hr class="divider" />
                ${
                  tour.matchReason
                    ? `<div class="match"><div class="match-head">${icon("sparkles")}<span class="strong">Why it's a match</span><span class="score">${tour.matchScore}% fit</span></div>
                       <p class="body" style="margin:8px 0 0">${esc(tour.matchReason)}</p></div>`
                    : ""
                }
                ${facts.map((f) => `<div class="fact">${icon(f.icon)}<span class="body grow">${esc(f.label)}</span></div>`).join("")}
                ${tour.description ? `<hr class="divider" /><h2 class="heading mb-3">About this tour</h2><p class="body" style="margin:0">${esc(tour.description)}</p>` : ""}
                ${tour.tags.length ? `<div class="chips mt-4">${tour.tags.map((t) => `<span class="tag">${esc(t.replace(/_/g, " ").toLowerCase())}</span>`).join("")}</div>` : ""}
                <hr class="divider" />
                <p class="caption">${
                  tour.isDemo
                    ? "This is a sample listing for demonstration. Connect a provider API key on the server to see real tours."
                    : `Booking, payment and cancellation are handled by ${esc(tour.providerName)}.`
                }</p>
              </div>
              <aside class="book-aside">
                <div style="font-size:20px">${priceBlock}</div>
                <div class="mt-5">${bookBtn.replace('class="btn primary"', 'class="btn primary block"')}</div>
                <p class="caption center-text mt-3">You'll book on ${esc(tour.providerName)}. TourMatch never takes payment.</p>
              </aside>
            </div>
          </div>
        </article>
        <div class="book-bar"><div class="book-bar-inner"><div class="grow">${priceBlock}</div>${bookBtn}</div></div>`;
      },
      actions: {
        async share() {
          const url = location.href;
          if (navigator.share) {
            try {
              await navigator.share({ title: document.title, url });
            } catch {}
          } else TM.copy(url);
        },
      },
    };
  });

  // --- Saved: app/src/app/(tabs)/saved.tsx -------------------------------------------------------

  TM.route(/^\/saved$/, () => ({
    title: "Saved · TourMatch",
    tab: "saved",
    navSearch: true,
    render() {
      const saved = TM.saved.list();
      return `<div class="page">
        <h1 class="display mb-6">Saved</h1>
        ${
          saved.length
            ? `<div class="grid">${saved.map((t) => ui.tourCard(t, { showReason: false })).join("")}</div>`
            : `<div><h2 class="heading">Create your first list</h2>
               <p class="caption" style="font-size:15px;margin-top:8px">As you search, tap the heart icon to save tours and guides you like.</p>
               <div class="mt-6">${ui.button("Start exploring", { variant: "dark", icon: "search", href: "#/", block: false })}</div></div>`
        }
      </div>`;
    },
  }));

  // --- More: app/src/app/(tabs)/more.tsx -------------------------------------------------------------

  const MODE_LABEL = { api: "Live search", link: "Opens their site", demo: "Sample data" };

  TM.route(/^\/more$/, () => ({
    title: "More · TourMatch",
    tab: "more",
    navSearch: true,
    render() {
      const row = (title, subtitle, right, ok) => `<div class="between" style="padding:16px 0;border-bottom:1px solid var(--border)">
        <div class="grow"><div class="strong">${esc(title)}</div><div class="caption">${esc(subtitle)}</div></div>
        <span class="status-pill ${ok ? "pill-ok" : "pill-off"}">${esc(right)}</span></div>`;
      return `<div class="page"><div class="medium" style="margin:0">
        <h1 class="display">More</h1>
        <h2 class="heading mt-6">Sources</h2>
        <p class="caption" style="font-size:15px;margin-top:8px">Where TourMatch looks for tours. Live sources are searched and ranked together; the rest open pre-filled searches.</p>
        <div class="banner info mt-4">${icon("flask-outline")}<span class="grow">This is the static design preview. Statuses below show what a server with no keys reports.</span></div>
        ${row("Claude AI", "Understands your request and ranks results", "Off in preview", false)}
        ${D.PROVIDERS.map((p) => row(p.providerName, MODE_LABEL[p.mode], p.enabled ? "Connected" : "Needs API key", p.enabled)).join("")}
        <div class="mt-10">${ui.businessLinks()}</div>
        <div class="mt-10">${ui.helpLinks()}</div>
        <div class="mt-10">
          <h2 class="heading mb-3">Preview data</h2>
          <p class="caption" style="font-size:14px">Saved tours, searches, advertiser and partner accounts in this preview live in your browser's storage.</p>
          <div class="mt-4" style="max-width:280px">${ui.button("Reset preview data", { variant: "outline", icon: "refresh-outline", action: "reset" })}</div>
        </div>
      </div></div>`;
    },
    actions: {
      reset(el, root, view) {
        if (el.dataset.armed) {
          TM.storage.clearAll();
          TM.toast("Preview data cleared");
          view.refresh();
        } else {
          el.dataset.armed = "1";
          el.querySelector("span").textContent = "Tap again to confirm";
        }
      },
    },
  }));
})();
