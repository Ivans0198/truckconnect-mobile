import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { components } from "@/api/schema";

export type DriverStats = components["schemas"]["DriverStatsResponseDto"];
export type Vehicle = components["schemas"]["VehicleResponseDto"];

export const PROFILE_STATS_KEY = ["profile", "stats", "month"] as const;
export const PROFILE_VEHICLES_KEY = ["profile", "vehicles"] as const;
// El máximo que acepta el contrato: un conductor tiene uno o dos vehículos.
const VEHICLES_PAGE_LIMIT = 100;

// Lanzan ante un no-2xx: la sección del perfil muestra su error con "Try again".
export async function fetchDriverStats(driverId: string): Promise<DriverStats> {
  const { data, response } = await api.GET("/drivers/{id}/stats", {
    params: { path: { id: driverId }, query: { period: "month" } },
  });
  if (!data) {
    throw new Error(`GET /drivers/{id}/stats failed with ${response.status}`);
  }
  return data;
}

export async function fetchActiveVehicles(): Promise<Vehicle[]> {
  const { data, response } = await api.GET("/vehicles", {
    params: { query: { page: 1, limit: VEHICLES_PAGE_LIMIT } },
  });
  if (!data) throw new Error(`GET /vehicles failed with ${response.status}`);
  return data.items.filter((vehicle) => vehicle.isActive);
}

export function useDriverStats(
  driverId: string | undefined,
): UseQueryResult<DriverStats> {
  return useQuery({
    queryKey: PROFILE_STATS_KEY,
    queryFn: () => fetchDriverStats(driverId as string),
    enabled: driverId !== undefined,
  });
}

export function useActiveVehicles(): UseQueryResult<Vehicle[]> {
  return useQuery({
    queryKey: PROFILE_VEHICLES_KEY,
    queryFn: fetchActiveVehicles,
  });
}
