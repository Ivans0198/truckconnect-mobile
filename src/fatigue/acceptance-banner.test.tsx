import { screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { FATIGUE_NOW, fatigueStatusFixture } from "@/test/fatigue-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize } from "@/theme/tokens";

import { FatigueScreen } from "./fatigue-screen";
import type { FatigueStatus } from "./types";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useIsFocused: () => true,
    useFocusEffect: (callback: () => void) => {
      useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

const TITLE = "You can't accept new orders";
const PAST_BREAK_DUE = "2026-11-27T01:00:00.000Z";

function serveStatus(overrides: Partial<FatigueStatus>): void {
  server.use(
    http.get(apiUrl("/fatigue/status"), () =>
      HttpResponse.json({ ...fatigueStatusFixture, ...overrides }),
    ),
  );
}

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

describe("acceptance banner on FatigueScreen", () => {
  it("shows the daily limit reason", async () => {
    serveStatus({ hoursRemaining: 0 });

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText("Daily limit reached")).toBeOnTheScreen();
  });

  it("shows the weekly limit reason", async () => {
    server.use(
      http.get(apiUrl("/fatigue/week-summary"), () =>
        HttpResponse.json({
          totalHoursWorked: 72,
          remainingHours: 0,
          byDay: [],
        }),
      ),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText("Weekly limit reached")).toBeOnTheScreen();
  });

  it("shows the break overdue reason", async () => {
    serveStatus({ nextBreakDueAt: PAST_BREAK_DUE });

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText("Break overdue")).toBeOnTheScreen();
  });

  it("shows every reason when several apply", async () => {
    serveStatus({ hoursRemaining: -1, nextBreakDueAt: PAST_BREAK_DUE });
    server.use(
      http.get(apiUrl("/fatigue/week-summary"), () =>
        HttpResponse.json({
          totalHoursWorked: 72,
          remainingHours: 0,
          byDay: [],
        }),
      ),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText("Daily limit reached")).toBeOnTheScreen();
    expect(screen.getByText("Weekly limit reached")).toBeOnTheScreen();
    expect(screen.getByText("Break overdue")).toBeOnTheScreen();
  });

  it("does not show the banner inside the hours", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Working")).toBeOnTheScreen();
    expect(screen.queryByText(TITLE)).not.toBeOnTheScreen();
  });

  it("does not show the banner while there is no data", async () => {
    server.use(
      http.get(
        apiUrl("/fatigue/status"),
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await renderWithQuery(<FatigueScreen />);

    expect(
      await screen.findByText(/Could not load your hours/),
    ).toBeOnTheScreen();
    expect(screen.queryByText(TITLE)).not.toBeOnTheScreen();
  });

  it("draws every line at body size or larger", async () => {
    serveStatus({ hoursRemaining: 0, nextBreakDueAt: PAST_BREAK_DUE });

    await renderWithQuery(<FatigueScreen />);

    const lines = [
      await screen.findByText(TITLE),
      screen.getByText("Daily limit reached"),
      screen.getByText("Break overdue"),
    ];
    for (const line of lines) {
      expect(
        StyleSheet.flatten(line.props.style).fontSize,
      ).toBeGreaterThanOrEqual(fontSize.body);
    }
  });

  it("announces the banner as a live region", async () => {
    serveStatus({ hoursRemaining: 0 });

    await renderWithQuery(<FatigueScreen />);

    const banner = await screen.findByTestId("acceptance-banner");
    expect(banner.props.accessibilityLiveRegion).toBe("polite");
  });

  it("sets the title apart from the reasons by size and weight", async () => {
    serveStatus({ hoursRemaining: 0 });

    await renderWithQuery(<FatigueScreen />);

    const title = StyleSheet.flatten(
      (await screen.findByText(TITLE)).props.style,
    );
    const reason = StyleSheet.flatten(
      screen.getByText("Daily limit reached").props.style,
    );
    expect(title?.fontSize).toBe(fontSize.lead);
    expect(reason?.fontSize).toBe(fontSize.body);
    expect(reason?.fontFamily).not.toBe(title?.fontFamily);
  });
});
