import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, radius, space } from "../theme";

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity, marginBottom: space(8) }}>
      <View style={styles.image} />
      <View style={[styles.line, { width: "80%", marginTop: space(3) }]} />
      <View style={[styles.line, { width: "45%" }]} />
      <View style={[styles.line, { width: "30%" }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: { aspectRatio: 1.05, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  line: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceAlt, marginTop: space(2) },
});
