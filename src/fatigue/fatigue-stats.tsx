import { StyleSheet, Text, View } from "react-native";

import { formatHoursMinutes } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import type { NextBreak } from "./next-break";
import { WEEKLY_LIMIT_HOURS } from "./types";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

type FatigueStatsProps = {
  hoursRemaining: number;
  nextBreak: NextBreak;
  weekHours: number;
};

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
  weekHours,
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
      <Stat
        label="This week"
        value={`${Math.round(weekHours)}h / ${WEEKLY_LIMIT_HOURS}h`}
      />
    </View>
  );
}

type StatProps = {
  label: string;
  value: string;
  tone?: "warning" | "danger";
};

// Mismo tamaño en etiqueta y valor (FR-015): la jerarquía va en peso y color.
function Stat({ label, value, tone }: StatProps): React.JSX.Element {
  return (
    <View
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
      <Text
        style={[
          styles.value,
          tone !== undefined && { color: semantic[tone].text },
        ]}
      >
        {value}
      </Text>
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
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: "center",
  },
});
