import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, radius, space, type } from "../theme";

/** Back button + title bar used on business screens. */
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={styles.back}
        hitSlop={8}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <Text style={type.bodyStrong} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

export function Field({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space(4) }}>
      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }]}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "dark" | "outline";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const bg = variant === "primary" ? colors.brand : variant === "dark" ? colors.text : "transparent";
  const fg = variant === "outline" ? colors.text : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === "outline" && styles.buttonOutline,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      hitSlop={8}
      onPress={async () => {
        await Clipboard.setStringAsync(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={styles.copy}
    >
      <Ionicons name={copied ? "checkmark" : "copy-outline"} size={14} color={colors.text} />
      <Text style={styles.copyText}>{copied ? "Copied" : label}</Text>
    </Pressable>
  );
}

export function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <View style={styles.code}>
      <View style={styles.codeBar}>
        <Text style={styles.codeTitle}>{title ?? ""}</Text>
        <CopyButton value={code} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText} selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segment, value === o.value && styles.segmentOn]}
        >
          <Text style={[styles.segmentText, value === o.value && { color: colors.text }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const mono = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" });

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingTop: space(2),
    paddingBottom: space(1),
  },
  fieldFocused: { borderColor: colors.text, borderWidth: 2, paddingHorizontal: space(3) - 1, paddingTop: space(2) - 1 },
  fieldError: { borderColor: colors.brandDark },
  label: { fontSize: 12, color: colors.textMuted },
  input: { fontSize: 16, color: colors.text, paddingVertical: 6, outlineStyle: "none" } as object,
  error: { fontSize: 12, color: colors.brandDark, marginTop: 4 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(2),
    paddingHorizontal: space(6),
    minHeight: 50,
    borderRadius: radius.sm,
  },
  buttonOutline: { borderWidth: 1, borderColor: colors.text },
  buttonText: { fontSize: 16, fontWeight: "600" },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space(5) },
  copy: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyText: { fontSize: 12, fontWeight: "600", color: colors.text },
  code: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline },
  codeBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  codeTitle: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  codeText: { fontFamily: mono, fontSize: 12, lineHeight: 18, color: colors.text, padding: space(3) },
  segmented: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3 },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
});
