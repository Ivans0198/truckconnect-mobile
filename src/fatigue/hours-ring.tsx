import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  colors,
  fontFamily,
  fontSize,
  palette,
  semantic,
  spacing,
} from "@/theme/tokens";
import { formatHoursMinutes } from "@/format/time";

import { fatigueTone } from "./fatigue-tone";
import type { FatigueTone } from "./fatigue-tone";
import { DAILY_LIMIT_HOURS } from "./types";
import type { FatigueState } from "./types";

const RING_SIZE = 224;
const RING_VIEWBOX = 200;
const RING_CENTER = RING_VIEWBOX / 2;
const RING_RADIUS = 86;
const RING_STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const STATE_LABEL: Record<FatigueState, string> = {
  working: "Working",
  on_break: "On break",
  off_duty: "Off duty",
};

// El color nunca va solo: el nombre accesible dice en qué tramo está.
const TONE_DESCRIPTION: Record<FatigueTone, string> = {
  success: "on track",
  warning: "approaching the limit",
  danger: "over the limit",
};

type HoursRingProps = {
  state: FatigueState;
  hoursWorked: number;
};

export function HoursRing({
  state,
  hoursWorked,
}: HoursRingProps): React.JSX.Element {
  const tone = fatigueTone(hoursWorked);
  const progress = Math.min(hoursWorked / DAILY_LIMIT_HOURS, 1);
  const worked = formatHoursMinutes(hoursWorked);
  const stateLabel = STATE_LABEL[state];

  return (
    <View
      testID="hours-ring"
      accessible
      accessibilityLabel={`${stateLabel}, ${worked} of ${DAILY_LIMIT_HOURS}h shift limit, ${TONE_DESCRIPTION[tone]}`}
      style={styles.ring}
    >
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
        style={styles.svg}
      >
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={palette.slate100}
          strokeWidth={RING_STROKE}
        />
        <Circle
          testID="hours-ring-progress"
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={semantic[tone].accent}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.state, { color: semantic[tone].text }]}>
          {stateLabel}
        </Text>
        <Text style={styles.hours}>{worked}</Text>
        <Text style={styles.limit}>of {DAILY_LIMIT_HOURS}h shift limit</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
  },
  svg: { position: "absolute" },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  state: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  hours: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.display,
    color: colors.text,
  },
  limit: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
