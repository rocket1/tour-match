// Current version of each terms document. Bump when the text in app/src/legal/terms.ts changes;
// accounts record which version they accepted.
export const TERMS_VERSIONS = {
  traveler: "2026-09-25",
  advertiser: "2026-09-25",
  partner: "2026-09-25",
} as const;

export type Audience = keyof typeof TERMS_VERSIONS;
export const AUDIENCES = Object.keys(TERMS_VERSIONS) as Audience[];
