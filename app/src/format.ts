import type { SearchIntent, Tour } from "./types";

export function formatPrice(t: Pick<Tour, "isFree" | "priceFrom" | "currency">): string | null {
  if (t.isFree) return "Free · tip-based";
  if (t.priceFrom == null) return null;
  try {
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: t.currency || "USD",
      maximumFractionDigits: 0,
    }).format(t.priceFrom);
    return `From ${amount}`;
  } catch {
    return `From ${Math.round(t.priceFrom)} ${t.currency}`;
  }
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`;
}

const STYLE_LABEL: Record<SearchIntent["tourStyle"], string | null> = {
  private: "Private",
  small_group: "Small group",
  free_walking: "Free walking tour",
  any: null,
};

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Human-readable chips describing what the AI understood. */
export function intentChips(i: SearchIntent): string[] {
  const chips: string[] = [];
  if (i.destination) chips.push(i.destination);
  if (i.startDate)
    chips.push(
      i.endDate && i.endDate !== i.startDate ? `${formatDate(i.startDate)} – ${formatDate(i.endDate)}` : formatDate(i.startDate),
    );
  if (i.groupSize) chips.push(`${i.groupSize} ${i.groupSize === 1 ? "guest" : "guests"}`);
  const style = STYLE_LABEL[i.tourStyle];
  if (style) chips.push(style);
  if (i.licensedOnly) chips.push("Licensed guide");
  if (i.budgetPerPerson) chips.push(`Under ${Math.round(i.budgetPerPerson)} ${i.currency}`);
  if (i.maxDurationHours) chips.push(`≤ ${i.maxDurationHours} hr`);
  chips.push(...i.interests.slice(0, 4));
  chips.push(...i.accessibilityNeeds);
  if (i.languages.length) chips.push(i.languages.map((l) => l.toUpperCase()).join(" / "));
  return chips;
}
