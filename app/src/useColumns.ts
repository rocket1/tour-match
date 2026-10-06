import { useWindowDimensions } from "react-native";

/** One column on phones, a grid on tablets and web. */
export function useColumns() {
  const { width } = useWindowDimensions();
  return width >= 1100 ? 3 : width >= 700 ? 2 : 1;
}
