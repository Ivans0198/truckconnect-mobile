import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMelbourneDate, formatTimeLeft } from "@/format/time";
import {
  colors,
  palette,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
  type SemanticTone,
} from "@/theme/tokens";

import {
  ComplianceIcon,
  DOC_TYPE_ICONS,
  type ComplianceIconName,
} from "./icons";
import {
  expiryAttentionOf,
  formatDaysLabel,
  type ExpiryAttention,
} from "./expiry-text";
import { DOC_TYPE_NAMES, type DocType, type DocumentCard } from "./types";

type Badge = {
  label: string;
  tone: SemanticTone;
  icon: ComplianceIconName;
};

type ComplianceDocumentCardProps = {
  card: DocumentCard;
  onUpload: (docType: DocType) => void;
};

const ICON_SIZE = 20;
const BADGE_ICON_SIZE = 16;
const TILE_SIZE = 44;
const NO_REASON = "No reason was given.";

function expiryBadge(expiry: ExpiryAttention): Badge {
  switch (expiry.kind) {
    case "valid":
      return { label: "Valid", tone: "success", icon: "check" };
    case "expiring":
      return {
        label: formatDaysLabel(expiry.days),
        tone: "warning",
        icon: "exclamation",
      };
    case "urgent":
      return {
        label: formatDaysLabel(expiry.days),
        tone: "danger",
        icon: "exclamation",
      };
    case "expired":
      return { label: "Expired", tone: "danger", icon: "exclamation" };
  }
}

type CardView = {
  badges: Badge[];
  border: SemanticTone | null;
  showsExpiry: boolean;
  timeLeft: string | null;
  actionNeeded: boolean;
  cta: "Upload renewed document" | "Upload again" | null;
};

function viewOf(card: DocumentCard): CardView {
  const { attention } = card;
  const expiry = expiryAttentionOf(attention);
  const expiryBadges: Badge[] =
    expiry && expiry.kind !== "valid" ? [expiryBadge(expiry)] : [];

  if (attention.kind === "under-review" || attention.kind === "rejected") {
    const own: Badge =
      attention.kind === "rejected"
        ? { label: "Rejected", tone: "danger", icon: "exclamation" }
        : { label: "Under review", tone: "info", icon: "clock" };
    const badges = [own, ...expiryBadges];
    return {
      badges,
      border: badges.some((b) => b.tone === "danger") ? "danger" : null,
      showsExpiry: card.current !== null,
      timeLeft: null,
      actionNeeded: false,
      cta: attention.kind === "rejected" ? "Upload again" : null,
    };
  }

  const badge = expiryBadge(attention);
  const needsRenewal = attention.kind !== "valid";
  return {
    badges: [badge],
    border:
      badge.tone === "danger" || badge.tone === "warning" ? badge.tone : null,
    showsExpiry: true,
    timeLeft:
      attention.kind === "valid" ? formatTimeLeft(attention.days) : null,
    actionNeeded: needsRenewal,
    cta: needsRenewal ? "Upload renewed document" : null,
  };
}

export function ComplianceDocumentCard({
  card,
  onUpload,
}: ComplianceDocumentCardProps): React.JSX.Element {
  const { attention, docType } = card;
  const name = DOC_TYPE_NAMES[docType];
  const view = viewOf(card);
  const expiryDate = (card.current ?? card.latest).expiryDate;
  const actionTone = view.border ?? "danger";
  const tileTone = view.badges[0]?.tone ?? "info";

  return (
    <View
      testID="document-card"
      style={[
        styles.card,
        view.border && {
          borderWidth: 2,
          borderColor: semantic[view.border].accent,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <View
            style={[
              styles.tile,
              { backgroundColor: semantic[tileTone].background },
            ]}
          >
            <ComplianceIcon
              name={DOC_TYPE_ICONS[docType]}
              color={semantic[tileTone].text}
              size={ICON_SIZE}
            />
          </View>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={styles.badges}>
          {view.badges.map((badge) => (
            <BadgeView key={badge.label} badge={badge} />
          ))}
        </View>
      </View>
      {attention.kind === "rejected" ? (
        <Text style={[styles.reason, { color: semantic.danger.text }]}>
          {attention.reason ?? NO_REASON}
        </Text>
      ) : null}
      {view.showsExpiry ? (
        <View style={styles.row}>
          <View style={styles.expires}>
            <Text style={styles.muted}>Expires</Text>
            <Text
              style={[
                styles.date,
                view.actionNeeded && { color: semantic[actionTone].text },
              ]}
            >
              {formatMelbourneDate(expiryDate)}
            </Text>
          </View>
          {view.timeLeft ? (
            <Text style={styles.muted}>{view.timeLeft}</Text>
          ) : null}
          {view.actionNeeded ? (
            <Text style={[styles.action, { color: semantic[actionTone].text }]}>
              Action needed
            </Text>
          ) : null}
        </View>
      ) : null}
      {view.cta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view.cta}
          onPress={() => onUpload(docType)}
          style={({ pressed }) => [
            styles.button,
            actionTone === "warning"
              ? styles.buttonWarning
              : styles.buttonDanger,
            pressed && styles.pressed,
          ]}
        >
          <ComplianceIcon
            name="upload"
            color={actionTone === "warning" ? colors.text : colors.onPrimary}
            size={ICON_SIZE}
          />
          <Text
            style={[
              styles.buttonText,
              actionTone === "warning" && styles.buttonTextOnAmber,
            ]}
          >
            {view.cta}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BadgeView({ badge }: { badge: Badge }): React.JSX.Element {
  const tone = semantic[badge.tone];
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <ComplianceIcon
        name={badge.icon}
        color={tone.text}
        size={BADGE_ICON_SIZE}
      />
      <Text style={[styles.badgeText, { color: tone.text }]}>
        {badge.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  badges: { alignItems: "flex-end", gap: spacing.xs },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: { fontFamily: fontFamily.bold, fontSize: fontSize.body },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  expires: { flexDirection: "row", gap: spacing.xs },
  date: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  action: { fontFamily: fontFamily.semibold, fontSize: fontSize.body },
  reason: { fontFamily: fontFamily.regular, fontSize: fontSize.body },
  title: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  button: {
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
  },
  // Blanco sobre ámbar y sobre rojo claro no llega a 4.5:1: el ámbar lleva
  // texto oscuro y el rojo su tono más oscuro.
  buttonWarning: { backgroundColor: semantic.warning.accent },
  buttonDanger: { backgroundColor: palette.red700 },
  buttonTextOnAmber: { color: colors.text },
  pressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
});
