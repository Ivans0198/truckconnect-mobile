import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

type SectionErrorProps = {
  message: string;
  onRetry: () => void;
};

// El mensaje se anuncia solo cuando aparece: el conductor no tocó nada.
export function SectionError({
  message,
  onRetry,
}: SectionErrorProps): React.JSX.Element {
  return (
    <View style={styles.box}>
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: semantic.danger.background,
  },
  message: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
  },
  button: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  pressed: { backgroundColor: colors.primaryPressed },
  buttonText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
});
