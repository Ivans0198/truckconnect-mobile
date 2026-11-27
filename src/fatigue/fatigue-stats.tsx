import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatHoursMinutes } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import type { NextBreak } from "./next-break";
import { WEEKLY_LIMIT_HOURS } from "./types";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const SKELETON_VALUE_HEIGHT = 20;

type FatigueStatsProps = {
  hoursRemaining: number;
  nextBreak: NextBreak;
  week: WeekStat;
};

// La tarjeta "This week" siempre se dibuja: cada sección lleva su propio estado.
export type WeekStat =
  | { kind: "ready"; hours: number }
  | { kind: "loading" }
  | { kind: "error"; retrying: boolean; onRetry: () => void };

function nextBreakText(nextBreak: NextBreak): string {
  switch (nextBreak.kind) {
    case "in":
      return formatHoursMinutes(
        Math.ceil(nextBreak.ms / MS_PER_MINUTE) / MINUTES_PER_HOUR,
      );
    case "due":
      return "Due now";
    case "none":
      return "None";
  }
}

export function FatigueStats({
  hoursRemaining,
  nextBreak,
  week,
}: FatigueStatsProps): React.JSX.Element {
  const isDue = nextBreak.kind === "due";
  const isCounting = nextBreak.kind === "in";
  return (
    <View style={styles.row}>
      <Stat
        label="Remaining"
        value={formatHoursMinutes(Math.max(hoursRemaining, 0))}
      />
      <Stat
        label="Next break in"
        value={nextBreakText(nextBreak)}
        tone={isDue ? "danger" : isCounting ? "warning" : undefined}
      />
      <WeekCard week={week} />
    </View>
  );
}

function WeekCard({ week }: { week: WeekStat }): React.JSX.Element {
  switch (week.kind) {
    case "ready":
      return (
        <Stat
          label="This week"
          value={`${Math.round(week.hours)}h / ${WEEKLY_LIMIT_HOURS}h`}
        />
      );
    case "loading":
      return (
        <Stat
          label="This week"
          accessibilityLabel="Loading this week"
          testID="week-skeleton"
          value={<View style={styles.skeletonValue} />}
        />
      );
    case "error":
      return (
        <Stat
          label="This week"
          tone="danger"
          value="Unavailable"
          liveRegion
          action={
            week.retrying ? (
              <View testID="week-skeleton" style={styles.skeletonValue} />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try again"
                onPress={week.onRetry}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            )
          }
        />
      );
  }
}

type StatProps = {
  label: string;
  value: string | React.JSX.Element;
  tone?: "warning" | "danger";
  accessibilityLabel?: string;
  testID?: string;
  liveRegion?: boolean;
  action?: React.JSX.Element;
};

// Mismo tamaño en etiqueta y valor (FR-015): la jerarquía va en peso y color.
function Stat({
  label,
  value,
  tone,
  accessibilityLabel,
  testID,
  liveRegion,
  action,
}: StatProps): React.JSX.Element {
  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        tone !== undefined && { backgroundColor: semantic[tone].background },
      ]}
    >
      <Text
        style={[
          styles.label,
          tone !== undefined && { color: semantic[tone].text },
        ]}
      >
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text
          accessibilityLiveRegion={liveRegion ? "polite" : undefined}
          style={[
            styles.value,
            tone !== undefined && { color: semantic[tone].text },
          ]}
        >
          {value}
        </Text>
      ) : (
        value
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  skeletonValue: {
    width: "70%",
    height: SKELETON_VALUE_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  retry: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: "center",
  },
});
