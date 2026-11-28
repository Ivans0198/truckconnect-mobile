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

import { summarizeDocuments } from "@/compliance/attention";
import type { ComplianceDocument, DocumentCard } from "@/compliance/types";
import {
  COMPLIANCE_NOW,
  approvedExpiringIn,
  documentsPage,
  expiredDocument,
  pendingRenewal,
  redApprovedPublicLiability,
  rejectedDocument,
} from "@/test/compliance-fixtures";

import { useFatigueAction } from "./mutations";
import {
  describeBlockReason,
  evaluateOrderAcceptance,
  useOrderAcceptance,
} from "./order-acceptance";
import type { FatigueStatus, WeekSummary } from "./types";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));

const PAST_BREAK_DUE = "2026-11-27T01:00:00.000Z";

function evaluate(
  statusOverrides: Partial<FatigueStatus> = {},
  weekOverrides: Partial<WeekSummary> = {},
  compliance: DocumentCard[] | undefined = undefined,
): ReturnType<typeof evaluateOrderAcceptance> {
  return evaluateOrderAcceptance({
    status: { ...fatigueStatusFixture, ...statusOverrides },
    week: { ...weekSummaryFixture, ...weekOverrides },
    compliance,
    now: FATIGUE_NOW,
  });
}

function cardsOf(documents: ComplianceDocument[]): DocumentCard[] {
  return summarizeDocuments(documents, COMPLIANCE_NOW).cards;
}

describe("evaluateOrderAcceptance", () => {
  it("allows a driver inside their hours", () => {
    expect(evaluate()).toEqual({ kind: "allowed" });
  });

  it.each([0, -0.5])("blocks on daily-limit with %s hours remaining", (h) => {
    expect(evaluate({ hoursRemaining: h })).toEqual({
      kind: "blocked",
      reasons: [{ kind: "daily-limit" }],
    });
  });

  it("does not block with a little daily time left", () => {
    expect(evaluate({ hoursRemaining: 0.1 })).toEqual({ kind: "allowed" });
  });

  it.each([0, -3])("blocks on weekly-limit with %s hours remaining", (h) => {
    expect(evaluate({}, { remainingHours: h })).toEqual({
      kind: "blocked",
      reasons: [{ kind: "weekly-limit" }],
    });
  });

  it("blocks on break-overdue when working past the break time", () => {
    expect(evaluate({ nextBreakDueAt: PAST_BREAK_DUE })).toEqual({
      kind: "blocked",
      reasons: [{ kind: "break-overdue" }],
    });
  });

  it("blocks when the break time is exactly now", () => {
    expect(evaluate({ nextBreakDueAt: FATIGUE_NOW.toISOString() })).toEqual({
      kind: "blocked",
      reasons: [{ kind: "break-overdue" }],
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
      reasons: [
        { kind: "daily-limit" },
        { kind: "weekly-limit" },
        { kind: "break-overdue" },
      ],
    });
  });
});

describe("evaluateOrderAcceptance with compliance", () => {
  it("adds nothing when the documents did not load", () => {
    expect(evaluate({}, {}, undefined)).toEqual({ kind: "allowed" });
  });

  it("adds nothing for valid, amber or rejected documents", () => {
    expect(
      evaluate(
        {},
        {},
        cardsOf([
          approvedExpiringIn("a", "DRIVER_LICENCE", 400),
          approvedExpiringIn("b", "PUBLIC_LIABILITY", 32),
          rejectedDocument,
        ]),
      ),
    ).toEqual({ kind: "allowed" });
  });

  it("blocks with the days left when an approved document is at 7 days or fewer", () => {
    expect(
      evaluate(
        {},
        {},
        cardsOf([approvedExpiringIn("a", "PUBLIC_LIABILITY", 5)]),
      ),
    ).toEqual({
      kind: "blocked",
      reasons: [
        {
          kind: "compliance",
          docType: "PUBLIC_LIABILITY",
          state: "expiring",
          days: 5,
        },
      ],
    });
  });

  it("blocks with expired for an expired document", () => {
    expect(evaluate({}, {}, cardsOf([expiredDocument]))).toEqual({
      kind: "blocked",
      reasons: [
        {
          kind: "compliance",
          docType: "VEHICLE_REGO",
          state: "expired",
          days: null,
        },
      ],
    });
  });

  it("keeps blocking with under-review when the red document is being renewed", () => {
    expect(
      evaluate({}, {}, cardsOf([redApprovedPublicLiability, pendingRenewal])),
    ).toEqual({
      kind: "blocked",
      reasons: [
        {
          kind: "compliance",
          docType: "PUBLIC_LIABILITY",
          state: "under-review",
          days: null,
        },
      ],
    });
  });

  it("lifts the compliance reason once the renewal is approved", () => {
    const approvedRenewal = {
      ...pendingRenewal,
      status: "APPROVED" as const,
    };
    expect(
      evaluate({}, {}, cardsOf([redApprovedPublicLiability, approvedRenewal])),
    ).toEqual({ kind: "allowed" });
  });

  it("puts compliance reasons after the fatigue ones, in DocType order", () => {
    expect(
      evaluate(
        { hoursRemaining: 0 },
        {},
        cardsOf([
          approvedExpiringIn("t", "TRAILER_REGO", 2),
          approvedExpiringIn("l", "DRIVER_LICENCE", 3),
        ]),
      ),
    ).toEqual({
      kind: "blocked",
      reasons: [
        { kind: "daily-limit" },
        {
          kind: "compliance",
          docType: "DRIVER_LICENCE",
          state: "expiring",
          days: 3,
        },
        {
          kind: "compliance",
          docType: "TRAILER_REGO",
          state: "expiring",
          days: 2,
        },
      ],
    });
  });
});

describe("describeBlockReason", () => {
  it.each([
    [{ kind: "daily-limit" }, "Daily limit reached"],
    [{ kind: "weekly-limit" }, "Weekly limit reached"],
    [{ kind: "break-overdue" }, "Break overdue"],
    [
      {
        kind: "compliance",
        docType: "PUBLIC_LIABILITY",
        state: "expiring",
        days: 5,
      },
      "Public Liability expires in 5 days",
    ],
    [
      {
        kind: "compliance",
        docType: "PUBLIC_LIABILITY",
        state: "expiring",
        days: 1,
      },
      "Public Liability expires in 1 day",
    ],
    [
      {
        kind: "compliance",
        docType: "PUBLIC_LIABILITY",
        state: "expiring",
        days: 0,
      },
      "Public Liability expires today",
    ],
    [
      {
        kind: "compliance",
        docType: "DRIVER_LICENCE",
        state: "expired",
        days: null,
      },
      "Driver Licence expired",
    ],
    [
      {
        kind: "compliance",
        docType: "PUBLIC_LIABILITY",
        state: "under-review",
        days: null,
      },
      "Public Liability under review",
    ],
  ] as const)("describes %j", (reason, text) => {
    expect(describeBlockReason(reason)).toBe(text);
  });
});

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
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
        reasons: [{ kind: "daily-limit" }],
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
        reasons: [{ kind: "break-overdue" }],
      }),
    );

    await act(async () => {
      await result.current.endBreak.mutateAsync();
    });

    await waitFor(() =>
      expect(result.current.acceptance).toEqual({ kind: "allowed" }),
    );
  });

  it("is blocked by compliance when a document is about to expire", async () => {
    server.use(
      http.get(apiUrl("/compliance/documents"), () =>
        HttpResponse.json(
          documentsPage([approvedExpiringIn("a", "PUBLIC_LIABILITY", 5)]),
        ),
      ),
    );

    const { result } = await renderHook(() => useOrderAcceptance(), {
      wrapper: wrapper(),
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        kind: "blocked",
        reasons: [
          {
            kind: "compliance",
            docType: "PUBLIC_LIABILITY",
            state: "expiring",
            days: expect.any(Number),
          },
        ],
      }),
    );
  });

  it("answers with the fatigue alone when the documents fail", async () => {
    server.use(
      http.get(
        apiUrl("/compliance/documents"),
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    serveStatus({ ...fatigueStatusFixture, hoursRemaining: 0 });

    const { result } = await renderHook(() => useOrderAcceptance(), {
      wrapper: wrapper(),
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        kind: "blocked",
        reasons: [{ kind: "daily-limit" }],
      }),
    );
  });
});
