import type { SearchIntent, Tour } from "../types.js";
import type { ApiProvider } from "./types.js";

// Fictional sample listings so the app works before any provider keys are configured.
// Every tour is flagged isDemo and shown with a "Sample" badge in the app.
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=70&auto=format&fit=crop`;

type Seed = Omit<Tour, "id" | "providerId" | "providerName" | "currency" | "isDemo" | "bookingUrl"> & { key: string };

const SEEDS: Seed[] = [
  { key: "rome-colosseum", city: "Rome", title: "Colosseum & Roman Forum with an archaeologist", description: "Skip-the-line entry and three hours through the Colosseum, Forum and Palatine Hill with a licensed guide who has excavated on site.", imageUrl: img("1552832230-c0197dd311b5"), rating: 4.97, reviewCount: 812, priceFrom: 89, isFree: false, isPrivate: false, durationMinutes: 180, guideName: "Giulia", licensedGuide: true, languages: ["en", "it"], tags: ["history", "archaeology", "small group"] },
  { key: "rome-trastevere-food", city: "Rome", title: "Trastevere food crawl: supplì, carbonara & gelato", description: "Eight tastings across family-run trattorie in Trastevere. Vegetarian options on request.", imageUrl: img("1515542622106-78bda8ba0e5b"), rating: 4.92, reviewCount: 1403, priceFrom: 75, isFree: false, isPrivate: false, durationMinutes: 210, guideName: "Marco", licensedGuide: false, languages: ["en"], tags: ["food", "evening", "small group"] },
  { key: "rome-vatican-private", city: "Rome", title: "Private Vatican Museums & Sistine Chapel", description: "Early entry with a licensed art historian, just your party. Wheelchair-accessible route available.", imageUrl: img("1531572753322-ad063cecc140"), rating: 4.95, reviewCount: 356, priceFrom: 210, isFree: false, isPrivate: true, durationMinutes: 180, guideName: "Francesca", licensedGuide: true, languages: ["en", "es", "it"], tags: ["art", "history", "private", "wheelchair"] },
  { key: "lisbon-alfama", city: "Lisbon", title: "Alfama & Mouraria: fado, tiles and hidden miradouros", description: "A walking story of Lisbon's oldest quarters, ending with a glass of ginjinha.", imageUrl: img("1555881400-74d7acaacd8b"), rating: 4.9, reviewCount: 640, priceFrom: 0, isFree: true, isPrivate: false, durationMinutes: 150, guideName: "Rita", licensedGuide: true, languages: ["en", "pt"], tags: ["walking", "history", "music"] },
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

const DEMO_TOURS: Tour[] = SEEDS.map(({ key, ...s }) => ({
  ...s,
  id: `demo:${key}`,
  providerId: "demo",
  providerName: "Sample",
  currency: "USD",
  isDemo: true,
  bookingUrl: "https://example.com/sample-tour",
}));

export const demo: ApiProvider = {
  id: "demo",
  name: "Sample catalog",
  mode: "demo",
  enabled: () => process.env.DEMO_CATALOG !== "off",

  async search(intent: SearchIntent): Promise<Tour[]> {
    if (!intent.destination) return DEMO_TOURS;
    const dest = intent.destination.toLowerCase();
    return DEMO_TOURS.filter((t) => t.city?.toLowerCase() === dest);
  },
};

export function featuredDemoTours(): Tour[] {
  return DEMO_TOURS;
}
