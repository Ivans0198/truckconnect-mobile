import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { notification, notificationsPage } from "@/test/notification-fixtures";
import { apiUrl, server } from "@/test/server";

import { useMarkAllRead, useMarkRead } from "./mutations";
import {
  NOTIFICATIONS_KEY,
  UNREAD_COUNT_KEY,
  type NotificationsPage,
} from "./queries";

type Cache = InfiniteData<NotificationsPage, number>;

function setup(): {
  client: QueryClient;
  wrapper: (props: { children: ReactNode }) => React.JSX.Element;
} {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  const seeded: Cache = { pages: [notificationsPage(1)], pageParams: [1] };
  client.setQueryData(NOTIFICATIONS_KEY, seeded);
  client.setQueryData(UNREAD_COUNT_KEY, 20);
  const wrapper = ({
    children,
  }: {
    children: ReactNode;
  }): React.JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

function readFlags(client: QueryClient): Record<string, boolean> {
  const cache = client.getQueryData<Cache>(NOTIFICATIONS_KEY);
  const items = cache?.pages.flatMap((page) => page.items) ?? [];
  return Object.fromEntries(items.map((item) => [item.id, item.read]));
}

// notification-2 es la primera sin leer de la página uno.
const UNREAD_ID = "notification-2";

describe("useMarkRead", () => {
  it("marks the notification read in the cache before the PATCH answers", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.patch(apiUrl("/notifications/:id/read"), async ({ params }) => {
        await gate;
        return HttpResponse.json(
          notification({ id: params.id as string, read: true }),
        );
      }),
    );
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useMarkRead(), { wrapper });

    await act(async () => {
      result.current.mutate(UNREAD_ID);
    });

    expect(readFlags(client)[UNREAD_ID]).toBe(true);
    expect(client.getQueryData(UNREAD_COUNT_KEY)).toBe(19);
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("restores the notification and the count when the PATCH fails", async () => {
    server.use(
      http.patch(apiUrl("/notifications/:id/read"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useMarkRead(), { wrapper });

    await act(async () => {
      result.current.mutate(UNREAD_ID);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(readFlags(client)[UNREAD_ID]).toBe(false);
    expect(client.getQueryData(UNREAD_COUNT_KEY)).toBe(20);
  });
});

describe("useMarkAllRead", () => {
  it("invalidates the list and the unread count", async () => {
    server.use(
      http.patch(apiUrl("/notifications/read-all"), () =>
        HttpResponse.json({ updated: 20 }),
      ),
    );
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryState(NOTIFICATIONS_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(UNREAD_COUNT_KEY)?.isInvalidated).toBe(true);
  });

  it("fails without touching the cache when the PATCH fails", async () => {
    server.use(
      http.patch(apiUrl("/notifications/read-all"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryState(UNREAD_COUNT_KEY)?.isInvalidated).toBe(false);
  });
});
