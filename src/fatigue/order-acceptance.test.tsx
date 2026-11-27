import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import {
  FATIGUE_NOW,
  fatigueStatusFixture,
  weekSummaryFixture,
} from "@/test/fatigue-fixtures";
import { apiUrl, server } from "@/test/server";

import { useFatigueAction } from "./mutations";
import {
  ACCEPTANCE_BLOCK_MESSAGES,
  evaluateOrderAcceptance,
  useOrderAcceptance,
} from "./order-acceptance";
import type { FatigueStatus, WeekSummary } from "./types";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));

const PAST_BREAK_DUE = "2026-11-27T01:00:00.000Z";

function evaluate(
  statusOverrides: Partial<FatigueStatus> = {},
  weekOverrides: Partial<WeekSummary> = {},
): ReturnType<typeof evaluateOrderAcceptance> {
  return evaluateOrderAcceptance({
    status: { ...fatigueStatusFixture, ...statusOverrides },
    week: { ...weekSummaryFixture, ...weekOverrides },
    now: FATIGUE_NOW,
  });
}

describe("evaluateOrderAcceptance", () => {
  it("allows a driver inside their hours", () => {
    expect(evaluate()).toEqual({ kind: "allowed" });
  });

  it.each([0, -0.5])("blocks on daily-limit with %s hours remaining", (h) => {
    expect(evaluate({ hoursRemaining: h })).toEqual({
      kind: "blocked",
      reasons: ["daily-limit"],
    });
  });

  it("does not block with a little daily time left", () => {
    expect(evaluate({ hoursRemaining: 0.1 })).toEqual({ kind: "allowed" });
  });

  it.each([0, -3])("blocks on weekly-limit with %s hours remaining", (h) => {
    expect(evaluate({}, { remainingHours: h })).toEqual({
      kind: "blocked",
      reasons: ["weekly-limit"],
    });
  });

  it("blocks on break-overdue when working past the break time", () => {
    expect(evaluate({ nextBreakDueAt: PAST_BREAK_DUE })).toEqual({
      kind: "blocked",
      reasons: ["break-overdue"],
    });
  });

  it("blocks when the break time is exactly now", () => {
    expect(evaluate({ nextBreakDueAt: FATIGUE_NOW.toISOString() })).toEqual({
      kind: "blocked",
      reasons: ["break-overdue"],
    });
  });

  it.each(["on_break", "off_duty"] as const)(
    "does not report break-overdue when %s",
    (state) => {
      expect(evaluate({ state, nextBreakDueAt: PAST_BREAK_DUE })).toEqual({
        kind: "allowed",
      });
    },
  );

  it("does not report break-overdue without a break time", () => {
    expect(evaluate({ nextBreakDueAt: null })).toEqual({ kind: "allowed" });
  });

  it("lists every reason in contract order", () => {
    expect(
      evaluate(
        { hoursRemaining: 0, nextBreakDueAt: PAST_BREAK_DUE },
        { remainingHours: 0 },
      ),
    ).toEqual({
      kind: "blocked",
      reasons: ["daily-limit", "weekly-limit", "break-overdue"],
    });
  });
});

describe("ACCEPTANCE_BLOCK_MESSAGES", () => {
  it("has the English text of each reason", () => {
    expect(ACCEPTANCE_BLOCK_MESSAGES).toEqual({
      "daily-limit": "Daily limit reached",
      "weekly-limit": "Weekly limit reached",
      "break-overdue": "Break overdue",
    });
  });
});

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function serveStatus(status: FatigueStatus): void {
  server.use(
    http.get(apiUrl("/fatigue/status"), () => HttpResponse.json(status)),
  );
}

describe("useOrderAcceptance", () => {
  beforeEach(() => {
    jest.useFakeTimers({
      advanceTimers: true,
      now: FATIGUE_NOW,
      doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is unknown while the data loads", async () => {
    server.use(
      http.get(apiUrl("/fatigue/status"), async () => {
        await new Promise(() => undefined);
        return HttpResponse.json(fatigueStatusFixture);
      }),
    );

    const { result } = await renderHook(() => useOrderAcceptance(), {
      wrapper: wrapper(),
    });

    expect(result.current).toEqual({ kind: "unknown" });
  });

  it.each(["/fatigue/status", "/fatigue/week-summary"])(
    "is unknown when %s fails",
    async (path) => {
      server.use(
        http.get(apiUrl(path), () => new HttpResponse(null, { status: 500 })),
      );

      const { result } = await renderHook(() => useOrderAcceptance(), {
        wrapper: wrapper(),
      });

      await waitFor(() => expect(result.current).toEqual({ kind: "unknown" }));
      // Deja pasar la respuesta de la otra query para no confundir "cargando".
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(result.current).toEqual({ kind: "unknown" });
    },
  );

  it("is allowed once both queries answer inside the hours", async () => {
    const { result } = await renderHook(() => useOrderAcceptance(), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current).toEqual({ kind: "allowed" }));
  });

  it("is blocked with its reasons when the driver is over the limit", async () => {
    serveStatus({ ...fatigueStatusFixture, hoursRemaining: 0 });

    const { result } = await renderHook(() => useOrderAcceptance(), {
      wrapper: wrapper(),
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        kind: "blocked",
        reasons: ["daily-limit"],
      }),
    );
  });

  it("goes back to allowed after taking and ending an overdue break", async () => {
    serveStatus({ ...fatigueStatusFixture, nextBreakDueAt: PAST_BREAK_DUE });
    server.use(
      http.post(apiUrl("/fatigue/end-break"), () =>
        HttpResponse.json(fatigueStatusFixture),
      ),
    );

    const { result } = await renderHook(
      () => ({
        acceptance: useOrderAcceptance(),
        endBreak: useFatigueAction("end-break"),
      }),
      { wrapper: wrapper() },
    );
    await waitFor(() =>
      expect(result.current.acceptance).toEqual({
        kind: "blocked",
        reasons: ["break-overdue"],
      }),
    );

    await act(async () => {
      await result.current.endBreak.mutateAsync();
    });

    await waitFor(() =>
      expect(result.current.acceptance).toEqual({ kind: "allowed" }),
    );
  });
});
