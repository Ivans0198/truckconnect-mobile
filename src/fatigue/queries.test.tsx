import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { startOfMelbourneDay } from "@/format/time";
import {
  fatigueEventsFixture,
  fatigueStatusFixture,
  weekSummaryFixture,
} from "@/test/fatigue-fixtures";
import { apiUrl, server } from "@/test/server";

import {
  FATIGUE_EVENTS_KEY,
  FATIGUE_KEY,
  FATIGUE_STATUS_KEY,
  FATIGUE_WEEK_KEY,
  fetchFatigueEvents,
  fetchFatigueStatus,
  fetchWeekSummary,
  useFatigueStatus,
  useTodayFatigueEvents,
  useWeekSummary,
} from "./queries";

// Los hooks leen el foco de la pestaña; fuera de una ruta no hay contexto.
jest.mock("expo-router", () => ({ useIsFocused: () => true }));

describe("fatigue fetchers", () => {
  it("returns the status body", async () => {
    await expect(fetchFatigueStatus()).resolves.toEqual(fatigueStatusFixture);
  });

  it("returns the events body", async () => {
    await expect(fetchFatigueEvents(new Date())).resolves.toEqual(
      fatigueEventsFixture,
    );
  });

  it("returns the week summary body", async () => {
    await expect(fetchWeekSummary()).resolves.toEqual(weekSummaryFixture);
  });

  it.each([400, 403, 429, 500])("throws on a %s", async (status) => {
    server.use(
      http.get(
        apiUrl("/fatigue/status"),
        () => new HttpResponse(null, { status }),
      ),
      http.get(
        apiUrl("/fatigue/events"),
        () => new HttpResponse(null, { status }),
      ),
      http.get(
        apiUrl("/fatigue/week-summary"),
        () => new HttpResponse(null, { status }),
      ),
    );
    await expect(fetchFatigueStatus()).rejects.toThrow(String(status));
    await expect(fetchFatigueEvents(new Date())).rejects.toThrow(
      String(status),
    );
    await expect(fetchWeekSummary()).rejects.toThrow(String(status));
  });

  it("asks for events from Melbourne midnight to now, in ISO UTC", async () => {
    const now = new Date("2026-11-23T03:00:00.000Z");
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/fatigue/events"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(fatigueEventsFixture);
      }),
    );

    await fetchFatigueEvents(now);

    expect(query?.get("from")).toBe(startOfMelbourneDay(now).toISOString());
    expect(query?.get("from")).toBe("2026-11-22T13:00:00.000Z");
    expect(query?.get("to")).toBe(now.toISOString());
  });
});

describe("query keys", () => {
  it("share the fatigue prefix", () => {
    expect(FATIGUE_STATUS_KEY.slice(0, 1)).toEqual(FATIGUE_KEY);
    expect(FATIGUE_EVENTS_KEY.slice(0, 1)).toEqual(FATIGUE_KEY);
    expect(FATIGUE_WEEK_KEY.slice(0, 1)).toEqual(FATIGUE_KEY);
  });
});

describe("fatigue hooks", () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  it("useFatigueStatus loads the status", async () => {
    const { result } = await renderHook(() => useFatigueStatus(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual(fatigueStatusFixture),
    );
  });

  it("useTodayFatigueEvents loads today's events", async () => {
    const { result } = await renderHook(() => useTodayFatigueEvents(), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.data).toEqual(fatigueEventsFixture),
    );
  });

  it("useWeekSummary loads the week", async () => {
    const { result } = await renderHook(() => useWeekSummary(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual(weekSummaryFixture),
    );
  });
});
