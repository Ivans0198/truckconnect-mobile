import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { processColor, StyleSheet } from "react-native";

import {
  FATIGUE_NOW,
  fatigueStatusFixture,
  weekSummaryFixture,
} from "@/test/fatigue-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize } from "@/theme/tokens";

import { FatigueScreen } from "./fatigue-screen";
import type { FatigueStatus } from "./types";

// Los hooks leen el foco de la pestaña; fuera de una ruta no hay contexto.
// useFocusEffect corre su callback al montar, como lo hace en una pestaña.
const mockFocusCallbacks: (() => void)[] = [];
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useIsFocused: () => true,
    useFocusEffect: (callback: () => void) => {
      mockFocusCallbacks.push(callback);
      useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

const ONE_MINUTE_MS = 60_000;

function serveStatus(status: FatigueStatus): { calls: () => number } {
  let calls = 0;
  server.use(
    http.get(apiUrl("/fatigue/status"), () => {
      calls += 1;
      return HttpResponse.json(status);
    }),
  );
  return { calls: () => calls };
}

function statusWith(overrides: Partial<FatigueStatus>): FatigueStatus {
  return { ...fatigueStatusFixture, ...overrides };
}

beforeEach(() => {
  mockFocusCallbacks.length = 0;
  jest.useFakeTimers({
    advanceTimers: true,
    now: FATIGUE_NOW,
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("FatigueScreen", () => {
  it("shows the working state, the hours and the shift limit", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Working")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("hours-ring")).getByText("5h 30m"),
    ).toBeOnTheScreen();
    expect(screen.getByText("of 12h shift limit")).toBeOnTheScreen();
  });

  it("titles the screen without a back arrow", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(screen.getByRole("header", { name: "Fatigue" })).toBeOnTheScreen();
    expect(
      screen.getByText("Standard Hours · HVNL compliant"),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/back/i)).not.toBeOnTheScreen();
  });

  it("names the ring with the hours and the tone, not only a color", async () => {
    await renderWithQuery(<FatigueScreen />);

    const ring = await screen.findByTestId("hours-ring");

    expect(ring.props.accessibilityLabel).toBe(
      "Working, 5h 30m of 12h shift limit, on track",
    );
    expect(screen.getByTestId("hours-ring-progress").props.stroke.payload).toBe(
      processColor("#10B981"),
    );
  });

  it("fills the ring in the proportion 5.5 of 12", async () => {
    await renderWithQuery(<FatigueScreen />);

    const progress = await screen.findByTestId("hours-ring-progress");
    const { strokeDasharray, strokeDashoffset } = progress.props;

    const circumference = Number([strokeDasharray].flat()[0]);
    expect(Number(strokeDashoffset) / circumference).toBeCloseTo(
      1 - 5.5 / 12,
      3,
    );
  });

  it("turns amber from 9 hours worked", async () => {
    serveStatus(statusWith({ hoursWorked: 9, hoursRemaining: 3 }));

    await renderWithQuery(<FatigueScreen />);

    const ring = await screen.findByTestId("hours-ring");
    expect(ring.props.accessibilityLabel).toBe(
      "Working, 9h 00m of 12h shift limit, approaching the limit",
    );
    expect(screen.getByTestId("hours-ring-progress").props.stroke.payload).toBe(
      processColor("#F59E0B"),
    );
  });

  it("turns red above 11 hours worked", async () => {
    serveStatus(statusWith({ hoursWorked: 11.5, hoursRemaining: 0.5 }));

    await renderWithQuery(<FatigueScreen />);

    const ring = await screen.findByTestId("hours-ring");
    expect(ring.props.accessibilityLabel).toBe(
      "Working, 11h 30m of 12h shift limit, over the limit",
    );
    expect(screen.getByTestId("hours-ring-progress").props.stroke.payload).toBe(
      processColor("#EF4444"),
    );
  });

  it("shows 13h 00m with a full red ring past the limit", async () => {
    serveStatus(statusWith({ hoursWorked: 13, hoursRemaining: 0 }));

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("13h 00m")).toBeOnTheScreen();
    const progress = screen.getByTestId("hours-ring-progress");
    expect(Number(progress.props.strokeDashoffset)).toBe(0);
    expect(progress.props.stroke.payload).toBe(processColor("#EF4444"));
  });

  it("shows Remaining, Next break in and This week", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Remaining")).toBeOnTheScreen();
    expect(screen.getByText("6h 30m")).toBeOnTheScreen();
    expect(screen.getByText("Next break in")).toBeOnTheScreen();
    expect(screen.getByText("2h 12m")).toBeOnTheScreen();
    expect(screen.getAllByText("This week")).toHaveLength(2);
    expect(screen.getByText("38h / 72h")).toBeOnTheScreen();
  });

  it("shows 0h 00m remaining, never a negative, past the limit", async () => {
    serveStatus(statusWith({ hoursWorked: 13, hoursRemaining: -1 }));

    await renderWithQuery(<FatigueScreen />);

    await screen.findByText("13h 00m");
    expect(screen.getByText("0h 00m")).toBeOnTheScreen();
    expect(screen.queryByText(/-/)).not.toBeOnTheScreen();
  });

  it("rounds a countdown under a minute up, not down to zero", async () => {
    serveStatus(statusWith({ nextBreakDueAt: "2026-11-27T01:35:20.000Z" }));

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("0h 01m")).toBeOnTheScreen();
  });

  it("shows 28h / 72h for a week of 28 hours", async () => {
    server.use(
      http.get(apiUrl("/fatigue/week-summary"), () =>
        HttpResponse.json({
          ...weekSummaryFixture,
          totalHoursWorked: 28,
          remainingHours: 44,
        }),
      ),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("28h / 72h")).toBeOnTheScreen();
  });

  it("says On break and shows no countdown", async () => {
    serveStatus(statusWith({ state: "on_break", nextBreakDueAt: null }));

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("On break")).toBeOnTheScreen();
    expect(screen.getByText("Next break in")).toBeOnTheScreen();
    expect(screen.queryByText("2h 12m")).not.toBeOnTheScreen();
    expect(screen.queryByText("Due now")).not.toBeOnTheScreen();
  });

  it("says Off duty with the hours of today", async () => {
    serveStatus(
      statusWith({ state: "off_duty", hoursWorked: 8, nextBreakDueAt: null }),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Off duty")).toBeOnTheScreen();
    expect(screen.getByText("8h 00m")).toBeOnTheScreen();
  });

  it("shows 0 hours when off duty and the day never started", async () => {
    serveStatus(
      statusWith({
        state: "off_duty",
        hoursWorked: 0,
        hoursRemaining: 12,
        nextBreakDueAt: null,
      }),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Off duty")).toBeOnTheScreen();
    expect(screen.getByText("0h 00m")).toBeOnTheScreen();
  });

  it("shows Due now when the break time has passed", async () => {
    serveStatus(statusWith({ nextBreakDueAt: "2026-11-27T01:00:00.000Z" }));

    await renderWithQuery(<FatigueScreen />);

    const due = await screen.findByText("Due now");
    expect(due).toBeOnTheScreen();
    expect(StyleSheet.flatten(due.props.style).color).toBe("#B91C1C");
  });

  it("shows a skeleton, not zeros, while the data is on its way", async () => {
    server.use(
      http.get(apiUrl("/fatigue/status"), async () => {
        await new Promise(() => undefined);
        return HttpResponse.json(fatigueStatusFixture);
      }),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(screen.getByTestId("fatigue-skeleton")).toBeOnTheScreen();
    expect(screen.queryByText("0h 00m")).not.toBeOnTheScreen();
    expect(screen.queryByText("Working")).not.toBeOnTheScreen();
  });

  it("shows an error with Try again that asks again", async () => {
    let failing = true;
    server.use(
      http.get(apiUrl("/fatigue/status"), () =>
        failing
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(fatigueStatusFixture),
      ),
    );
    await renderWithQuery(<FatigueScreen />);
    const retry = await screen.findByRole("button", { name: "Try again" });

    failing = false;
    await fireEvent.press(retry);

    expect(await screen.findByText("Working")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeOnTheScreen();
  });

  it("shows the error when the network is down", async () => {
    server.use(http.get(apiUrl("/fatigue/status"), () => HttpResponse.error()));

    await renderWithQuery(<FatigueScreen />);

    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeOnTheScreen();
  });

  it("asks again after a minute", async () => {
    const status = serveStatus(fatigueStatusFixture);
    await renderWithQuery(<FatigueScreen />);
    await screen.findByText("Working");
    const before = status.calls();

    await act(async () => {
      jest.advanceTimersByTime(ONE_MINUTE_MS);
    });

    await waitFor(() => expect(status.calls()).toBeGreaterThan(before));
  });

  it("asks again when the tab gets the focus back", async () => {
    const status = serveStatus(fatigueStatusFixture);
    await renderWithQuery(<FatigueScreen />);
    await screen.findByText("Working");
    const before = status.calls();

    await act(async () => {
      mockFocusCallbacks.at(-1)?.();
    });

    await waitFor(() => expect(status.calls()).toBeGreaterThan(before));
  });

  it("asks again when the driver pulls down", async () => {
    const status = serveStatus(fatigueStatusFixture);
    await renderWithQuery(<FatigueScreen />);
    await screen.findByText("Working");
    const before = status.calls();

    const { refreshControl } = screen.getByTestId("fatigue-scroll").props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(status.calls()).toBeGreaterThan(before);
  });

  it("draws no text under the body size, not even the labels", async () => {
    await renderWithQuery(<FatigueScreen />);
    await screen.findByText("Working");

    const sizes = screen
      .getAllByText(/.+/)
      .map((text) => StyleSheet.flatten(text.props.style)?.fontSize);

    expect(sizes.length).toBeGreaterThan(5);
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(fontSize.body);
    }
  });
});
