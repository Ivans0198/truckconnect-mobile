import type { UseQueryResult } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Vehicle } from "@/profile/queries";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { FormButton } from "./form-button";

const RADIO_SIZE = 24;
const RADIO_DOT_SIZE = 12;

type VehicleSectionProps = {
  vehicles: UseQueryResult<Vehicle[]>;
  selectedId: string | null;
  error: string | null;
  onSelect: (vehicleId: string) => void;
};

function vehicleName(vehicle: Vehicle): string {
  return [vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

// "Isuzu FRR 110-260 · 1AB-2CD"; make y model pueden faltar.
function vehicleLabel(vehicle: Vehicle): string {
  const name = vehicleName(vehicle);
  return name
    ? `${name} · ${vehicle.registrationNumber}`
    : vehicle.registrationNumber;
}

// Registration de vehículo o de remolque: el back pide a qué vehículo
// pertenece. Uno solo se manda sin preguntar; varios se eligen.
export function VehicleSection({
  vehicles,
  selectedId,
  error,
  onSelect,
}: VehicleSectionProps): React.JSX.Element {
  const list = vehicles.data;
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Vehicle</Text>
      {vehicles.isPending ? (
        <View
          role="img"
          accessibilityLabel="Loading your vehicles"
          style={styles.skeleton}
        />
      ) : null}
      {vehicles.isError ? (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.warning}>
            Your vehicles could not be loaded.
          </Text>
          <FormButton
            label="Try again"
            onPress={() => void vehicles.refetch()}
          />
        </>
      ) : null}
      {list && list.length === 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.warning}>
          You have no active vehicle, so this document cannot be uploaded.
          Contact TruckConnect to add your vehicle.
        </Text>
      ) : null}
      {list?.length === 1 ? (
        <Text style={styles.chosen}>{vehicleLabel(list[0] as Vehicle)}</Text>
      ) : null}
      {list && list.length > 1
        ? list.map((vehicle) => {
            const isSelected = vehicle.id === selectedId;
            return (
              <Pressable
                key={vehicle.id}
                role="radio"
                accessibilityLabel={vehicleLabel(vehicle)}
                aria-checked={isSelected}
                onPress={() => onSelect(vehicle.id)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.selected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[styles.radio, isSelected && styles.radioSelected]}
                >
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.optionText}>
                  {vehicleName(vehicle) ? (
                    <Text style={styles.name}>{vehicleName(vehicle)}</Text>
                  ) : null}
                  <Text numberOfLines={1} style={styles.name}>
                    {vehicle.registrationNumber}
                  </Text>
                </View>
              </Pressable>
            );
          })
        : null}
      {error && list && list.length > 1 ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  skeleton: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
  },
  warning: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: semantic.warning.text,
    backgroundColor: semantic.warning.background,
  },
  error: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
  },
  option: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  optionText: { flexShrink: 1 },
  selected: {
    borderColor: semantic.info.accent,
    backgroundColor: semantic.info.background,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  radioSelected: { borderColor: semantic.info.accent },
  radioDot: {
    width: RADIO_DOT_SIZE,
    height: RADIO_DOT_SIZE,
    borderRadius: radius.full,
    backgroundColor: semantic.info.accent,
  },
  chosen: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  name: {
    flexShrink: 1,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
});
