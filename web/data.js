// Static data for the web preview. Mirrors server/src/providers/demo.ts, links.ts,
// partners/protocol.ts and app/src/partnerDocs.ts. Keep them in sync by hand for now.
(function () {
  "use strict";

  const img = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

  const SEEDS = [
    { key: "rome-colosseum", city: "Rome", title: "Colosseum & Roman Forum with an archaeologist", description: "Skip-the-line entry and three hours through the Colosseum, Forum and Palatine Hill with a licensed guide who has excavated on site.", imageUrl: img("1552832230-c0197dd311b5"), rating: 4.97, reviewCount: 812, priceFrom: 89, isFree: false, isPrivate: false, durationMinutes: 180, guideName: "Giulia", licensedGuide: true, languages: ["en", "it"], tags: ["history", "archaeology", "small group"] },
    { key: "rome-trastevere-food", city: "Rome", title: "Trastevere food crawl: supplì, carbonara & gelato", description: "Eight tastings across family-run trattorie in Trastevere. Vegetarian options on request.", imageUrl: img("1515542622106-78bda8ba0e5b"), rating: 4.92, reviewCount: 1403, priceFrom: 75, isFree: false, isPrivate: false, durationMinutes: 210, guideName: "Marco", licensedGuide: false, languages: ["en"], tags: ["food", "evening", "small group"] },
    { key: "rome-vatican-private", city: "Rome", title: "Private Vatican Museums & Sistine Chapel", description: "Early entry with a licensed art historian, just your party. Wheelchair-accessible route available.", imageUrl: img("1531572753322-ad063cecc140"), rating: 4.95, reviewCount: 356, priceFrom: 210, isFree: false, isPrivate: true, durationMinutes: 180, guideName: "Francesca", licensedGuide: true, languages: ["en", "es", "it"], tags: ["art", "history", "private", "wheelchair"] },
    { key: "lisbon-alfama", city: "Lisbon", title: "Alfama & Mouraria: fado, tiles and hidden miradouros", description: "A walking story of Lisbon's oldest quarters, ending with a glass of ginjinha.", imageUrl: img("1555881400-74d7acaacd8b"), rating: 4.9, reviewCount: 640, priceFrom: 0, isFree: true, isPrivate: false, durationMinutes: 150, guideName: "Rita", licensedGuide: true, languages: ["en", "pt", "es"], tags: ["walking", "history", "music", "free tour"] },
    { key: "lisbon-sintra-private", city: "Lisbon", title: "Private day trip to Sintra & Cascais", description: "Pena Palace, Quinta da Regaleira and the coast road, with hotel pickup in an air-conditioned van.", imageUrl: img("1585208798174-6cedd86e019a"), rating: 4.96, reviewCount: 288, priceFrom: 145, isFree: false, isPrivate: true, durationMinutes: 480, guideName: "João", licensedGuide: true, languages: ["en", "fr", "pt"], tags: ["day trip", "private", "architecture"] },
    { key: "tokyo-izakaya", city: "Tokyo", title: "Shinjuku izakaya hopping after dark", description: "Three hidden bars in Omoide Yokocho and Golden Gai with a Tokyo local. Food and drinks included.", imageUrl: img("1540959733332-eab4deabeeaf"), rating: 4.94, reviewCount: 1120, priceFrom: 120, isFree: false, isPrivate: false, durationMinutes: 180, guideName: "Kenji", licensedGuide: false, languages: ["en", "ja"], tags: ["food", "nightlife", "small group"] },
    { key: "tokyo-private-custom", city: "Tokyo", title: "Your Tokyo, your way: custom private day with a licensed guide", description: "A National Government Licensed Guide plans the day around you: temples, anime, markets or all three.", imageUrl: img("1493976040374-85c8e12f0c0e"), rating: 4.99, reviewCount: 204, priceFrom: 260, isFree: false, isPrivate: true, durationMinutes: 480, guideName: "Aiko", licensedGuide: true, languages: ["en", "ja"], tags: ["private", "custom", "culture", "kids"] },
    { key: "paris-montmartre", city: "Paris", title: "Montmartre artists' walk", description: "Follow Picasso and Renoir through the hilltop village, with a crêpe stop.", imageUrl: img("1502602898657-3e91760cbb34"), rating: 4.88, reviewCount: 950, priceFrom: 0, isFree: true, isPrivate: false, durationMinutes: 120, guideName: "Léa", licensedGuide: false, languages: ["en", "fr"], tags: ["art", "walking", "free tour"] },
    { key: "paris-louvre-private", city: "Paris", title: "Private Louvre masterpieces with a guide-conférencier", description: "Two hours on the essentials, led by a state-licensed Paris guide. Great with kids.", imageUrl: img("1499856871958-5b9627545d1a"), rating: 4.93, reviewCount: 411, priceFrom: 180, isFree: false, isPrivate: true, durationMinutes: 120, guideName: "Antoine", licensedGuide: true, languages: ["en", "fr", "de"], tags: ["art", "private", "kids"] },
    { key: "cdmx-tacos", city: "Mexico City", title: "Street tacos & mezcal in Roma Norte", description: "Al pastor, suadero and a mezcal tasting, with a chef who grew up in the neighbourhood.", imageUrl: img("1518105779142-d975f22f1b0a"), rating: 4.97, reviewCount: 1780, priceFrom: 65, isFree: false, isPrivate: false, durationMinutes: 240, guideName: "Diego", licensedGuide: false, languages: ["en", "es"], tags: ["food", "drinks", "small group"] },
    { key: "cdmx-teotihuacan", city: "Mexico City", title: "Teotihuacan at sunrise, private with an archaeology guide", description: "Beat the crowds to the Pyramid of the Sun with a SECTUR-licensed guide.", imageUrl: img("1512813195386-6cf811ad3542"), rating: 4.95, reviewCount: 530, priceFrom: 140, isFree: false, isPrivate: true, durationMinutes: 420, guideName: "Valeria", licensedGuide: true, languages: ["en", "es"], tags: ["history", "archaeology", "private", "day trip"] },
    { key: "london-blue-badge", city: "London", title: "Westminster to St Paul's with a Blue Badge guide", description: "Royal London, Parliament and the City in one walk, led by a Blue Badge Tourist Guide.", imageUrl: img("1513635269975-59663e0ac1ad"), rating: 4.91, reviewCount: 702, priceFrom: 45, isFree: false, isPrivate: false, durationMinutes: 180, guideName: "Harriet", licensedGuide: true, languages: ["en"], tags: ["history", "walking", "small group"] },
    { key: "barcelona-gaudi", city: "Barcelona", title: "Gaudí in a day: Sagrada Família & Park Güell", description: "Priority entry to both icons with a licensed Catalan guide. Limited walking option available.", imageUrl: img("1583422409516-2895a77efded"), rating: 4.9, reviewCount: 980, priceFrom: 110, isFree: false, isPrivate: false, durationMinutes: 330, guideName: "Núria", licensedGuide: true, languages: ["en", "es", "ca"], tags: ["architecture", "art", "small group"] },
    { key: "kyoto-temples", city: "Kyoto", title: "Kyoto temples & tea ceremony, private", description: "Fushimi Inari at dawn, a Gion stroll and a tea ceremony with a licensed guide.", imageUrl: img("1528127269322-539801943592"), rating: 4.98, reviewCount: 317, priceFrom: 230, isFree: false, isPrivate: true, durationMinutes: 420, guideName: "Haruto", licensedGuide: true, languages: ["en", "ja"], tags: ["culture", "private", "tea"] },
  ];

  const TOURS = SEEDS.map(({ key, ...s }) => ({
    ...s,
    id: `demo:${key}`,
    providerId: "demo",
    providerName: "Sample",
    currency: "USD",
    isDemo: true,
    bookingUrl: "https://example.com/sample-tour",
  }));

  const KNOWN_CITIES = ["Rome", "Lisbon", "Tokyo", "Paris", "Mexico City", "London", "Barcelona", "Kyoto"];

  // Landmarks and neighbourhoods that imply a city.
  const CITY_ALIASES = {
    rome: "Rome", roma: "Rome", vatican: "Rome", colosseum: "Rome", trastevere: "Rome",
    lisbon: "Lisbon", lisboa: "Lisbon", sintra: "Lisbon", alfama: "Lisbon",
    tokyo: "Tokyo", shinjuku: "Tokyo", shibuya: "Tokyo",
    paris: "Paris", louvre: "Paris", montmartre: "Paris",
    "mexico city": "Mexico City", cdmx: "Mexico City", teotihuacan: "Mexico City",
    london: "London", westminster: "London",
    barcelona: "Barcelona", gaudi: "Barcelona", "gaudí": "Barcelona", sagrada: "Barcelona",
    kyoto: "Kyoto", "fushimi inari": "Kyoto", gion: "Kyoto",
  };

  const COUNTRY = {
    Rome: "Italy", Lisbon: "Portugal", Tokyo: "Japan", Paris: "France", "Mexico City": "Mexico",
    London: "United Kingdom", Barcelona: "Spain", Kyoto: "Japan",
  };

  const LINK_PROVIDERS = [
    { providerId: "toursbylocals", providerName: "ToursByLocals", build: (q) => `https://www.toursbylocals.com/tours?q=${q}`, blurb: "Private tours with vetted local guides, many licensed." },
    { providerId: "withlocals", providerName: "Withlocals", build: (q) => `https://www.withlocals.com/search/?q=${q}`, blurb: "Personal, private experiences hosted by locals." },
    { providerId: "showaround", providerName: "Showaround", build: (q) => `https://www.showaround.com/search?q=${q}`, blurb: "Message local guides directly and plan a custom day." },
  ];

  const PROVIDERS = [
    { providerId: "guruwalk", providerName: "GuruWalk", mode: "api", enabled: false },
    { providerId: "viator", providerName: "Viator", mode: "api", enabled: false },
    { providerId: "toursbylocals", providerName: "ToursByLocals", mode: "link", enabled: true },
    { providerId: "withlocals", providerName: "Withlocals", mode: "link", enabled: true },
    { providerId: "showaround", providerName: "Showaround", mode: "link", enabled: true },
    { providerId: "demo", providerName: "Sample catalog", mode: "demo", enabled: true },
  ];

  // Fictional house ads so sponsored placements show up before any advertiser signs up.
  const HOUSE_ADS = [
    { campaignId: "house_rome", destinations: ["rome"], advertiser: "Tevere Bikes (sample)", headline: "E-bike the Appian Way at your own pace", body: "Half-day rentals with a route map, helmet and lock. Pick up near Circo Massimo.", imageUrl: img("1552832230-c0197dd311b5", 400), ctaLabel: "See bikes", url: "https://example.com/" },
    { campaignId: "house_lisbon", destinations: ["lisbon"], advertiser: "Azulejo Studio (sample)", headline: "Paint your own Lisbon tile", body: "Two-hour workshop in Alfama. Your tile is fired and ready to fly home with you.", imageUrl: img("1585208798174-6cedd86e019a", 400), ctaLabel: "Book a seat", url: "https://example.com/" },
    { campaignId: "house_tokyo", destinations: ["tokyo", "kyoto"], advertiser: "Kissa Koen (sample)", headline: "Tokyo's quietest coffee, since 1968", body: "Hand-drip coffee and thick toast, five minutes from Shinjuku station.", imageUrl: img("1493976040374-85c8e12f0c0e", 400), ctaLabel: "Get directions", url: "https://example.com/" },
    { campaignId: "house_paris", destinations: ["paris"], advertiser: "Seine Supper Club (sample)", headline: "Dinner on the Seine, no tourist menu", body: "Four courses from a bistro chef on a 30-seat boat. Sunset departures.", imageUrl: img("1499856871958-5b9627545d1a", 400), ctaLabel: "See menu", url: "https://example.com/" },
    { campaignId: "house_cdmx", destinations: ["mexico city"], advertiser: "Casa Maíz (sample)", headline: "Make tortillas from scratch in Coyoacán", body: "Nixtamal to comal in three hours, then lunch together in the courtyard.", imageUrl: img("1518105779142-d975f22f1b0a", 400), ctaLabel: "Learn more", url: "https://example.com/" },
  ];

  const IDEAS = [
    "Private Vatican tour with a licensed guide for 4 adults, one uses a wheelchair",
    "Tokyo street food at night, small group, under $150",
    "Free walking tour in Lisbon this weekend in Spanish",
    "Day trip to Teotihuacan from Mexico City with an archaeologist",
  ];

  const CATEGORIES = [
    { label: "Licensed", icon: "shield-checkmark-outline", draft: "A licensed guide for " },
    { label: "Private", icon: "person-outline", draft: "A private tour in " },
    { label: "Food", icon: "restaurant-outline", draft: "A food tour in " },
    { label: "History", icon: "library-outline", draft: "A history tour with an expert guide in " },
    { label: "Free walks", icon: "walk-outline", draft: "A free walking tour in " },
    { label: "Family", icon: "happy-outline", draft: "A kid-friendly tour in " },
    { label: "Nightlife", icon: "moon-outline", draft: "A nightlife tour in " },
  ];

  const DESTINATIONS = [
    { city: "Rome", image: img("1552832230-c0197dd311b5", 600) },
    { city: "Tokyo", image: img("1540959733332-eab4deabeeaf", 600) },
    { city: "Lisbon", image: img("1555881400-74d7acaacd8b", 600) },
    { city: "Paris", image: img("1502602898657-3e91760cbb34", 600) },
    { city: "Mexico City", image: img("1518105779142-d975f22f1b0a", 600) },
    { city: "Kyoto", image: img("1528127269322-539801943592", 600) },
  ];

  const ADD_ONS = [
    "with a licensed guide",
    "private",
    "for 2 adults",
    "under $100 each",
    "this weekend",
    "kid-friendly",
    "in Spanish",
    "wheelchair accessible",
  ];

  // --- Advertisers --------------------------------------------------------------

  const AD_CATEGORY_LABEL = {
    attractions: "Attractions",
    tours: "Tours & activities",
    food_drink: "Food & drink",
    transport: "Transport",
    accommodation: "Accommodation",
    events: "Events",
    shopping: "Shopping",
    services: "Travel services",
  };

  const AD_CATEGORY_ICON = {
    attractions: "ticket-outline",
    tours: "walk-outline",
    food_drink: "restaurant-outline",
    transport: "train-outline",
    accommodation: "bed-outline",
    events: "musical-notes-outline",
    shopping: "bag-handle-outline",
    services: "briefcase-outline",
  };

  const AD_INTERESTS = ["history", "food", "art", "architecture", "nightlife", "family", "outdoors", "wine", "photography", "shopping"];

  const ADVERTISER_CONFIG = { billingEnabled: false, currency: "USD", cpcCents: 60, minBudgetCents: 2000, termsVersion: "2026-09-25" };

  // --- Partner protocol -----------------------------------------------------------

  const PROTOCOL_VERSION = "2026-09-01";

  const SAMPLE_INTENT = {
    destination: "Rome",
    country: "Italy",
    startDate: "2026-10-14",
    endDate: "2026-10-16",
    groupSize: 4,
    budgetPerPerson: 150,
    currency: "EUR",
    interests: ["history", "food"],
    tourStyle: "private",
    licensedOnly: true,
    languages: ["en"],
    maxDurationHours: 4,
    accessibilityNeeds: ["wheelchair"],
    headline: "Private licensed history tour in Rome for 4",
    followUpQuestion: null,
  };

  const SAMPLE_RESPONSE = {
    tours: [
      {
        id: "rome-vatican-private-001",
        title: "Private Vatican Museums with a licensed art historian",
        description: "Early entry, step-free route, just your group.",
        bookingUrl: "https://example-tours.com/t/rome-vatican-private-001?utm_source=tourmatch",
        imageUrl: "https://example-tours.com/img/vatican.jpg",
        rating: 4.9,
        reviewCount: 356,
        priceFrom: 145,
        currency: "EUR",
        isPrivate: true,
        durationMinutes: 180,
        city: "Rome",
        guideName: "Francesca",
        licensedGuide: true,
        languages: ["en", "it"],
        tags: ["history", "art", "wheelchair"],
      },
    ],
  };

  const PARTNER_TOUR_FIELDS = [
    { name: "id", type: "string", required: true, description: "Your stable ID for this tour." },
    { name: "title", type: "string", required: true },
    { name: "description", type: "string" },
    { name: "bookingUrl", type: "string", required: true, description: "Where the traveller books. Include your own tracking params." },
    { name: "imageUrl", type: "string | null" },
    { name: "rating", type: "number | null", description: "Average rating out of 5." },
    { name: "reviewCount", type: "integer" },
    { name: "priceFrom", type: "number | null", description: "Lowest per-person price." },
    { name: "currency", type: "string", description: "ISO 4217 code." },
    { name: "isFree", type: "boolean", description: "Tip-based / free tour." },
    { name: "isPrivate", type: "boolean | null" },
    { name: "durationMinutes", type: "integer | null" },
    { name: "city", type: "string | null" },
    { name: "guideName", type: "string | null" },
    { name: "licensedGuide", type: "boolean | null", description: "Only true if the guide holds a license you can evidence on request." },
    { name: "languages", type: "array", description: "ISO 639-1 codes." },
    { name: "tags", type: "array" },
  ];

  const PARTNER_SPEC = {
    name: "TourMatch Partner Protocol",
    version: PROTOCOL_VERSION,
    transport: {
      method: "POST",
      contentType: "application/json",
      timeoutMs: 5000,
      maxTours: 50,
      redirects: "not followed",
      urlRequirements: "https only, public internet address",
    },
    headers: {
      "X-TourMatch-Partner-Id": "Your partner ID.",
      "X-TourMatch-Timestamp": "Unix seconds when we sent the request.",
      "X-TourMatch-Signature": "sha256=<hex HMAC-SHA256 of `${timestamp}.${rawBody}` using your secret>",
      "X-TourMatch-Request-Id": "Unique per request; log it for support.",
    },
    signature: {
      algorithm: "HMAC-SHA256",
      signedPayload: "`${X-TourMatch-Timestamp}.${raw request body}`",
      toleranceSeconds: 300,
      note: "Verify against the raw bytes before parsing JSON, and compare in constant time.",
    },
    requestExample: { version: PROTOCOL_VERSION, requestId: "req_7f3c2a9e", intent: SAMPLE_INTENT, limit: 20 },
    responseExample: SAMPLE_RESPONSE,
    tourFields: PARTNER_TOUR_FIELDS,
    rules: [
      "Return only tours that are bookable for the request; an empty list is a valid answer.",
      "Respond within the timeout. Slow or failing endpoints are skipped for that search.",
      "licensedGuide: true must be verifiable. We audit, and misuse leads to suspension.",
      "bookingUrl is where the traveller goes to book. Add your own tracking parameters.",
    ],
  };

  const NODE_SAMPLE = `import crypto from "node:crypto";
import express from "express";

const SECRET = process.env.TOURMATCH_SECRET;
const app = express();

// Keep the raw body: the signature covers the exact bytes we sent.
app.post("/tourmatch/search", express.text({ type: "application/json" }), (req, res) => {
  const ts = req.get("X-TourMatch-Timestamp") ?? "";
  const sig = req.get("X-TourMatch-Signature") ?? "";
  const expected = "sha256=" +
    crypto.createHmac("sha256", SECRET).update(\`\${ts}.\${req.body}\`).digest("hex");

  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300;
  const valid = sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!fresh || !valid) return res.sendStatus(401);

  const { intent, limit } = JSON.parse(req.body);
  const tours = findTours(intent).slice(0, limit); // <- your inventory / booking API

  res.json({
    tours: tours.map((t) => ({
      id: t.sku,
      title: t.name,
      description: t.summary,
      bookingUrl: \`https://yourdomain.com/book/\${t.sku}?utm_source=tourmatch\`,
      priceFrom: t.price,
      currency: t.currency,
      durationMinutes: t.minutes,
      isPrivate: t.private,
      city: t.city,
      licensedGuide: t.guideLicensed,
      languages: t.languages,
    })),
  });
});

app.listen(8790);`;

  const PYTHON_SAMPLE = `import hashlib, hmac, json, os, time
from flask import Flask, abort, jsonify, request

SECRET = os.environ["TOURMATCH_SECRET"].encode()
app = Flask(__name__)

@app.post("/tourmatch/search")
def search():
    ts = request.headers.get("X-TourMatch-Timestamp", "")
    sig = request.headers.get("X-TourMatch-Signature", "")
    body = request.get_data()  # raw bytes, before JSON parsing
    expected = "sha256=" + hmac.new(SECRET, ts.encode() + b"." + body, hashlib.sha256).hexdigest()

    if not ts.isdigit() or abs(time.time() - int(ts)) > 300:
        abort(401)
    if not hmac.compare_digest(expected, sig):
        abort(401)

    req = json.loads(body)
    tours = find_tours(req["intent"])[: req["limit"]]  # <- your inventory / booking API
    return jsonify({"tours": [
        {
            "id": t.sku,
            "title": t.name,
            "description": t.summary,
            "bookingUrl": f"https://yourdomain.com/book/{t.sku}?utm_source=tourmatch",
            "priceFrom": t.price,
            "currency": t.currency,
            "durationMinutes": t.minutes,
            "isPrivate": t.private,
            "city": t.city,
            "licensedGuide": t.guide_licensed,
            "languages": t.languages,
        }
        for t in tours
    ]})`;

  const CURL_SAMPLE = `# Reproduce a signed request against your own endpoint
SECRET=tmsk_your_secret
BODY='{"version":"2026-09-01","requestId":"req_test","intent":{"destination":"Rome"},"limit":5}'
TS=$(date +%s)
SIG="sha256=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')

curl -X POST https://yourdomain.com/tourmatch/search \\
  -H "Content-Type: application/json" \\
  -H "X-TourMatch-Timestamp: $TS" \\
  -H "X-TourMatch-Signature: $SIG" \\
  -d "$BODY"`;

  const SUPPORT_TOPICS = {
    traveler: ["Search results", "A tour or booking", "Saved tours", "Report a listing", "Privacy & data", "Something else"],
    advertiser: ["Account & sign-in", "Billing & refunds", "Ad review", "Ad performance", "Targeting", "Something else"],
    partner: ["Integration & API", "Test console", "Approval status", "Listings & licensing", "Payments & tracking", "Something else"],
  };

  window.TM_DATA = {
    TOURS,
    KNOWN_CITIES,
    CITY_ALIASES,
    COUNTRY,
    LINK_PROVIDERS,
    PROVIDERS,
    HOUSE_ADS,
    IDEAS,
    CATEGORIES,
    DESTINATIONS,
    ADD_ONS,
    AD_CATEGORY_LABEL,
    AD_CATEGORY_ICON,
    AD_INTERESTS,
    ADVERTISER_CONFIG,
    PARTNER_SPEC,
    NODE_SAMPLE,
    PYTHON_SAMPLE,
    CURL_SAMPLE,
    SUPPORT_TOPICS,
  };
})();
