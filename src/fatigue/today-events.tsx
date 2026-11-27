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
const SEPARATOR = " · ";

// Íconos y colores del mockup 12 (Heroicons, viewBox 20). El mockup no
// dibuja "Day ended": lleva el ícono y el rojo de su botón End Day.
const ICON_VIEWBOX = "0 0 20 20";
const ICON_SIZE = 20;
const BADGE_SIZE = 40;

type EventLook = { path: string; background: string; foreground: string };

const EVENT_LOOKS: Record<FatigueEventType, EventLook> = {
  DAY_START: {
    path: "M10 12a2 2 0 100-4 2 2 0 000 4zM.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z",
    background: palette.emerald100,
    foreground: palette.emerald700,
  },
  BREAK_START: {
    path: "M5 4a1 1 0 011 1v4a1 1 0 11-2 0V5a1 1 0 011-1zm10 0a1 1 0 011 1v4a1 1 0 11-2 0V5a1 1 0 011-1z",
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
        <Text style={styles.empty}>Loading today&apos;s events...</Text>
      )}
    </View>
  );
}

function countLabel(count: number): string {
  return count === 1 ? "1 event" : `${count} events`;
}

function EventRow({ entry }: { entry: TimelineEntry }): React.JSX.Element {
  const look = EVENT_LOOKS[entry.type];
  const time = formatMelbourneTime(entry.at);
  const details = [
    time,
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
        <Text style={styles.details}>{details}</Text>
      </View>
      <Text style={[styles.clock, entry.isCurrent && styles.clockCurrent]}>
        {shortClock(time)}
      </Text>
    </View>
  );
}

// "12:30 PM" se muestra como "12:30" al borde, como en el mockup.
function shortClock(time: string): string {
  return time.replace(/\s?[AP]M$/, "");
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  clockCurrent: {
    fontFamily: fontFamily.bold,
    color: semantic.success.text,
  },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
