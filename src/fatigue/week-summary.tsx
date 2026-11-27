import { StyleSheet, Text, View } from "react-native";

import { formatHoursMinutes, formatWeekday } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { fatigueTone } from "./fatigue-tone";
import type { FatigueTone } from "./fatigue-tone";
import { SectionError } from "./section-error";
import { DAILY_LIMIT_HOURS, WEEKLY_LIMIT_HOURS } from "./types";
import type { WeekSummary as WeekSummaryData } from "./types";

const ERROR_MESSAGE = "Could not load this week.";
const EMPTY_MESSAGE = "No hours worked yet this week.";
const FULL_BAR_PERCENT = 100;
const BAR_HEIGHT = 12;
const DAY_NAME_WIDTH = 48;
const HOURS_WIDTH = 80;
const TONE_WIDTH = 64;
const SKELETON_ROWS = 5;

// El color solo no basta (design-system): cada tono lleva también su palabra.
const TONE_LABELS: Record<FatigueTone, string> = {
  success: "OK",
  warning: "Watch",
  danger: "High",
};

type WeekSummaryProps = {
  week: WeekSummaryData | undefined;
  isError: boolean;
  onRetry: () => void;
};

export function WeekSummary({
  week,
  isError,
  onRetry,
}: WeekSummaryProps): React.JSX.Element {
  return (
    <View testID="week-summary" style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          This week
        </Text>
        {week ? <Text style={styles.range}>{rangeLabel(week)}</Text> : null}
      </View>
      {week ? (
        <WeekBody week={week} />
      ) : isError ? (
        <SectionError message={ERROR_MESSAGE} onRetry={onRetry} />
      ) : (
        <WeekSkeleton />
      )}
    </View>
  );
}

function rangeLabel({ byDay }: WeekSummaryData): string {
  const first = byDay[0];
  const last = byDay[byDay.length - 1];
  if (!first || !last) return "";
  const from = formatWeekday(first.date);
  const to = formatWeekday(last.date);
  return from === to ? from : `${from} to ${to}`;
}

function WeekBody({ week }: { week: WeekSummaryData }): React.JSX.Element {
  return (
    <>
      {week.byDay.length > 0 ? (
        <View style={styles.list}>
          {week.byDay.map((day) => (
            <DayRow key={day.date} date={day.date} hours={day.hours} />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>{EMPTY_MESSAGE}</Text>
      )}
      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Total worked</Text>
        <View style={styles.totalValue}>
          <Text style={styles.totalHours}>
            {formatHoursMinutes(week.totalHoursWorked)}
          </Text>
          <Text style={styles.totalLimit}>{`/ ${WEEKLY_LIMIT_HOURS}h`}</Text>
        </View>
      </View>
    </>
  );
}

function DayRow({
  date,
  hours,
}: {
  date: string;
  hours: number;
}): React.JSX.Element {
  const tone = fatigueTone(hours);
  const fraction = Math.min(Math.max(hours / DAILY_LIMIT_HOURS, 0), 1);
  return (
    <View testID="week-day" style={styles.row}>
      <Text style={styles.dayName}>{formatWeekday(date)}</Text>
      <View testID="week-day-bar" style={styles.track}>
        <View
          testID="week-day-fill"
          style={[
            styles.fill,
            {
              width: `${fraction * FULL_BAR_PERCENT}%`,
              backgroundColor: semantic[tone].accent,
            },
          ]}
        />
      </View>
      <Text style={styles.hours}>{formatHoursMinutes(hours)}</Text>
      <Text style={[styles.tone, { color: semantic[tone].text }]}>
        {TONE_LABELS[tone]}
      </Text>
    </View>
  );
}

function WeekSkeleton(): React.JSX.Element {
  return (
    <View
      testID="week-summary-skeleton"
      accessibilityLabel="Loading this week"
      style={styles.list}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View key={index} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  range: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dayName: {
    width: DAY_NAME_WIDTH,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  fill: { height: "100%", borderRadius: radius.full },
  hours: {
    width: HOURS_WIDTH,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.text,
  },
  tone: {
    width: TONE_WIDTH,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
  },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  totalValue: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  totalHours: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  totalLimit: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  skeletonRow: {
    height: BAR_HEIGHT * 2,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
});
