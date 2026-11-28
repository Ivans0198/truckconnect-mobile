import { StyleSheet, Text, View } from "react-native";

import type { Account } from "@/auth/types";
import { SectionError } from "@/fatigue/section-error";
import { formatTenure } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  spacing,
} from "@/theme/tokens";

import { formatAbn, initialsOf, licenceLabel } from "./profile-format";
import type { DriverStats } from "./queries";

// El mockup deja la calificación vacía: el back todavía no la entrega.
const EMPTY_RATING = "— —";
const LOADING_VALUE = "…";
const AVATAR_SIZE = 80;
const STATS_ERROR = "Could not load your stats. Check your connection.";

type StatsState =
  | { status: "loading" }
  | { status: "error"; onRetry: () => void }
  | { status: "ready"; stats: DriverStats };

type ProfileHeaderProps = {
  account: Account;
  stats: StatsState;
  now: Date;
};

export function ProfileHeader({
  account,
  stats,
  now,
}: ProfileHeaderProps): React.JSX.Element {
  const licence = licenceLabel(account.licenceClass);
  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initialsOf(account.fullName)}</Text>
        </View>
        <View style={styles.names}>
          <Text accessibilityRole="header" style={styles.name}>
            {account.fullName}
          </Text>
          {licence ? <Text style={styles.muted}>{licence}</Text> : null}
          {account.abn ? (
            <Text style={styles.muted}>{`ABN ${formatAbn(account.abn)}`}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.statsBox}>
        {stats.status === "error" ? (
          <SectionError message={STATS_ERROR} onRetry={stats.onRetry} />
        ) : (
          <View
            style={styles.statsRow}
            accessibilityLabel={
              stats.status === "loading" ? "Loading your stats" : undefined
            }
          >
            <Stat
              value={
                stats.status === "ready"
                  ? String(stats.stats.totalOrders)
                  : LOADING_VALUE
              }
              label="Deliveries"
            />
            <Stat value={EMPTY_RATING} label="Rating" bordered />
            <Stat
              value={formatTenure(account.createdAt, now)}
              label="With us"
            />
          </View>
        )}
      </View>
    </View>
  );
}

type StatProps = { value: string; label: string; bordered?: boolean };

function Stat({ value, label, bordered }: StatProps): React.JSX.Element {
  return (
    <View style={[styles.stat, bordered && styles.statBordered]}>
      <Text
        style={styles.statValue}
        importantForAccessibility={value === LOADING_VALUE ? "no" : "auto"}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: palette.violet600,
  },
  initials: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.onPrimary,
  },
  names: { flex: 1 },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  muted: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  statsBox: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: palette.slate100,
  },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: spacing.xs },
  statBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: palette.slate100,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
