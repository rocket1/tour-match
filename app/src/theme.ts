import { Platform } from "react-native";

export const colors = {
  brand: "#FF385C",
  brandDark: "#E31C5F",
  text: "#222222",
  textMuted: "#6A6A6A",
  border: "#DDDDDD",
  hairline: "#EBEBEB",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F7F7",
  success: "#008A05",
  star: "#222222",
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const space = (n: number) => n * 4;

export const shadow = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 4 },
  default: { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
})!;

export const type = {
  display: { fontSize: 26, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.4 },
  title: { fontSize: 22, fontWeight: "600" as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
};
