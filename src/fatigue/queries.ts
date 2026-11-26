import { useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { api } from "@/api/client";
import { startOfMelbourneDay } from "@/format/time";

import type { FatigueEvent, FatigueStatus, WeekSummary } from "./types";

export const FATIGUE_KEY = ["fatigue"] as const;
export const FATIGUE_STATUS_KEY = ["fatigue", "status"] as const;
export const FATIGUE_EVENTS_KEY = ["fatigue", "events", "today"] as const;
export const FATIGUE_WEEK_KEY = ["fatigue", "week"] as const;

const REFRESH_INTERVAL_MS = 60_000;

// Los fetchers lanzan ante un no-2xx, como toda query de la app.
export async function fetchFatigueStatus(): Promise<FatigueStatus> {
  const { data, response } = await api.GET("/fatigue/status");
  if (!data) {
    throw new Error(`GET /fatigue/status failed with ${response.status}`);
  }
  return data;
}

export async function fetchFatigueEvents(now: Date): Promise<FatigueEvent[]> {
  const { data, response } = await api.GET("/fatigue/events", {
    params: {
      query: {
        from: startOfMelbourneDay(now).toISOString(),
        to: now.toISOString(),
      },
    },
  });
  if (!data) {
    throw new Error(`GET /fatigue/events failed with ${response.status}`);
  }
  return data;
}

export async function fetchWeekSummary(): Promise<WeekSummary> {
  const { data, response } = await api.GET("/fatigue/week-summary");
  if (!data) {
    throw new Error(`GET /fatigue/week-summary failed with ${response.status}`);
  }
  return data;
}

// Cada minuto solo mientras la pestaña está a la vista (research R2). La
// vuelta de la app desde segundo plano la cubre connectAppFocus.
function useRefreshInterval(): number | false {
  return useIsFocused() ? REFRESH_INTERVAL_MS : false;
}

export function useFatigueStatus(): UseQueryResult<FatigueStatus> {
  const refetchInterval = useRefreshInterval();
  return useQuery({
    queryKey: FATIGUE_STATUS_KEY,
    queryFn: fetchFatigueStatus,
    refetchInterval,
  });
}

export function useTodayFatigueEvents(): UseQueryResult<FatigueEvent[]> {
  const refetchInterval = useRefreshInterval();
  return useQuery({
    queryKey: FATIGUE_EVENTS_KEY,
    queryFn: () => fetchFatigueEvents(new Date()),
    refetchInterval,
  });
}

export function useWeekSummary(): UseQueryResult<WeekSummary> {
  const refetchInterval = useRefreshInterval();
  return useQuery({
    queryKey: FATIGUE_WEEK_KEY,
    queryFn: fetchWeekSummary,
    refetchInterval,
  });
}
