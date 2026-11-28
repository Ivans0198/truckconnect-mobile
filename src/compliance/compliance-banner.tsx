import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { expiryAttentionOf, formatDaysLabel, isRedCard } from "./expiry-text";
import { ComplianceIcon } from "./icons";
import { useComplianceAttention } from "./queries";
import { DOC_TYPE_NAMES, type DocumentCard } from "./types";

const ICON_SIZE = 20;
const CIRCLE_SIZE = 36;
const BANNER_MIN_HEIGHT = 60;

// La frase del documento más urgente.
function messageFor(card: DocumentCard): string {
  const name = DOC_TYPE_NAMES[card.docType];
  const expiry = expiryAttentionOf(card.attention);
  if (card.attention.kind === "under-review") {
    return `${name} renewal under review. You can't accept new orders until it's approved.`;
  }
  if (expiry?.kind === "expired") {
    return `${name} has expired. Upload a renewed document to take new orders again.`;
  }
  if (expiry && expiry.kind !== "valid") {
    const when =
      expiry.days === 0
        ? "expires today"
        : `expires in ${formatDaysLabel(expiry.days)}`;
    return `${name} ${when}. Renew now to avoid being blocked from new orders.`;
  }
  return `${name} was rejected. Upload it again.`;
}

// El aviso de Home. Sin documentos que pidan atención, o si la lectura falló,
// no dibuja nada: Home funciona igual.
export function ComplianceBanner(): React.JSX.Element | null {
  const summary = useComplianceAttention();
  const mostUrgent = summary?.mostUrgent;
  if (!summary || !mostUrgent) return null;
  const tone = semantic[isRedCard(mostUrgent) ? "danger" : "warning"];
  const others = summary.attentionCount - 1;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate("/docs")}
      style={[
        styles.banner,
        { backgroundColor: tone.background, borderColor: tone.accent },
      ]}
      testID="compliance-banner"
    >
      <View style={[styles.circle, { backgroundColor: tone.accent }]}>
        <ComplianceIcon
          name="alert"
          color={colors.onPrimary}
          size={ICON_SIZE}
        />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.message, { color: tone.text }]}>
          {messageFor(mostUrgent)}
        </Text>
        {others > 0 ? (
          <Text style={[styles.more, { color: tone.text }]}>
            {`and ${others} more`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minHeight: BANNER_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  texts: { flex: 1, gap: spacing.xs },
  message: { fontFamily: fontFamily.semibold, fontSize: fontSize.body },
  more: { fontFamily: fontFamily.regular, fontSize: fontSize.body },
});
