// In-browser stand-in for the server's POST /search: parse the request into a SearchIntent,
// rank the sample catalog, and attach link providers and a sponsored placement.
// The real app does the parsing and ranking with Claude (server/src/ai.ts); this is a
// rule-based approximation so the design can be clicked through without a backend.
(function () {
  "use strict";

  const TM = window.TM;
  const D = window.TM_DATA;

  const INTERESTS = {
    food: ["food", "eat\\b", "taco", "tapas", "culinary", "tasting", "street food", "gelato", "carbonara"],
    history: ["history", "historic", "ancient", "archaeolog", "ruins", "roman\\b", "pyramid"],
    art: ["arts?\\b", "artists?", "museum", "painting", "gallery", "sistine"],
    architecture: ["architecture", "gaudí", "gaudi", "palace", "buildings"],
    nightlife: ["nightlife", "bars?\\b", "after dark", "at night", "night", "izakaya", "pub"],
    wine: ["wine", "vineyard"],
    drinks: ["mezcal", "drinks", "cocktail", "sake"],
    culture: ["culture", "temple", "tea\\b", "shrine", "fado"],
    family: ["kid", "kids", "family", "children", "child"],
    photography: ["photo", "photography", "instagram"],
    walking: ["walking", "walk", "stroll"],
    "day trip": ["day trip", "day-trip", "excursion"],
  };

  // What to look for in a tour's text when checking an interest.
  const TOUR_KEYWORDS = {
    ...INTERESTS,
    family: ["kids", "kid", "family", "children"],
    history: ["history", "archaeolog", "ancient", "forum", "pyramid", "roman\\b"],
    nightlife: ["nightlife", "bars?\\b", "after dark", "evening"],
  };

  const has = (text, w) => new RegExp(`\\b${w}`, "i").test(text);

  const LANGUAGES = { spanish: "es", french: "fr", german: "de", italian: "it", portuguese: "pt", japanese: "ja", english: "en", catalan: "ca" };
  const LANGUAGE_NAME = { es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", ja: "Japanese", en: "English", ca: "Catalan" };
  const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  function findDestination(prompt, lower) {
    // Longest alias first so "mexico city" beats "mexico".
    const aliases = Object.keys(D.CITY_ALIASES).sort((a, b) => b.length - a.length);
    for (const a of aliases) {
      if (new RegExp(`\\b${a.replace(/ /g, "\\s+")}\\b`, "i").test(lower)) return D.CITY_ALIASES[a];
    }
    // Unknown city: "... in Prague", "trip to Buenos Aires".
    const m = prompt.match(/\b(?:in|to|around|visiting|near)\s+([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)?)/u);
    if (m && !LANGUAGES[m[1].toLowerCase()] && !MONTHS.includes(m[1].toLowerCase())) return m[1];
    return null;
  }

  function findDates(lower) {
    const today = new Date();
    if (/\btoday\b/.test(lower)) return [iso(today), iso(today)];
    if (/\btomorrow\b/.test(lower)) return [iso(addDays(today, 1)), iso(addDays(today, 1))];
    const weekend = lower.match(/\b(this|next)\s+weekend\b/);
    if (weekend) {
      let sat = addDays(today, (6 - today.getDay() + 7) % 7);
      if (weekend[1] === "next") sat = addDays(sat, 7);
      return [iso(sat), iso(addDays(sat, 1))];
    }
    const month = lower.match(new RegExp(`\\b(?:in|during)\\s+(${MONTHS.join("|")})\\b`));
    if (month) {
      const mi = MONTHS.indexOf(month[1]);
      const year = mi < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
      return [iso(new Date(year, mi, 1)), iso(new Date(year, mi + 1, 0))];
    }
    return [null, null];
  }

  function parseIntent(prompt) {
    const lower = prompt.toLowerCase();
    const destination = findDestination(prompt, lower);
    const [startDate, endDate] = findDates(lower);

    let groupSize = null;
    const g =
      lower.match(/\bfor\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b(?!\s*(?:hours?|hrs?|days?|\$))/) ||
      lower.match(/\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+(?:adults|people|guests|of us|travellers|travelers)\b/);
    if (g) groupSize = NUMBER_WORDS[g[1]] ?? Number(g[1]);
    else if (/\b(couple|my partner and i|for two)\b/.test(lower)) groupSize = 2;
    else if (/\bsolo\b|\bjust me\b/.test(lower)) groupSize = 1;

    let budgetPerPerson = null;
    let currency = "USD";
    const b = lower.match(/(?:under|below|less than|max|up to|budget of|no more than)\s*([$€£])?\s*(\d{2,5})(?!\s*(?:hours?|hrs?|h\b|min))/);
    if (b) {
      budgetPerPerson = Number(b[2]);
      if (b[1] === "€") currency = "EUR";
      if (b[1] === "£") currency = "GBP";
    }

    let maxDurationHours = null;
    const dur = lower.match(/(?:under|max|no more than|less than|at most|up to)\s*(\d{1,2})\s*(?:hours?|hrs?|h)\b/);
    if (dur) maxDurationHours = Number(dur[1]);
    else if (/half[- ]day/.test(lower)) maxDurationHours = 4;
    else if (/\bshort\b|\bquick\b/.test(lower)) maxDurationHours = 2;

    const interests = Object.entries(INTERESTS)
      .filter(([, words]) => words.some((w) => has(lower, w)))
      .map(([k]) => k)
      .filter((k) => k !== "walking" || !/walk-heavy|much walking|walking tour/.test(lower));

    const tourStyle = /\bprivate\b|just us|only us/.test(lower)
      ? "private"
      : /\bfree\b|tip-based|tips only/.test(lower)
        ? "free_walking"
        : /small[- ]group/.test(lower)
          ? "small_group"
          : "any";

    const languages = [];
    for (const [word, code] of Object.entries(LANGUAGES)) {
      if (new RegExp(`\\b(?:in|speaks?|speaking)\\s+${word}\\b|\\b${word}[- ]speaking\\b`).test(lower)) languages.push(code);
    }

    const accessibilityNeeds = [];
    if (/wheelchair|step[- ]free/.test(lower)) accessibilityNeeds.push("wheelchair");
    if (/limited mobility|not too much walking|walk-heavy|bad knees|little walking|less walking/.test(lower)) accessibilityNeeds.push("limited walking");

    const licensedOnly = /licen[sc]ed|certified|official guide|blue badge|accredited/.test(lower);
    if (interests.includes("family") === false && /kid-friendly/.test(lower)) interests.push("family");

    const intent = {
      destination,
      country: destination ? D.COUNTRY[destination] ?? null : null,
      startDate,
      endDate,
      groupSize,
      budgetPerPerson,
      currency,
      interests,
      tourStyle,
      licensedOnly,
      languages,
      maxDurationHours,
      accessibilityNeeds,
      headline: "",
      followUpQuestion: destination ? null : "Where are you headed? Add a city and we'll find guides there.",
    };
    intent.headline = makeHeadline(intent, prompt);
    return intent;
  }

  function makeHeadline(i, prompt) {
    if (!i.destination) return prompt.length > 70 ? `${prompt.slice(0, 67)}…` : prompt;
    const style = { private: "Private", small_group: "Small-group", free_walking: "Free walking", any: "" }[i.tourStyle];
    const words = [style, i.licensedOnly ? "licensed" : "", i.interests.find((x) => !["walking", "family"].includes(x)) || ""]
      .filter(Boolean)
      .join(" ");
    const noun = i.tourStyle === "free_walking" ? "tour" : "tours";
    let h = `${words ? `${words} ${noun}` : "Tours"} in ${i.destination}`;
    if (i.groupSize) h += ` for ${i.groupSize}`;
    return h.charAt(0).toUpperCase() + h.slice(1);
  }

  /** Human-readable chips describing what the AI understood (mirrors app/src/format.ts). */
  function intentChips(i) {
    const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const chips = [];
    if (i.destination) chips.push(i.destination);
    if (i.startDate) chips.push(i.endDate && i.endDate !== i.startDate ? `${fmt(i.startDate)} – ${fmt(i.endDate)}` : fmt(i.startDate));
    if (i.groupSize) chips.push(`${i.groupSize} ${i.groupSize === 1 ? "guest" : "guests"}`);
    const style = { private: "Private", small_group: "Small group", free_walking: "Free walking tour", any: null }[i.tourStyle];
    if (style) chips.push(style);
    if (i.licensedOnly) chips.push("Licensed guide");
    if (i.budgetPerPerson) chips.push(`Under ${Math.round(i.budgetPerPerson)} ${i.currency}`);
    if (i.maxDurationHours) chips.push(`≤ ${i.maxDurationHours} hr`);
    chips.push(...i.interests.slice(0, 4));
    chips.push(...i.accessibilityNeeds);
    if (i.languages.length) chips.push(i.languages.map((l) => l.toUpperCase()).join(" / "));
    return chips;
  }

  function scoreTour(t, i) {
    const hay = `${t.title} ${t.description} ${t.tags.join(" ")}`.toLowerCase();
    const pros = [];
    const cons = [];
    let score = 52 + Math.max(0, ((t.rating ?? 4.7) - 4.8) * 50);

    if (i.licensedOnly) {
      if (t.licensedGuide === false) return null; // README: drop tours that say the guide isn't licensed
      if (t.licensedGuide === true) {
        score += 14;
        pros.push(t.guideName ? `${t.guideName} is a licensed guide` : "Licensed guide");
      }
    }

    if (i.tourStyle === "private") {
      if (t.isPrivate) (score += 15), pros.push("private for just your group");
      else (score -= 28), cons.push("it's a group tour, not private");
    } else if (i.tourStyle === "free_walking") {
      if (t.isFree) (score += 22), pros.push("free to join, tip what you like");
      else (score -= 25), cons.push("it's a paid tour");
    } else if (i.tourStyle === "small_group") {
      if (t.tags.includes("small group")) (score += 10), pros.push("small group");
      else if (t.isPrivate) score -= 4;
    }

    const hits = i.interests.filter((k) => (TOUR_KEYWORDS[k] || [k]).some((w) => has(hay, w)));
    score += hits.length * 11;
    if (i.interests.length && !hits.length) score -= 16;
    if (hits.length) pros.push(`covers ${hits.slice(0, 2).join(" and ")}`);

    if (i.budgetPerPerson != null) {
      if (t.isFree || (t.priceFrom ?? 0) <= i.budgetPerPerson) {
        score += 8;
        if (!t.isFree) pros.push(`$${t.priceFrom} fits your budget`);
      } else {
        const over = (t.priceFrom - i.budgetPerPerson) / i.budgetPerPerson;
        score -= Math.min(40, 12 + over * 60);
        cons.push(`$${t.priceFrom} is over your budget`);
      }
    }

    if (i.maxDurationHours && t.durationMinutes) {
      if (t.durationMinutes <= i.maxDurationHours * 60) score += 5;
      else (score -= 24), cons.push(`runs ${TM.formatDuration(t.durationMinutes)}`);
    }

    for (const lang of i.languages) {
      if (t.languages.includes(lang)) (score += 9), pros.push(`offered in ${LANGUAGE_NAME[lang] ?? lang.toUpperCase()}`);
      else (score -= 30), cons.push(`not offered in ${LANGUAGE_NAME[lang] ?? lang.toUpperCase()}`);
    }

    if (i.accessibilityNeeds.includes("wheelchair")) {
      if (/wheelchair/.test(hay)) (score += 16), pros.push("wheelchair-accessible route");
      else (score -= 8), cons.push("check step-free access with the guide");
    }
    if (i.accessibilityNeeds.includes("limited walking")) {
      if (/limited walking|van|pickup|wheelchair/.test(hay)) (score += 10), pros.push("easy on walking");
      else if (t.tags.includes("walking")) (score -= 14), cons.push("involves a lot of walking");
    }

    if (i.groupSize && i.groupSize >= 5 && t.isPrivate) score += 4;

    score = Math.max(0, Math.min(99, Math.round(score)));
    if (score < 25) return null;

    let reason;
    if (pros.length) {
      reason = pros.slice(0, 3).join(", ");
      if (cons.length) reason += `, but ${cons[0]}`;
    } else if (cons.length) {
      reason = `Highly rated, but ${cons[0]}`;
    } else {
      reason = `Highly rated: ${t.rating?.toFixed(2)} from ${t.reviewCount.toLocaleString()} reviews`;
    }
    reason = reason.charAt(0).toUpperCase() + reason.slice(1);
    if (reason.length > 110) reason = `${reason.slice(0, 107)}…`;
    return { ...t, matchScore: score, matchReason: reason };
  }

  function rankTours(intent, tours) {
    let dropped = 0;
    const ranked = [];
    for (const t of tours) {
      const r = scoreTour(t, intent);
      if (r) ranked.push(r);
      else if (intent.licensedOnly && t.licensedGuide === false) dropped++;
    }
    ranked.sort((a, b) => b.matchScore - a.matchScore || (b.rating ?? 0) - (a.rating ?? 0));

    let summary = "";
    if (!ranked.length) {
      summary = intent.destination ? `Nothing in the catalog fits ${intent.destination} yet.` : "";
    } else {
      const top = ranked[0];
      const where = intent.destination ? ` in ${intent.destination}` : "";
      summary = `Found ${ranked.length} ${ranked.length === 1 ? "tour" : "tours"}${where} that fit. ${top.guideName ? `${top.guideName}'s ` : ""}"${top.title}" is the standout pick.`;
      if (dropped) summary += ` Left out ${dropped} with guides who aren't licensed.`;
    }
    return { summary, tours: ranked };
  }

  function sponsoredFor(intent) {
    const dest = intent.destination?.toLowerCase() ?? null;
    // Advertisers' own live ads from the Ads Manager preview take priority.
    const own = TM.advertiser ? TM.advertiser.liveAdsFor(intent) : [];
    if (own.length) return own[Math.floor(Math.random() * own.length)];
    if (!dest) return null;
    return D.HOUSE_ADS.find((a) => a.destinations.includes(dest)) ?? null;
  }

  // Cache the last results so tour pages survive a reload.
  const CACHE_KEY = "lastResults";
  TM.getCachedTour = (id) => {
    const cached = TM.storage.get(CACHE_KEY, []);
    return (
      cached.find((t) => t.id === id) ??
      TM.saved.list().find((t) => t.id === id) ??
      D.TOURS.find((t) => t.id === id) ??
      null
    );
  };

  TM.search = async function search(prompt) {
    await TM.delay(700 + Math.random() * 600); // feel of a network + model round trip
    const intent = parseIntent(prompt);
    const pool = intent.destination
      ? D.TOURS.filter((t) => t.city?.toLowerCase() === intent.destination.toLowerCase())
      : D.TOURS;
    const { summary, tours } = rankTours(intent, pool);
    const links = intent.destination
      ? D.LINK_PROVIDERS.map((p) => ({ providerId: p.providerId, providerName: p.providerName, url: p.build(encodeURIComponent(intent.destination)), blurb: p.blurb }))
      : [];
    const providers = D.PROVIDERS.map((p) => ({ ...p, resultCount: p.mode === "demo" ? tours.length : undefined }));
    TM.storage.set(CACHE_KEY, tours.slice(0, 40));
    return { intent, summary, tours, links, providers, sponsored: sponsoredFor(intent), aiUsed: false };
  };

  TM.intentChips = intentChips;
  TM.parseIntent = parseIntent;
})();
