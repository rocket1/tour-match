import type { ProviderId, ProviderLink, SearchIntent, Tour } from "../types.js";

export interface ApiProvider {
  id: ProviderId;
  name: string;
  mode: "api" | "demo";
  enabled(): boolean;
  search(intent: SearchIntent): Promise<Tour[]>;
}

export interface LinkProvider {
  id: ProviderId;
  name: string;
  mode: "link";
  link(intent: SearchIntent): ProviderLink | null;
}
