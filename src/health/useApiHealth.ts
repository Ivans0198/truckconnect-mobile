import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { paths } from "@/api/schema";

type HealthResponse =
  paths["/health"]["get"]["responses"]["200"]["content"]["application/json"];

export const HEALTH_QUERY_KEY = ["health"] as const;

async function fetchHealth(): Promise<HealthResponse> {
  const { data, response } = await api.GET("/health");
  if (!response.ok || data === undefined) {
    throw new Error(`GET /health answered ${response.status}`);
  }
  return data;
}

export function useApiHealth(): UseQueryResult<HealthResponse> {
  return useQuery({ queryKey: HEALTH_QUERY_KEY, queryFn: fetchHealth });
}
