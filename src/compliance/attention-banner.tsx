import { StyleSheet, Text, View } from "react-native";

import { formatMelbourneDate } from "@/format/time";
import {
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { expiryAttentionOf, formatDaysLabel } from "./expiry-text";
import {
  DOC_TYPE_NAMES,
  type ComplianceSummary,
  type DocumentCard,
} from "./types";

const BLOCKED_NOTE = "to avoid being blocked from new orders.";

function isRed(card: DocumentCard): boolean {
  const kind = expiryAttentionOf(card.attention)?.kind;
  return (
    kind === "urgent" ||
    kind === "expired" ||
    card.attention.kind === "rejected"
  );
}

function countTitle(count: number): string {
  return count === 1
    ? "1 document needs attention"
    : `${count} documents need attention`;
}

// La frase del documento más urgente. Las fechas son de Melbourne.
function messageFor(card: DocumentCard): string {
  const name = DOC_TYPE_NAMES[card.docType];
  const expiry = expiryAttentionOf(card.attention);
  const expiryDate = (card.current ?? card.latest).expiryDate;
  if (expiry?.kind === "expired") {
    return `${name} has expired. Upload a renewed document to take new orders again.`;
  }
  if (expiry && expiry.kind !== "valid") {
    const when =
      expiry.days === 0
        ? "expires today"
        : `expires in ${formatDaysLabel(expiry.days)}`;
    return `${name} ${when}. Renew before ${formatMelbourneDate(expiryDate)} ${BLOCKED_NOTE}`;
  }
  return `${name} was rejected. Upload it again.`;
}

export function AttentionBanner({
  summary,
}: {
  summary: ComplianceSummary;
}): React.JSX.Element | null {
  const { mostUrgent } = summary;
  if (!mostUrgent) return null;
  const tone = semantic[isRed(mostUrgent) ? "danger" : "warning"];
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        { backgroundColor: tone.background, borderColor: tone.accent },
      ]}
      testID="attention-banner"
    >
      <Text style={[styles.title, { color: tone.text }]}>
        {countTitle(summary.attentionCount)}
      </Text>
      <Text style={[styles.message, { color: tone.text }]}>
        {messageFor(mostUrgent)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
  },
});
