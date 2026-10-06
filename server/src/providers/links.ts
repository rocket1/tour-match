import type { SearchIntent } from "../types.js";
import type { LinkProvider } from "./types.js";

// These marketplaces have no public search API. We hand the user a pre-filled search
// link instead. Swap in affiliate deep links once you're accepted into their programs.
// NOTE: the query-string formats below are best guesses; verify them per site.

function linkFor(
  id: LinkProvider["id"],
  name: string,
  build: (q: string) => string,
  blurb: string,
): LinkProvider {
  return {
    id,
    name,
    mode: "link",
    link: (intent: SearchIntent) =>
      intent.destination
        ? { providerId: id, providerName: name, url: build(encodeURIComponent(intent.destination)), blurb }
        : null,
  };
}

export const linkProviders: LinkProvider[] = [
  linkFor(
    "toursbylocals",
    "ToursByLocals",
    (q) => `https://www.toursbylocals.com/tours?q=${q}`,
    "Private tours with vetted local guides, many licensed.",
  ),
  linkFor(
    "withlocals",
    "Withlocals",
    (q) => `https://www.withlocals.com/search/?q=${q}`,
    "Personal, private experiences hosted by locals.",
  ),
  linkFor(
    "showaround",
    "Showaround",
    (q) => `https://www.showaround.com/search?q=${q}`,
    "Message local guides directly and plan a custom day.",
  ),
];
