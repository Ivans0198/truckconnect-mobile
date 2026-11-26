import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
  type SemanticTone,
} from "@/theme/tokens";

import { useApiHealth } from "./useApiHealth";

type StatusView = { tone: SemanticTone; title: string; detail: string };

const CHECKING: StatusView = {
  tone: "info",
  title: "Checking connection…",
  detail: "Talking to the TruckConnect API.",
};
const ONLINE: StatusView = {
  tone: "success",
  title: "API online",
  detail: "You're connected to TruckConnect.",
};
const OFFLINE: StatusView = {
  tone: "danger",
  title: "Can't reach TruckConnect",
  detail: "Check your signal and try again.",
};

export function HealthScreen(): React.JSX.Element {
  const health = useApiHealth();
  const status = health.isPending
    ? CHECKING
    : health.isError
      ? OFFLINE
      : ONLINE;
  const tone = semantic[status.tone];

  return (
    <View style={styles.screen}>
      <Text style={styles.appName}>TruckConnect Driver</Text>
      <View
        style={[
          styles.statusCard,
          { backgroundColor: tone.background, borderColor: tone.accent },
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.dot, { backgroundColor: tone.accent }]} />
        <View style={styles.statusText}>
          <Text style={[styles.statusTitle, { color: tone.text }]}>
            {status.title}
          </Text>
          <Text style={styles.statusDetail}>{status.detail}</Text>
        </View>
      </View>
      {health.isError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: health.isFetching }}
          disabled={health.isFetching}
          onPress={() => void health.refetch()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  appName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    color: colors.text,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: radius.full },
  statusText: { flex: 1, gap: spacing.xs },
  statusTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lead },
  statusDetail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  button: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
});
