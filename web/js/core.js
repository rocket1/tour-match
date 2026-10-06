// Core helpers shared by every screen: escaping, storage, routing and small UI components.
(function () {
  "use strict";

  const TM = (window.TM = window.TM || {});

  // --- HTML ----------------------------------------------------------------------

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  TM.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  TM.icon = (name, cls = "") => `<ion-icon name="${name}"${cls ? ` class="${cls}"` : ""} aria-hidden="true"></ion-icon>`;
  TM.titleCase = (s) => String(s).replace(/\b\w/g, (m) => m.toUpperCase());

  // --- Storage (per browser; wrapped because private modes can throw) -----------------

  const PREFIX = "tourmatch.";
  TM.storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        // Storage full or blocked: the preview keeps working for this page view.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(PREFIX + key);
      } catch {}
    },
    clearAll() {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
    },
  };

  TM.randomId = (bytes = 3) =>
    Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

  // --- Saved tours & recent searches (mirrors app/src/store.tsx) -------------------------

  TM.saved = {
    list: () => TM.storage.get("saved.v1", []),
    has: (id) => TM.saved.list().some((t) => t.id === id),
    toggle(tour) {
      const prev = TM.saved.list();
      const on = !prev.some((t) => t.id === tour.id);
      TM.storage.set("saved.v1", on ? [tour, ...prev] : prev.filter((t) => t.id !== tour.id));
      return on;
    },
  };

  TM.recent = {
    list: () => TM.storage.get("recent.v1", []),
    add(prompt) {
      TM.storage.set("recent.v1", [prompt, ...TM.recent.list().filter((p) => p !== prompt)].slice(0, 8));
    },
    clear: () => TM.storage.set("recent.v1", []),
  };

  // --- Routing (hash based so any static host works without rewrites) ---------------------

  const routes = [];
  TM.route = (pattern, factory) => routes.push({ pattern, factory });

  TM.href = (path, params) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString() : "";
    return `#${path}${qs ? `?${qs}` : ""}`;
  };

  TM.go = (path, params, { replace = false } = {}) => {
    const h = TM.href(path, params);
    if (replace) location.replace(h);
    else location.hash = h;
  };

  // In-app history so Back never leaves the site.
  const stack = [];
  TM.trackNavigation = (hash) => {
    if (stack.length > 1 && stack[stack.length - 2] === hash) stack.pop();
    else if (stack[stack.length - 1] !== hash) stack.push(hash);
  };
  TM.back = (fallback = "/") => {
    if (stack.length > 1) history.back();
    else TM.go(fallback, null, { replace: true });
  };

  TM.resolve = (hash) => {
    const raw = hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const params = Object.fromEntries(new URLSearchParams(qs || ""));
    for (const r of routes) {
      const m = path.match(r.pattern);
      if (m) return { factory: r.factory, params, match: m.slice(1).map(decodeURIComponent) };
    }
    return null;
  };

  // --- Toast ------------------------------------------------------------------------------

  let toastTimer;
  TM.toast = (msg) => {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  };

  TM.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      TM.toast("Copied");
    } catch {
      TM.toast("Couldn't copy. Select the text instead.");
    }
  };

  TM.delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Formatting (mirrors app/src/format.ts) ----------------------------------------------------

  TM.formatPrice = (t) => {
    if (t.isFree) return "Free · tip-based";
    if (t.priceFrom == null) return null;
    try {
      const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: t.currency || "USD", maximumFractionDigits: 0 }).format(
        t.priceFrom,
      );
      return `From ${amount}`;
    } catch {
      return `From ${Math.round(t.priceFrom)} ${t.currency}`;
    }
  };

  TM.formatDuration = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const h = minutes / 60;
    return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`;
  };

  TM.formatCents = (cents) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

  TM.formatDate = (iso) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // --- Components --------------------------------------------------------------------------------
  const { esc, icon } = TM;

  TM.ui = {
    searchPill({ title, subtitle, action = "open-search", data = "" }) {
      return `<button type="button" class="search-pill" data-action="${action}" ${data}>
        ${icon("search")}
        <span class="pill-text">
          <span class="pill-title" style="display:block">${esc(title)}</span>
          ${subtitle ? `<span class="pill-sub" style="display:block">${esc(subtitle)}</span>` : ""}
        </span>
        <span class="spark">${icon("sparkles")}</span>
      </button>`;
    },

    screenHeader(title, { fallback = "/", right = "" } = {}) {
      return `<div class="screen-header">
        <button type="button" class="circle-btn" data-action="back" data-fallback="${esc(fallback)}" aria-label="Back">${icon("chevron-back")}</button>
        <div class="title-text">${esc(title)}</div>
        ${right || '<span class="spacer"></span>'}
      </div>`;
    },

    button(label, { variant = "primary", icon: ic, action, href, type = "button", disabled, block = true, data = "", busy } = {}) {
      const cls = `btn ${variant}${block ? " block" : ""}`;
      const inner = busy ? `<span class="spinner"></span>` : `${ic ? icon(ic) : ""}<span>${esc(label)}</span>`;
      if (href) return `<a class="${cls}" href="${href}" ${data}>${inner}</a>`;
      return `<button type="${type}" class="${cls}"${action ? ` data-action="${action}"` : ""}${disabled || busy ? " disabled" : ""} ${data}>${inner}</button>`;
    },

    field({ name, label, value = "", type = "text", error, hint, placeholder = "", multiline, attrs = "" }) {
      const id = `f_${name}`;
      const control = multiline
        ? `<textarea id="${id}" name="${name}" placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>`
        : `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs} />`;
      return `<div class="field${error ? " invalid" : ""}" data-field="${name}">
        <div class="field-box"><label for="${id}">${esc(label)}</label>${control}</div>
        ${error ? `<div class="err">${esc(error)}</div>` : hint ? `<div class="hint">${esc(hint)}</div>` : ""}
      </div>`;
    },

    segmented(name, value, options) {
      return `<div class="segmented" role="group">${options
        .map(
          (o) =>
            `<button type="button" data-action="segment" data-name="${name}" data-value="${esc(o.value)}" aria-pressed="${o.value === value}">${esc(o.label)}</button>`,
        )
        .join("")}</div>`;
    },

    codeBlock(title, code) {
      return `<div class="code-block">
        <div class="code-head"><span>${esc(title)}</span><button type="button" data-action="copy" data-text="${esc(code)}">${icon("copy-outline")}Copy</button></div>
        <pre><code>${esc(code)}</code></pre>
      </div>`;
    },

    termsCheck(audience, label, checked, error) {
      return `<label class="check">
        <input type="checkbox" name="acceptTerms" ${checked ? "checked" : ""} />
        <span class="body">I agree to the <a class="link" href="${TM.href(`/legal/${audience}`)}" target="_blank" rel="noopener">${esc(label)}</a>.</span>
      </label>${error ? `<div class="err" style="color:var(--brand-dark);font-size:12px;margin:-8px 0 16px 34px">${esc(error)}</div>` : ""}`;
    },

    heart(tour, { onLight = false } = {}) {
      const on = TM.saved.has(tour.id);
      return `<button type="button" class="heart${onLight ? " on-light" : ""}" data-action="toggle-save" data-id="${esc(tour.id)}" aria-pressed="${on}" aria-label="${on ? "Remove from saved" : "Save"}">${icon(on ? "heart" : "heart-outline")}</button>`;
    },

    tourCard(tour, { showReason = true } = {}) {
      const price = TM.formatPrice(tour);
      const meta = [tour.city, TM.formatDuration(tour.durationMinutes), tour.isPrivate ? "Private" : null].filter(Boolean).join(" · ");
      return `<article class="tour-card">
        <a class="tour-link" href="${TM.href(`/tour/${encodeURIComponent(tour.id)}`)}">
          <div class="tour-img-wrap">
            ${tour.imageUrl ? `<img class="tour-img" src="${esc(tour.imageUrl)}" alt="" loading="lazy" />` : ""}
            <div class="badges">
              ${tour.licensedGuide === true ? `<span class="badge">${icon("shield-checkmark")}Licensed guide</span>` : ""}
              ${tour.isDemo ? `<span class="badge">Sample</span>` : ""}
            </div>
          </div>
          <div class="tour-body">
            <div class="tour-title-row">
              <div class="tour-title">${esc(tour.title)}</div>
              ${
                tour.rating != null
                  ? `<div class="rating">${icon("star")}${tour.rating.toFixed(2)}${tour.reviewCount ? `<span class="caption">&nbsp;(${tour.reviewCount.toLocaleString()})</span>` : ""}</div>`
                  : ""
              }
            </div>
            ${meta ? `<div class="caption">${esc(meta)}</div>` : ""}
            <div class="caption">via ${esc(tour.providerName)}</div>
            ${price ? `<div class="price">${esc(price)}</div>` : ""}
            ${showReason && tour.matchReason ? `<div class="reason">${icon("sparkles")}<span class="clamp2">${esc(tour.matchReason)}</span></div>` : ""}
          </div>
        </a>
        ${TM.ui.heart(tour)}
      </article>`;
    },

    sponsoredCard(ad, { preview = false } = {}) {
      const tag = preview ? "div" : "a";
      const attrs = preview
        ? ""
        : `href="${esc(ad.url)}" target="_blank" rel="noopener sponsored" data-action="ad-click" data-campaign="${esc(ad.campaignId)}"`;
      return `<${tag} class="sponsored" ${attrs} aria-label="Sponsored by ${esc(ad.advertiser)}: ${esc(ad.headline)}">
        ${
          ad.imageUrl
            ? `<img class="sponsored-img" src="${esc(ad.imageUrl)}" alt="" loading="lazy" data-preview-img />`
            : `<div class="sponsored-img" data-preview-img>${icon("megaphone-outline")}</div>`
        }
        <div class="grow" style="display:grid;gap:2px">
          <p class="label">Sponsored · <span data-preview="advertiser">${esc(ad.advertiser)}</span></p>
          <div class="strong clamp2" data-preview="headline">${esc(ad.headline)}</div>
          <div class="caption clamp2" data-preview="body">${esc(ad.body)}</div>
          <div class="cta"><span data-preview="cta">${esc(ad.ctaLabel)}</span> →</div>
        </div>
      </${tag}>`;
    },

    skeletonCard() {
      return `<div class="skel-card"><div class="skeleton skel-img"></div><div class="skeleton skel-line" style="width:70%"></div><div class="skeleton skel-line" style="width:45%"></div></div>`;
    },

    linkList(title, links) {
      return `<section>
        <h2 class="heading mb-3">${esc(title)}</h2>
        ${links
          .map(
            (l) => `<a class="row-link" href="${l.href}">
              <span class="icon-box">${icon(l.icon)}</span>
              <span class="grow"><span class="strong" style="display:block">${esc(l.title)}</span>${l.body ? `<span class="caption">${esc(l.body)}</span>` : ""}</span>
              ${icon("chevron-forward", "muted")}
            </a>`,
          )
          .join("")}
      </section>`;
    },

    businessLinks() {
      const account = TM.advertiser && TM.advertiser.signedInAccount();
      return TM.ui.linkList("TourMatch for business", [
        { href: "#/partners", icon: "code-slash-outline", title: "List your tours", body: "Tour companies: connect your booking API with our partner toolkit." },
        account
          ? { href: "#/advertiser", icon: "stats-chart-outline", title: "Ads Manager", body: `Signed in as ${account.companyName}` }
          : { href: "#/advertise", icon: "megaphone-outline", title: "Advertise with us", body: "Reach travellers planning trips to your city." },
      ]);
    },

    helpLinks() {
      return TM.ui.linkList("Help & legal", [
        { href: "#/support/traveler", icon: "help-buoy-outline", title: "Contact support" },
        { href: "#/legal/traveler", icon: "document-text-outline", title: "Terms of Service" },
        { href: "#/legal/advertiser", icon: "megaphone-outline", title: "Advertiser Terms" },
        { href: "#/legal/partner", icon: "business-outline", title: "Partner Terms" },
      ]);
    },
  };

  /** Read a form's fields into a plain object (checkboxes become booleans). */
  TM.formData = (form) => {
    const out = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      out[el.name] = el.type === "checkbox" ? el.checked : el.value;
    }
    return out;
  };

  TM.isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  TM.isHttps = (s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" && u.hostname.includes(".");
    } catch {
      return false;
    }
  };
})();
