import { StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  spacing,
} from "@/theme/tokens";

import type { Vehicle } from "./queries";

const VEHICLE_TYPE_LABELS: Record<Vehicle["type"], string> = {
  RIGID: "Rigid",
  SEMI_TRAILER: "Semi-trailer",
};
const FALLBACK_TITLE = "Vehicle";
const numberFormat = new Intl.NumberFormat("en-AU");

// "Volvo FH 2022", omitiendo lo que el back no trae.
function vehicleTitle(vehicle: Vehicle): string {
  const parts = [vehicle.make, vehicle.model, vehicle.year].filter(
    (part) => part !== null,
  );
  return parts.length > 0 ? parts.join(" ") : FALLBACK_TITLE;
}

export function VehicleCard({
  vehicle,
}: {
  vehicle: Vehicle;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{vehicleTitle(vehicle)}</Text>
      <Text style={styles.registration}>{vehicle.registrationNumber}</Text>
      <View style={styles.grid}>
        <Fact label="Type" value={VEHICLE_TYPE_LABELS[vehicle.type]} />
        <Fact label="Capacity" value={`${vehicle.palletCapacity} pallets`} />
        <Fact label="GVM" value={`${numberFormat.format(vehicle.gvmKg)} kg`} />
        <Fact label="Cargo height" value={`${vehicle.cargoHeightM} m`} />
      </View>
    </View>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  registration: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  fact: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.slate50,
  },
  factLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  factValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
