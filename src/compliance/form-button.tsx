import { Pressable, StyleSheet, Text } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

type FormButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  isBusy?: boolean;
};

export function FormButton({
  label,
  onPress,
  variant = "secondary",
  isBusy = false,
}: FormButtonProps): React.JSX.Element {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: isBusy, disabled: isBusy }}
      disabled={isBusy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        isBusy && styles.busy,
      ]}
    >
      <Text style={[styles.text, isPrimary && styles.primaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    borderWidth: 2,
    borderColor: semantic.info.accent,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  busy: { opacity: 0.6 },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: semantic.info.text,
  },
  primaryText: { color: colors.onPrimary },
});
