import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { formatBreakLength, formatMelbourneTime } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { SectionError } from "./section-error";
import { buildTimeline } from "./timeline";
import type { TimelineEntry } from "./timeline";
import type { FatigueEvent, FatigueEventType, FatigueStatus } from "./types";

const ERROR_MESSAGE = "Could not load today's events.";
const EMPTY_MESSAGE = "No events yet today.";
const CURRENT_LABEL = "current";
const SKELETON_ROWS = 3;
const SKELETON_BAR_HEIGHT = 16;
const SEPARATOR = " · ";

// Íconos y colores del mockup 12 (Heroicons, viewBox 20). El mockup no
// dibuja "Day ended": lleva el ícono y el rojo de su botón End Day.
const ICON_VIEWBOX = "0 0 20 20";
const ICON_SIZE = 20;
const BADGE_SIZE = 40;

export type EventLook = {
  path: string;
  background: string;
  foreground: string;
};

export const EVENT_LOOKS: Record<FatigueEventType, EventLook> = {
  DAY_START: {
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
    background: palette.emerald100,
    foreground: palette.emerald700,
  },
  BREAK_START: {
    path: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z",
    background: palette.amber100,
    foreground: palette.amber700,
  },
  BREAK_END: {
    path: "M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z",
    background: palette.emerald100,
    foreground: palette.emerald700,
  },
  DAY_END: {
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
    background: palette.red100,
    foreground: palette.red700,
  },
};

type TodayEventsProps = {
  events: readonly FatigueEvent[] | undefined;
  status: FatigueStatus;
  isError: boolean;
  onRetry: () => void;
};

export function TodayEvents({
  events,
  status,
  isError,
  onRetry,
}: TodayEventsProps): React.JSX.Element {
  const entries = events ? buildTimeline(events, status) : null;

  return (
    <View testID="today-events" style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Today&apos;s events
        </Text>
        {entries && entries.length > 0 ? (
          <Text style={styles.count}>{countLabel(entries.length)}</Text>
        ) : null}
      </View>
      {entries ? (
        entries.length > 0 ? (
          <View style={styles.list}>
            {entries.map((entry) => (
              <EventRow key={entry.id} entry={entry} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>{EMPTY_MESSAGE}</Text>
        )
      ) : isError ? (
        <SectionError message={ERROR_MESSAGE} onRetry={onRetry} />
      ) : (
        <EventsSkeleton />
      )}
    </View>
  );
}

function EventsSkeleton(): React.JSX.Element {
  return (
    <View
      testID="today-events-skeleton"
      accessibilityLabel="Loading today's events"
      style={styles.list}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.badge, styles.skeletonFill]} />
          <View style={styles.text}>
            <View style={[styles.skeletonBar, styles.skeletonFill]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function countLabel(count: number): string {
  return count === 1 ? "1 event" : `${count} events`;
}

function EventRow({ entry }: { entry: TimelineEntry }): React.JSX.Element {
  const look = EVENT_LOOKS[entry.type];
  // La hora va solo a la derecha; debajo del título queda lo que no se ve
  // en otro lado (cuánto duró el break, cuál es el evento actual).
  const details = [
    entry.durationMs === undefined ? null : formatBreakLength(entry.durationMs),
    entry.isCurrent ? CURRENT_LABEL : null,
  ]
    .filter((part) => part !== null)
    .join(SEPARATOR);

  return (
    <View testID="today-event" style={styles.row}>
      <View style={[styles.badge, { backgroundColor: look.background }]}>
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox={ICON_VIEWBOX}>
          <Path d={look.path} fill={look.foreground} fillRule="evenodd" />
        </Svg>
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{entry.label}</Text>
        {details ? <Text style={styles.details}>{details}</Text> : null}
      </View>
      <Text style={[styles.clock, entry.isCurrent && styles.clockCurrent]}>
        {formatMelbourneTime(entry.at)}
      </Text>
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
  count: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  text: { flex: 1 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  details: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  clock: {
    fontVariant: ["tabular-nums"],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  clockCurrent: {
    fontFamily: fontFamily.bold,
    color: semantic.success.text,
  },
  skeletonFill: { backgroundColor: colors.border },
  skeletonBar: { height: SKELETON_BAR_HEIGHT, borderRadius: radius.md },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
