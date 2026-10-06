import type { Audience } from "../types";

/**
 * Terms of service for each type of user.
 *
 * These are working drafts, not legal advice. Have counsel review them, fill in the
 * [bracketed] placeholders, then set LEGAL_REVIEWED = true to remove the in-app notice.
 * When you change a document, bump its version here AND in server/src/legal.ts so
 * accounts are asked to accept the new version.
 */
export const LEGAL_REVIEWED = false;

export const COMPANY = {
  name: "[TourMatch, Inc.]",
  address: "[Registered address]",
  email: "[legal@tourmatch.example]",
  law: "[the State of Delaware, USA]",
};

export interface TermsDoc {
  audience: Audience;
  version: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string[] }[];
}

const shared = {
  changes: {
    heading: "Changes to these terms",
    body: [
      "We may update these terms. If a change is material we'll tell you in the app or by email before it takes effect. Continuing to use the service after that date means you accept the updated terms.",
    ],
  },
  law: {
    heading: "Governing law & disputes",
    body: [
      `These terms are governed by the laws of ${COMPANY.law}, without regard to conflict-of-law rules. Where the law allows, disputes will be resolved in the courts of that jurisdiction. Nothing here limits rights you have under the consumer protection laws of where you live.`,
    ],
  },
  contact: {
    heading: "Contact",
    body: [`${COMPANY.name}, ${COMPANY.address}. Email ${COMPANY.email}, or use the Support page in the app.`],
  },
};

export const TERMS: Record<Audience, TermsDoc> = {
  traveler: {
    audience: "traveler",
    version: "2026-09-25",
    title: "Terms of Service for Travellers",
    summary:
      "TourMatch helps you find tours run by other companies. We don't run tours or take bookings. You book directly with the provider, on their terms.",
    sections: [
      {
        heading: "What TourMatch is",
        body: [
          `TourMatch is a search and discovery service operated by ${COMPANY.name}. You describe the trip you want; we use automated tools, including AI, to interpret your request and show tours from third-party providers ("Providers") such as tour marketplaces and tour companies.`,
          "We are not a tour operator, travel agent or booking platform. We are not a party to any booking you make.",
        ],
      },
      {
        heading: "Bookings are with the Provider",
        body: [
          "When you tap through to book, you leave TourMatch and deal with the Provider directly. Prices, availability, cancellation, refunds, safety, insurance and the tour itself are the Provider's responsibility and are governed by the Provider's own terms.",
          "Please read the Provider's terms before you book. Questions about a booking should go to the Provider.",
        ],
      },
      {
        heading: "Listings, AI matching and licensing",
        body: [
          "Listing details come from Providers and may be incomplete, out of date or wrong. Match scores and explanations are generated automatically. They're suggestions, not recommendations or guarantees.",
          'A "Licensed guide" badge means the Provider told us the guide holds a relevant licence. We don\'t independently verify every licence. If licensing matters to you, confirm it with the Provider before booking.',
        ],
      },
      {
        heading: "Sponsored content",
        body: [
          'Some placements are paid for by advertisers and are always labelled "Sponsored". Sponsored placements never change the order of regular search results.',
        ],
      },
      {
        heading: "Using TourMatch",
        body: [
          "You must be at least 16, or the age of digital consent where you live. Don't misuse the service: no scraping, automated querying, reverse engineering, attempts to disrupt it, or submitting unlawful or abusive content.",
          "What you type into search is processed to find tours and to improve the service, as described in our Privacy Policy. Don't include sensitive personal information you don't want processed.",
        ],
      },
      {
        heading: "Saved tours and your content",
        body: [
          "Saved tours and recent searches are stored on your device. If you clear the app's data or change devices, they may be lost.",
        ],
      },
      {
        heading: "Disclaimers & liability",
        body: [
          'TourMatch is provided "as is". To the fullest extent the law allows, we disclaim all warranties about listings and Providers, and we\'re not liable for any tour, booking, injury, loss or dispute with a Provider.',
          "Where liability can't be excluded, our total liability to you is limited to USD $100. Nothing in these terms excludes liability that can't legally be excluded, such as for fraud or death or personal injury caused by negligence.",
        ],
      },
      shared.changes,
      shared.law,
      shared.contact,
    ],
  },

  advertiser: {
    audience: "advertiser",
    version: "2026-09-25",
    title: "Advertiser Terms",
    summary:
      "You prepay a budget, we show your ads to matching searches and charge per click against that budget. Ads are reviewed, labelled as sponsored, and must be truthful.",
    sections: [
      {
        heading: "Agreement",
        body: [
          `These Advertiser Terms are between ${COMPANY.name} ("we") and the business that creates an advertiser account ("you"). By creating an account you confirm you're authorised to bind that business.`,
        ],
      },
      {
        heading: "Your account",
        body: [
          "Keep your login details secure. You're responsible for all activity under your account. Tell us promptly through Support if you suspect unauthorised use.",
        ],
      },
      {
        heading: "Ads, targeting and placement",
        body: [
          'Ads appear as clearly labelled "Sponsored" placements in search results that match your chosen destinations and interests. We decide placement, frequency and rotation, and sponsored placements never alter organic results.',
          "We don't guarantee any number of impressions, clicks or bookings.",
        ],
      },
      {
        heading: "Review and content standards",
        body: [
          "Every new ad, and every change to an ad's text, image, link or category, is reviewed before it runs. We may reject, pause or remove any ad at any time.",
          "Ads must be accurate and lawful and must not: make licensing, safety, accreditation or pricing claims you can't substantiate on request; impersonate another business; infringe intellectual property; link to malware, deceptive or unsafe pages; or promote illegal, adult, weapons, tobacco, gambling or other restricted products.",
          "You grant us a non-exclusive licence to display, resize and format your ad content to run your campaigns.",
        ],
      },
      {
        heading: "Budgets, pricing and payment",
        body: [
          "Campaigns are prepaid. When you submit or re-enable an ad, the budget you set is charged to your card on file. Each valid click deducts the current per-click price from that budget. Your ad ends automatically when its budget is used up or its end date passes.",
          "Card payments are processed by our payment provider, Stripe. By adding a card you authorise us to charge it for budgets you submit. Prices exclude taxes, which you're responsible for.",
          "We filter clicks we believe are invalid, such as automated or repeated clicks, and don't charge for them.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "If we reject an ad, or you end an ad early, we refund the unspent budget to the original card. Spent budget is non-refundable except for invalid clicks we identify or as required by law. Refunds usually arrive in 5–10 business days depending on your bank.",
        ],
      },
      {
        heading: "Reporting",
        body: [
          "We report impressions, clicks and spend per ad. Our measurements are final for billing purposes. We don't provide data identifying individual travellers.",
        ],
      },
      {
        heading: "Suspension and termination",
        body: [
          "You can end ads or stop advertising at any time. We may suspend or close accounts that breach these terms, harm travellers or harm our service. Unspent budget is refunded unless the account was closed for fraud.",
        ],
      },
      {
        heading: "Indemnity & liability",
        body: [
          "You're responsible for your ads and the pages they link to, and you'll indemnify us against third-party claims arising from them.",
          "To the fullest extent the law allows, neither party is liable for indirect or consequential losses, and our total liability is limited to the amounts you paid us in the 12 months before the claim.",
        ],
      },
      shared.changes,
      shared.law,
      shared.contact,
    ],
  },

  partner: {
    audience: "partner",
    version: "2026-09-25",
    title: "Partner Terms for Tour Providers",
    summary:
      "You connect your inventory through our Partner Protocol. We show your tours in matching searches and send travellers to your booking pages. Your listings must be accurate, and licence claims must be provable.",
    sections: [
      {
        heading: "Agreement",
        body: [
          `These Partner Terms are between ${COMPANY.name} ("we") and the tour company or guide that registers a partner endpoint ("you"). By registering you confirm you're authorised to bind that business.`,
        ],
      },
      {
        heading: "The integration",
        body: [
          "We send signed search requests to your registered HTTPS endpoint, and you return tours in the format described in the Partner Toolkit. You'll keep your signing secret confidential, verify our signatures, and respond within the documented time limits.",
          "We may change the protocol with reasonable notice. Breaking changes will get a new protocol version and at least 90 days' notice, except where needed for security.",
        ],
      },
      {
        heading: "Approval and listing",
        body: [
          "New partners are reviewed before their tours are shown to travellers. We may decline, suspend or remove a partner or individual listings at any time, including for inaccurate data, poor traveller experience or unreliable endpoints.",
          "We decide how results are ranked. Ranking is based on how well tours match each traveller's request. Being a partner doesn't guarantee placement.",
        ],
      },
      {
        heading: "Accuracy and licensing",
        body: [
          "Listings must be accurate and current, including prices, availability, duration, accessibility and inclusions.",
          "Only mark a guide as licensed (licensedGuide: true) if the guide holds a valid licence or certification required or recognised where the tour runs. You must provide evidence within 10 business days if we ask. False licensing claims are grounds for immediate suspension.",
          "You're responsible for holding all licences, permits and insurance required to operate your tours.",
        ],
      },
      {
        heading: "Bookings and travellers",
        body: [
          "Travellers book directly with you via your bookingUrl. You're the seller and operator of record. You're responsible for pricing, payment, cancellation, refunds, customer service, safety and the tour itself, under your own terms, which must be available to travellers before they book.",
        ],
      },
      {
        heading: "Fees",
        body: [
          "Listing through the Partner Protocol is currently free. We may introduce fees, such as a referral commission, with at least 30 days' notice. You can leave before any fee applies.",
        ],
      },
      {
        heading: "Data",
        body: [
          "The search requests we send contain trip details, not personal information identifying travellers. Use them only to answer the request. Don't store them for other purposes or try to identify travellers.",
          "You grant us a non-exclusive licence to display your listing content, including titles, descriptions, images and ratings, in TourMatch.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Keep your endpoint secure and your secret confidential. Rotate your secret if you suspect it's exposed, and tell us through Support. We may suspend an endpoint that appears compromised.",
        ],
      },
      {
        heading: "Termination & liability",
        body: [
          "Either party may end this agreement at any time. Contact Support to close your partner account.",
          "You'll indemnify us against claims arising from your tours, listings or bookings. To the fullest extent the law allows, neither party is liable for indirect or consequential losses, and our total liability is limited to USD $500.",
        ],
      },
      shared.changes,
      shared.law,
      shared.contact,
    ],
  },
};

export const AUDIENCE_LABEL: Record<Audience, string> = {
  traveler: "Travellers",
  advertiser: "Advertisers",
  partner: "Tour providers",
};
