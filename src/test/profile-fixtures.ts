import type { components } from "@/api/schema";

type DriverStats = components["schemas"]["DriverStatsResponseDto"];
type Vehicle = components["schemas"]["VehicleResponseDto"];

export const driverStatsFixture: DriverStats = {
  period: "month",
  hoursWorked: 142.5,
  totalEarningsCents: 482_000,
  totalOrders: 47,
  avgMargin: 0.18,
};

const VEHICLE_BASE: Vehicle = {
  id: "vehicle-1",
  driverId: "driver-1",
  type: "RIGID",
  registrationNumber: "1AB-2CD",
  state: "VIC",
  make: "Isuzu",
  model: "FRR 110-260",
  year: 2021,
  gvmKg: 11_000,
  maxPayloadKg: 6_000,
  palletCapacity: 10,
  cargoLengthM: 6.5,
  cargoWidthM: 2.4,
  cargoHeightM: 2.4,
  hasTailLift: true,
  isActive: true,
  createdAt: "2024-03-01T00:00:00.000Z",
  updatedAt: "2024-03-01T00:00:00.000Z",
};

export const activeVehicleFixture: Vehicle = VEHICLE_BASE;

export const inactiveVehicleFixture: Vehicle = {
  ...VEHICLE_BASE,
  id: "vehicle-2",
  type: "SEMI_TRAILER",
  registrationNumber: "XYZ-987",
  make: null,
  model: null,
  year: null,
  gvmKg: 42_500,
  palletCapacity: 22,
  isActive: false,
};

export const vehiclesFixture: Vehicle[] = [
  activeVehicleFixture,
  inactiveVehicleFixture,
];
