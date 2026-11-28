import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
  UseInfiniteQueryResult,
  UseQueryResult,
  InfiniteData,
} from "@tanstack/react-query";
import { useIsFocused } from "expo-router";

import { api } from "@/api/client";
import type { components, operations } from "@/api/schema";

export type AppNotification = components["schemas"]["NotificationResponseDto"];
export type NotificationsPage =
  operations["NotificationsController_findAll"]["responses"][200]["content"]["application/json"];

export const NOTIFICATIONS_KEY = ["notifications", "list"] as const;
export const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const UNREAD_REFRESH_MS = 60_000;
const FIRST_PAGE = 1;

// Lanzan ante un no-2xx: la lista muestra su error con "Try again".
export async function fetchNotificationsPage(
  page: number,
): Promise<NotificationsPage> {
  const { data, response } = await api.GET("/notifications", {
    params: { query: { page, limit: NOTIFICATIONS_PAGE_SIZE } },
  });
  if (!data) {
    throw new Error(`GET /notifications failed with ${response.status}`);
  }
  return data;
}

// El punto de la campana solo necesita el total: se pide un único elemento.
export async function fetchUnreadCount(): Promise<number> {
  const { data, response } = await api.GET("/notifications", {
    params: { query: { page: FIRST_PAGE, limit: 1, unread: true } },
  });
  if (!data) {
    throw new Error(`GET /notifications?unread failed with ${response.status}`);
  }
  return data.total;
}

export function nextNotificationsPage(
  lastPage: NotificationsPage,
): number | undefined {
  return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
}

export function useNotifications(): UseInfiniteQueryResult<
  InfiniteData<NotificationsPage, number>
> {
  return useInfiniteQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextNotificationsPage,
  });
}

// Cada minuto solo mientras Home está a la vista; la vuelta de la app desde
// segundo plano la cubre connectAppFocus.
export function useUnreadCount(): UseQueryResult<number> {
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
    refetchInterval: isFocused ? UNREAD_REFRESH_MS : false,
  });
}
