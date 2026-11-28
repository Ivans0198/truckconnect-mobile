import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  InfiniteData,
  QueryClient,
  UseMutationResult,
} from "@tanstack/react-query";

import { api } from "@/api/client";

import {
  NOTIFICATIONS_KEY,
  UNREAD_COUNT_KEY,
  type NotificationsPage,
} from "./queries";

type ListCache = InfiniteData<NotificationsPage, number>;
// Solo lo que hace falta para deshacer ESTA lectura, sin tocar las otras.
type Snapshot = { wasUnread: boolean };

function setReadInList(list: ListCache, id: string, read: boolean): ListCache {
  return {
    ...list,
    pages: list.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === id ? { ...item, read } : item,
      ),
    })),
  };
}

function wasUnread(list: ListCache | undefined, id: string): boolean {
  return (
    list?.pages.some((page) =>
      page.items.some((item) => item.id === id && !item.read),
    ) ?? false
  );
}

function adjustUnreadCount(client: QueryClient, delta: number): void {
  const count = client.getQueryData<number>(UNREAD_COUNT_KEY);
  if (count === undefined) return;
  client.setQueryData<number>(UNREAD_COUNT_KEY, Math.max(0, count + delta));
}

// La lectura se ve al instante; si el PATCH falla, vuelve a como estaba.
export function useMarkRead(): UseMutationResult<
  unknown,
  Error,
  string,
  Snapshot
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, response } = await api.PATCH("/notifications/{id}/read", {
        params: { path: { id } },
      });
      if (!data) {
        throw new Error(
          `PATCH /notifications/{id}/read failed with ${response.status}`,
        );
      }
      return data;
    },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      await client.cancelQueries({ queryKey: UNREAD_COUNT_KEY });
      const list = client.getQueryData<ListCache>(NOTIFICATIONS_KEY);
      const isUnread = wasUnread(list, id);
      if (list) {
        client.setQueryData<ListCache>(
          NOTIFICATIONS_KEY,
          setReadInList(list, id, true),
        );
      }
      if (isUnread) adjustUnreadCount(client, -1);
      return { wasUnread: isUnread };
    },
    onError: (_error, id, snapshot) => {
      const list = client.getQueryData<ListCache>(NOTIFICATIONS_KEY);
      if (list) {
        client.setQueryData<ListCache>(
          NOTIFICATIONS_KEY,
          setReadInList(list, id, false),
        );
      }
      if (snapshot?.wasUnread) adjustUnreadCount(client, 1);
    },
  });
}

export function useMarkAllRead(): UseMutationResult<unknown, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, response } = await api.PATCH("/notifications/read-all");
      if (!data) {
        throw new Error(
          `PATCH /notifications/read-all failed with ${response.status}`,
        );
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
        client.invalidateQueries({ queryKey: UNREAD_COUNT_KEY }),
      ]);
    },
  });
}
