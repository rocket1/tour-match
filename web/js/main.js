// Boots the preview: renders the current route, wires shared actions and the app chrome.
(function () {
  "use strict";

  const TM = window.TM;
  const app = document.getElementById("app");
  const navSearch = document.getElementById("nav-search");
  let current = null;

  TM.route(/.*/, () => ({
    title: "Not found · TourMatch",
    render: () => `${TM.ui.screenHeader("Not found")}<div class="empty">${TM.icon("compass-outline")}<h1 class="heading">We couldn't find that page</h1>
      <div class="mt-5">${TM.ui.button("Go to Explore", { variant: "dark", href: "#/", block: false })}</div></div>`,
  }));

  function draw(view, { keepScroll = false } = {}) {
    const y = window.scrollY;
    const focusedName = document.activeElement?.name;
    app.innerHTML = view.render();
    view.mount?.(app, view);
    if (keepScroll) {
      window.scrollTo(0, y);
      // Put focus back on the field the user was in, if it still exists.
      if (focusedName) app.querySelector(`[name="${CSS.escape(focusedName)}"]`)?.focus({ preventScroll: true });
    }
  }

  function renderRoute() {
    TM.trackNavigation(location.hash || "#/");
    const r = TM.resolve(location.hash);
    const view = r.factory({ params: r.params, match: r.match });
    view.isCurrent = () => current === view;
    view.refresh = (opts) => {
      if (current === view) draw(view, opts);
    };
    current = view;

    document.title = view.title || "TourMatch";
    document.body.className = [view.tab ? "has-tabs" : "", view.bodyClass || ""].join(" ").trim();
    document.getElementById("topnav").hidden = !view.tab;
    for (const a of document.querySelectorAll("[data-tab]")) {
      if (a.dataset.tab === view.tab) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    navSearch.innerHTML = view.navSearch ? TM.ui.searchPill({ title: "Where to?", subtitle: "Describe your perfect tour" }) : "";

    draw(view);
    window.scrollTo(0, 0);
  }

  // --- Shared actions (available on every screen) --------------------------------------------

  const shared = {
    back: (el) => TM.back(el.dataset.fallback || "/"),
    "open-search": (el) => TM.go("/search", el.dataset.draft != null ? { draft: el.dataset.draft } : null),
    copy: (el) => TM.copy(el.dataset.text),
    "toggle-save"(el) {
      const tour = TM.getCachedTour(el.dataset.id);
      if (!tour) return;
      const on = TM.saved.toggle(tour);
      TM.toast(on ? "Saved" : "Removed from saved");
      // Update every heart for this tour without a full re-render.
      for (const b of document.querySelectorAll(`[data-action="toggle-save"][data-id="${CSS.escape(tour.id)}"]`)) {
        b.setAttribute("aria-pressed", String(on));
        b.querySelector("ion-icon")?.setAttribute("name", on ? "heart" : "heart-outline");
        if (b.dataset.label) b.lastChild.textContent = on ? "Saved" : "Save";
        else b.setAttribute("aria-label", on ? "Remove from saved" : "Save");
      }
      if (current?.tab === "saved") current.refresh({ keepScroll: true });
    },
    "ad-click"(el) {
      TM.advertiser.recordClick(el.dataset.campaign);
    },
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.tagName === "FORM") return;
    const name = el.dataset.action;
    if (name === "segment") {
      current?.onSegment?.(el.dataset.name, el.dataset.value, current);
      return;
    }
    const fn = current?.actions?.[name] ?? shared[name];
    if (!fn) return;
    // Links (e.g. sponsored cards) still navigate; buttons don't.
    if (el.tagName !== "A") e.preventDefault();
    fn(el, app, current, e);
  });

  app.addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-submit]");
    if (!form) return;
    e.preventDefault();
    current?.actions?.[form.dataset.submit]?.(form, app, current, e);
  });

  app.addEventListener("input", (e) => {
    const el = e.target.closest("[data-input]");
    if (!el) return;
    current?.actions?.[el.dataset.input]?.(el, app, current, e);
  });

  // --- Preview notice ----------------------------------------------------------------------

  const bar = document.getElementById("preview-bar");
  if (!TM.storage.get("previewBarDismissed", false)) bar.hidden = false;
  document.getElementById("preview-dismiss").addEventListener("click", () => {
    bar.hidden = true;
    TM.storage.set("previewBarDismissed", true);
  });

  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
