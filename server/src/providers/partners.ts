import { callPartner } from "../partners/client.js";
import { approvedPartners } from "../partners/registry.js";
import type { ApiProvider } from "./types.js";

/** One ApiProvider per approved tour company connected through the Partner Protocol. */
export async function partnerProviders(): Promise<ApiProvider[]> {
  return (await approvedPartners()).map((partner) => ({
    id: `partner:${partner.id}`,
    name: partner.companyName,
    mode: "api",
    enabled: () => true,
    async search(intent) {
      if (!intent.destination) return [];
      const result = await callPartner(partner, intent);
      if (result.errors.length) throw new Error(result.errors[0]);
      return result.tours;
    },
  }));
}
