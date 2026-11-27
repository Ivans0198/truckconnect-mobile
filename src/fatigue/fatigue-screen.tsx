import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/theme/tokens";

import { FatigueActionBar } from "./fatigue-action-bar";
import { FatigueStats } from "./fatigue-stats";
import { HoursRing } from "./hours-ring";
import {
  useFatigueStatus,
  useTodayFatigueEvents,
  useWeekSummary,
} from "./queries";
import { nextBreakFor } from "./next-break";
import { SectionError } from "./section-error";
import { TodayEvents } from "./today-events";
import { useNow } from "./use-now";
import { WeekSummary } from "./week-summary";

const ERROR_MESSAGE = "Could not load your hours. Check your connection.";
const SKELETON_BLOCKS = 3;

export function FatigueScreen(): React.JSX.Element {
  const status = useFatigueStatus();
  const week = useWeekSummary();
  const events = useTodayFatigueEvents();
  const now = useNow();
  const [isPulling, setIsPulling] = useState(false);

  const { refetch: refetchStatus } = status;
  const { refetch: refetchWeek } = week;
  const { refetch: refetchEvents } = events;
  const refetchAll = useCallback(
    () => Promise.all([refetchStatus(), refetchWeek(), refetchEvents()]),
    [refetchStatus, refetchWeek, refetchEvents],
  );

  // La primera carga ya la hace la query al montar: solo se vuelve a pedir
  // cuando la pestaña recupera el foco.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void refetchAll();
    }, [refetchAll]),
  );

  const onRefresh = useCallback(async () => {
    setIsPulling(true);
    try {
      await refetchAll();
    } finally {
      setIsPulling(false);
    }
  }, [refetchAll]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Fatigue
        </Text>
        <Text style={styles.subtitle}>Standard Hours · HVNL compliant</Text>
      </View>
      <ScrollView
        testID="fatigue-scroll"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isPulling} onRefresh={onRefresh} />
        }
      >
        <View style={styles.card}>
          {status.data && week.data ? (
            <>
              <HoursRing
                state={status.data.state}
                hoursWorked={status.data.hoursWorked}
              />
              <FatigueStats
                hoursRemaining={status.data.hoursRemaining}
                nextBreak={nextBreakFor(status.data, now)}
                weekHours={week.data.totalHoursWorked}
              />
            </>
          ) : status.isError || week.isError ? (
            <SectionError
              message={ERROR_MESSAGE}
              onRetry={() => void refetchAll()}
            />
          ) : (
            <Skeleton />
          )}
        </View>
        {status.data ? <FatigueActionBar state={status.data.state} /> : null}
        {status.data ? (
          <TodayEvents
            events={events.data}
            status={status.data}
            isError={events.isError}
            onRetry={() => void refetchEvents()}
          />
        ) : null}
        <WeekSummary
          week={week.data}
          isError={week.isError}
          onRetry={() => void refetchWeek()}
        />
      </ScrollView>
    </View>
  );
}

function Skeleton(): React.JSX.Element {
  return (
    <View
      testID="fatigue-skeleton"
      accessibilityLabel="Loading your hours"
      style={styles.skeleton}
    >
      <View style={styles.skeletonRing} />
      <View style={styles.skeletonRow}>
        {Array.from({ length: SKELETON_BLOCKS }, (_, index) => (
          <View key={index} style={styles.skeletonBlock} />
        ))}
      </View>
    </View>
  );
}

const SKELETON_RING_SIZE = 224;
const SKELETON_BLOCK_HEIGHT = 72;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  content: { gap: spacing.lg, padding: spacing.lg },
  card: {
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  skeleton: { gap: spacing.xl },
  skeletonRing: {
    width: SKELETON_RING_SIZE,
    height: SKELETON_RING_SIZE,
    alignSelf: "center",
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  skeletonRow: { flexDirection: "row", gap: spacing.sm },
  skeletonBlock: {
    flex: 1,
    height: SKELETON_BLOCK_HEIGHT,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
  },
});
