import { useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { useCallback, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SignOutButton } from "@/auth/sign-out-button";
import { useCurrentAccount } from "@/auth/use-current-account";
import { SectionError } from "@/fatigue/section-error";
import { useNow } from "@/fatigue/use-now";
import { colors, fontFamily, fontSize, radius, spacing } from "@/theme/tokens";

import { PersonalInfo } from "./personal-info";
import { ProfileHeader } from "./profile-header";
import { useActiveVehicles, useDriverStats } from "./queries";
import { VehicleCard } from "./vehicle-card";

function versionLine(version: string | undefined): string {
  return version ? `TruckConnect Driver · v${version}` : "TruckConnect Driver";
}

const ACCOUNT_ERROR = "Could not load your profile. Check your connection.";
const VEHICLE_ERROR = "Could not load your vehicle. Check your connection.";

export function ProfileScreen(): React.JSX.Element {
  const account = useCurrentAccount();
  const stats = useDriverStats(account.data?.id);
  const vehicles = useActiveVehicles();
  const now = useNow();
  const [isPulling, setIsPulling] = useState(false);

  const refetchAccount = account.refetch;
  const refetchStats = stats.refetch;
  const refetchVehicles = vehicles.refetch;
  const refetchAll = useCallback(
    () =>
      Promise.all([refetchAccount(), refetchStats(), refetchVehicles()]).then(
        () => undefined,
      ),
    [refetchAccount, refetchStats, refetchVehicles],
  );

  // La primera carga ya la hace cada query al montar.
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
    <ScrollView
      testID="profile-scroll"
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isPulling} onRefresh={onRefresh} />
      }
    >
      <Text accessibilityRole="header" style={styles.title}>
        Profile
      </Text>
      {account.data ? (
        <>
          <ProfileHeader
            account={account.data}
            now={now}
            stats={
              stats.data
                ? { status: "ready", stats: stats.data }
                : stats.isError
                  ? { status: "error", onRetry: () => void refetchStats() }
                  : { status: "loading" }
            }
          />
          <SectionTitle>Personal info</SectionTitle>
          <PersonalInfo account={account.data} />
        </>
      ) : account.isError ? (
        <View style={styles.section}>
          <SectionError
            message={ACCOUNT_ERROR}
            onRetry={() => void refetchAccount()}
          />
        </View>
      ) : (
        <View
          accessibilityLabel="Loading your profile"
          style={styles.skeleton}
        />
      )}
      <SectionTitle>Your vehicle</SectionTitle>
      <VehicleSection
        vehicles={vehicles}
        onRetry={() => void refetchVehicles()}
      />
      <View style={styles.footer}>
        <SignOutButton />
        <Text style={styles.version}>
          {versionLine(Constants.expoConfig?.version)}
        </Text>
      </View>
    </ScrollView>
  );
}

function VehicleSection({
  vehicles,
  onRetry,
}: {
  vehicles: ReturnType<typeof useActiveVehicles>;
  onRetry: () => void;
}): React.JSX.Element {
  if (vehicles.isError) {
    return (
      <View style={styles.section}>
        <SectionError message={VEHICLE_ERROR} onRetry={onRetry} />
      </View>
    );
  }
  if (!vehicles.data) {
    return (
      <View accessibilityLabel="Loading your vehicle" style={styles.skeleton} />
    );
  }
  if (vehicles.data.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.empty}>No vehicle on file</Text>
      </View>
    );
  }
  return (
    <View style={styles.vehicles}>
      {vehicles.data.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </View>
  );
}

function SectionTitle({ children }: { children: string }): React.JSX.Element {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

const SKELETON_HEIGHT = 112;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  title: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  section: { marginHorizontal: spacing.xl },
  vehicles: { gap: spacing.md },
  emptyCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  empty: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  skeleton: {
    height: SKELETON_HEIGHT,
    marginHorizontal: spacing.xl,
    borderRadius: spacing.lg,
    backgroundColor: colors.border,
  },
  footer: { gap: spacing.lg, padding: spacing.xl },
  version: {
    textAlign: "center",
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
