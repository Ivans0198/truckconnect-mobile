import {
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { FATIGUE_NOW, weekSummaryFixture } from "@/test/fatigue-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize, semantic } from "@/theme/tokens";

import { FatigueScreen } from "./fatigue-screen";
import { DAILY_LIMIT_HOURS, WEEKLY_LIMIT_HOURS } from "./types";
import type { WeekSummary } from "./types";

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

function serveWeek(week: WeekSummary): void {
  server.use(
    http.get(apiUrl("/fatigue/week-summary"), () => HttpResponse.json(week)),
  );
}

async function renderWeek(): Promise<ReturnType<typeof within>> {
  await renderWithQuery(<FatigueScreen />);
  const week = within(await screen.findByTestId("week-summary"));
  await week.findByText("Total worked");
  return week;
}

function barFill(index: number): { width: string; backgroundColor: string } {
  const [bar] = screen.getAllByTestId("week-day-bar").slice(index, index + 1);
  return StyleSheet.flatten(
    within(bar!).getByTestId("week-day-fill").props.style,
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

describe("This week", () => {
  it("shows one row per day with its short name and hours (4.1)", async () => {
    const week = await renderWeek();

    expect(week.getByText("This week")).toBeOnTheScreen();
    expect(week.getAllByTestId("week-day")).toHaveLength(5);
    expect(week.getByText("Mon")).toBeOnTheScreen();
    expect(week.getByText("7h 48m")).toBeOnTheScreen();
    expect(week.getByText("Fri")).toBeOnTheScreen();
    expect(week.getByText("5h 30m")).toBeOnTheScreen();
  });

  it("names the range of the week in the header", async () => {
    const week = await renderWeek();

    expect(week.getByText("Mon to Fri")).toBeOnTheScreen();
  });

  it("sizes each bar against the 12 h day and states its tone as text (4.2)", async () => {
    const week = await renderWeek();

    expect(barFill(0).width).toBe(`${(7.8 / DAILY_LIMIT_HOURS) * 100}%`);
    expect(barFill(0).backgroundColor).toBe(semantic.success.accent);
    expect(barFill(3).backgroundColor).toBe(semantic.warning.accent);
    expect(week.getAllByText("OK")).toHaveLength(3);
    expect(week.getAllByText("Watch")).toHaveLength(2);
  });

  it("never lets a day over 12 h overflow its bar, and marks it red", async () => {
    serveWeek({
      ...weekSummaryFixture,
      byDay: [{ date: "2026-11-23", hours: 14 }],
    });
    const week = await renderWeek();

    expect(barFill(0).width).toBe("100%");
    expect(barFill(0).backgroundColor).toBe(semantic.danger.accent);
    expect(week.getByText("High")).toBeOnTheScreen();
    expect(week.getByText("14h 00m")).toBeOnTheScreen();
  });

  it("ends with Total worked over 72h (4.3)", async () => {
    const week = await renderWeek();

    expect(week.getByText("Total worked")).toBeOnTheScreen();
    expect(week.getByText("38h 10m")).toBeOnTheScreen();
    expect(week.getByText(`/ ${WEEKLY_LIMIT_HOURS}h`)).toBeOnTheScreen();
  });

  it("never draws text below the body size (FR-015)", async () => {
    const week = await renderWeek();

    const sizes = week
      .getAllByText(/.+/)
      .map((text) => StyleSheet.flatten(text.props.style)?.fontSize);

    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(fontSize.body);
    }
  });

  it("shows its own error and retries (4.4)", async () => {
    let fail = true;
    server.use(
      http.get(apiUrl("/fatigue/week-summary"), () =>
        fail
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(weekSummaryFixture),
      ),
    );
    await renderWithQuery(<FatigueScreen />);

    const week = within(await screen.findByTestId("week-summary"));
    expect(
      await week.findByText("Could not load this week."),
    ).toBeOnTheScreen();

    fail = false;
    fireEvent.press(week.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(week.getByText("7h 48m")).toBeOnTheScreen());
  });
});
