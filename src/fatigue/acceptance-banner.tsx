import { StyleSheet, Text, View } from "react-native";

import {
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { ACCEPTANCE_BLOCK_MESSAGES } from "./order-acceptance";
import type { OrderAcceptance } from "./order-acceptance";

type AcceptanceBannerProps = {
  acceptance: OrderAcceptance;
};

// Sin aviso dentro de horas ni sin datos: "unknown" no es un bloqueo.
// Se anuncia solo cuando aparece o cambia: el conductor no tocó nada.
export function AcceptanceBanner({
  acceptance,
}: AcceptanceBannerProps): React.JSX.Element | null {
  if (acceptance.kind !== "blocked") return null;
  return (
    <View
      testID="acceptance-banner"
      accessibilityLiveRegion="polite"
      style={styles.box}
    >
      <Text style={styles.title}>You can&apos;t accept new orders</Text>
      {acceptance.reasons.map((reason) => (
        <Text key={reason} style={styles.reason}>
          {ACCEPTANCE_BLOCK_MESSAGES[reason]}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderLeftWidth: spacing.xs,
    borderLeftColor: semantic.danger.accent,
    backgroundColor: semantic.danger.background,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
  },
  reason: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
  },
});
