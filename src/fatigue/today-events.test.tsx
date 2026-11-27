import { screen, within } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { FATIGUE_NOW, fatigueEventsFixture } from "@/test/fatigue-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize, palette } from "@/theme/tokens";

import { FatigueScreen } from "./fatigue-screen";
import type { FatigueEvent } from "./types";

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

function serveEvents(events: FatigueEvent[]): void {
  server.use(
    http.get(apiUrl("/fatigue/events"), () => HttpResponse.json(events)),
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

describe("Today's events", () => {
  it("shows the title, the count and one row per event, oldest first (3.1)", async () => {
    serveEvents([...fatigueEventsFixture].reverse());
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Today's events")).toBeOnTheScreen();
    expect(screen.getByText("5 events")).toBeOnTheScreen();
    const rows = screen.getAllByTestId("today-event");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]!).getByText("Day started")).toBeOnTheScreen();
    expect(within(rows[4]!).getByText("Back to work")).toBeOnTheScreen();
  });

  it("names the four types (3.2)", async () => {
    serveEvents([
      { ...fatigueEventsFixture[0]! },
      { ...fatigueEventsFixture[1]! },
      { ...fatigueEventsFixture[2]! },
      {
        id: "e9",
        eventType: "DAY_END",
        driverId: "driver-1",
        timestamp: "2026-11-27T01:34:00.000Z",
      },
    ]);
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("Day started")).toBeOnTheScreen();
    expect(screen.getByText("Break started")).toBeOnTheScreen();
    expect(screen.getByText("Back to work")).toBeOnTheScreen();
    expect(screen.getByText("Day ended")).toBeOnTheScreen();
  });

  it("adds the length to a finished break (3.3)", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("9:48 AM · 15 min")).toBeOnTheScreen();
    expect(screen.getByText("12:00 PM · 30 min")).toBeOnTheScreen();
  });

  it("leaves the length out of a break that has not ended", async () => {
    serveEvents(fatigueEventsFixture.slice(0, 2));
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText(/^9:48 AM/)).toBeOnTheScreen();
    expect(screen.queryByText(/min$/)).not.toBeOnTheScreen();
  });

  it("marks the last event as current with its time in green (3.4)", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("12:30 PM · current")).toBeOnTheScreen();
    const rows = screen.getAllByTestId("today-event");
    const time = within(rows[4]!).getByText("12:30");
    expect(StyleSheet.flatten(time.props.style)?.color).toBe(
      palette.emerald700,
    );
    expect(screen.getAllByText(/current/)).toHaveLength(1);
  });

  it("shows the times in Melbourne, not UTC (3.5)", async () => {
    await renderWithQuery(<FatigueScreen />);

    // 2026-11-26T19:35Z es 6:35 AM del 27 en Melbourne (UTC+11).
    expect(await screen.findByText("6:35 AM")).toBeOnTheScreen();
  });

  it("asks the back for the Melbourne day (3.5)", async () => {
    let from: string | null = null;
    server.use(
      http.get(apiUrl("/fatigue/events"), ({ request }) => {
        from = new URL(request.url).searchParams.get("from");
        return HttpResponse.json([]);
      }),
    );
    await renderWithQuery(<FatigueScreen />);

    await screen.findByText("Today's events");
    expect(from).toBe("2026-11-26T13:00:00.000Z");
  });

  it("says there are no events yet when the day is empty (3.6)", async () => {
    serveEvents([]);
    await renderWithQuery(<FatigueScreen />);

    expect(await screen.findByText("No events yet today.")).toBeOnTheScreen();
    expect(screen.queryByText("0 events")).not.toBeOnTheScreen();
  });

  it("shows a skeleton while the events load", async () => {
    server.use(
      http.get(apiUrl("/fatigue/events"), () => new Promise(() => undefined)),
    );
    await renderWithQuery(<FatigueScreen />);

    expect(
      await screen.findByTestId("today-events-skeleton"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No events yet today.")).not.toBeOnTheScreen();
  });

  it("shows its own error and keeps the ring and the buttons (3.7)", async () => {
    server.use(
      http.get(
        apiUrl("/fatigue/events"),
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await renderWithQuery(<FatigueScreen />);

    expect(
      await screen.findByText("Could not load today's events."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Try again" })).toBeOnTheScreen();
    expect(screen.getByText("Working")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: /Take Break/ }),
    ).toBeOnTheScreen();
  });

  it("never draws text below the body size (FR-015)", async () => {
    await renderWithQuery(<FatigueScreen />);
    await screen.findByText("Today's events");

    const sizes = within(screen.getByTestId("today-events"))
      .getAllByText(/.+/)
      .map((text) => StyleSheet.flatten(text.props.style)?.fontSize);

    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(fontSize.body);
    }
  });
});
