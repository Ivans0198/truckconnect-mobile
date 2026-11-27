import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { FATIGUE_NOW, fatigueStatusFixture } from "@/test/fatigue-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize, TOUCH_TARGET_MIN } from "@/theme/tokens";

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

const statusWith = (overrides: Partial<FatigueStatus>): FatigueStatus => ({
  ...fatigueStatusFixture,
  ...overrides,
});

function serveStatus(status: FatigueStatus): void {
  server.use(
    http.get(apiUrl("/fatigue/status"), () => HttpResponse.json(status)),
  );
}

type Counter = { calls: () => number };

function servePost(path: string, response: () => Response): Counter {
  let calls = 0;
  server.use(
    http.post(apiUrl(path), () => {
      calls += 1;
      return response();
    }),
  );
  return { calls: () => calls };
}

function countGets(path: string): Counter {
  let calls = 0;
  server.use(
    http.get(apiUrl(path), () => {
      calls += 1;
      return HttpResponse.json(path.endsWith("events") ? [] : weekBody);
    }),
  );
  return { calls: () => calls };
}

const weekBody = { totalHoursWorked: 28, remainingHours: 44, byDay: [] };

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

describe("Fatigue action bar", () => {
  it("shows Take Break and End Day while working", async () => {
    await renderWithQuery(<FatigueScreen />);

    expect(
      await screen.findByRole("button", { name: "Take Break" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "End Day" })).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Start Day" }),
    ).not.toBeOnTheScreen();
  });

  it("moves to On break with End Break after Take Break", async () => {
    servePost("/fatigue/start-break", () =>
      HttpResponse.json(
        statusWith({ state: "on_break", nextBreakDueAt: null }),
      ),
    );
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Take Break" }),
    );

    expect(await screen.findByText("On break")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "End Break" })).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Take Break" }),
    ).not.toBeOnTheScreen();
  });

  it("goes back to Working after End Break", async () => {
    serveStatus(statusWith({ state: "on_break", nextBreakDueAt: null }));
    servePost("/fatigue/end-break", () =>
      HttpResponse.json(fatigueStatusFixture),
    );
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "End Break" }),
    );

    expect(await screen.findByText("Working")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Take Break" }),
    ).toBeOnTheScreen();
  });

  it("asks End your day? before recording anything", async () => {
    const endDay = servePost("/fatigue/end-day", () =>
      HttpResponse.json(statusWith({ state: "off_duty" })),
    );
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "End Day" }),
    );

    expect(await screen.findByText("End your day?")).toBeOnTheScreen();
    expect(endDay.calls()).toBe(0);
  });

  it("offers End Day while on break too", async () => {
    serveStatus(statusWith({ state: "on_break", nextBreakDueAt: null }));
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "End Day" }),
    );

    expect(await screen.findByText("End your day?")).toBeOnTheScreen();
  });

  it("calls end-day and shows Off duty once confirmed", async () => {
    const endDay = servePost("/fatigue/end-day", () =>
      HttpResponse.json(
        statusWith({ state: "off_duty", nextBreakDueAt: null }),
      ),
    );
    await renderWithQuery(<FatigueScreen />);
    await fireEvent.press(
      await screen.findByRole("button", { name: "End Day" }),
    );

    await fireEvent.press(
      await screen.findByRole("button", { name: "Yes, end day" }),
    );

    expect(await screen.findByText("Off duty")).toBeOnTheScreen();
    expect(endDay.calls()).toBe(1);
  });

  it("records nothing when the driver cancels", async () => {
    const endDay = servePost("/fatigue/end-day", () =>
      HttpResponse.json(statusWith({ state: "off_duty" })),
    );
    await renderWithQuery(<FatigueScreen />);
    await fireEvent.press(
      await screen.findByRole("button", { name: "End Day" }),
    );

    await fireEvent.press(
      await screen.findByRole("button", { name: "Keep working" }),
    );

    await waitFor(() =>
      expect(screen.queryByText("End your day?")).not.toBeOnTheScreen(),
    );
    expect(endDay.calls()).toBe(0);
    expect(screen.getByText("Working")).toBeOnTheScreen();
  });

  it("shows a big Start Day when off duty and moves to Working", async () => {
    serveStatus(statusWith({ state: "off_duty", nextBreakDueAt: null }));
    servePost("/fatigue/start-day", () =>
      HttpResponse.json(fatigueStatusFixture),
    );
    await renderWithQuery(<FatigueScreen />);

    expect(
      screen.queryByRole("button", { name: "Take Break" }),
    ).not.toBeOnTheScreen();
    await fireEvent.press(
      await screen.findByRole("button", { name: "Start Day" }),
    );

    expect(await screen.findByText("Working")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Take Break" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "End Day" })).toBeOnTheScreen();
  });

  it("disables the button while pending and sends one request on a double tap", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    server.use(
      http.post(apiUrl("/fatigue/start-break"), async () => {
        calls += 1;
        await gate;
        return HttpResponse.json(
          statusWith({ state: "on_break", nextBreakDueAt: null }),
        );
      }),
    );
    await renderWithQuery(<FatigueScreen />);
    const button = await screen.findByRole("button", { name: "Take Break" });

    await fireEvent.press(button);
    await fireEvent.press(button);

    expect(
      await screen.findByRole("button", { name: "Saving..." }),
    ).toBeDisabled();
    release();
    expect(await screen.findByText("On break")).toBeOnTheScreen();
    expect(calls).toBe(1);
  });

  it("shows the back's message on a 400 and asks for the real state again", async () => {
    server.use(
      http.post(apiUrl("/fatigue/start-break"), () =>
        HttpResponse.json(
          { statusCode: 400, message: "Driver is already on break" },
          { status: 400 },
        ),
      ),
    );
    const statusReads = { n: 0 };
    server.use(
      http.get(apiUrl("/fatigue/status"), () => {
        statusReads.n += 1;
        return HttpResponse.json(
          statusReads.n === 1
            ? fatigueStatusFixture
            : statusWith({ state: "on_break", nextBreakDueAt: null }),
        );
      }),
    );
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Take Break" }),
    );

    expect(
      await screen.findByText("Driver is already on break"),
    ).toBeOnTheScreen();
    expect(await screen.findByText("On break")).toBeOnTheScreen();
  });

  it("shows the back's message on a 403", async () => {
    server.use(
      http.post(apiUrl("/fatigue/start-break"), () =>
        HttpResponse.json(
          { statusCode: 403, message: "Not allowed" },
          { status: 403 },
        ),
      ),
    );
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Take Break" }),
    );

    expect(await screen.findByText("Not allowed")).toBeOnTheScreen();
  });

  it("tells the driver to wait on a 429", async () => {
    server.use(
      http.post(apiUrl("/fatigue/start-break"), () =>
        HttpResponse.json(
          { statusCode: 429, message: "Too Many Requests" },
          { status: 429 },
        ),
      ),
    );
    await renderWithQuery(<FatigueScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Take Break" }),
    );

    expect(
      await screen.findByText("Too many attempts, try again in a moment"),
    ).toBeOnTheScreen();
  });

  it.each([
    ["start-break", "Take Break", "break"],
    ["end-day", "End Day", "day end"],
  ])(
    "says the %s was not recorded without a connection",
    async (path, name, noun) => {
      server.use(
        http.post(apiUrl(`/fatigue/${path}`), () => HttpResponse.error()),
      );
      await renderWithQuery(<FatigueScreen />);

      await fireEvent.press(await screen.findByRole("button", { name }));
      if (path === "end-day") {
        await fireEvent.press(
          await screen.findByRole("button", { name: "Yes, end day" }),
        );
      }

      expect(
        await screen.findByText(
          `No connection. Your ${noun} was not recorded.`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Try again" }),
      ).toBeOnTheScreen();
      expect(screen.getByText("Working")).toBeOnTheScreen();
    },
  );

  it("refetches the events and the week after an action", async () => {
    const events = countGets("/fatigue/events");
    const week = countGets("/fatigue/week-summary");
    servePost("/fatigue/start-break", () =>
      HttpResponse.json(
        statusWith({ state: "on_break", nextBreakDueAt: null }),
      ),
    );
    await renderWithQuery(<FatigueScreen />);
    await screen.findByText("Working");
    const eventsBefore = events.calls();
    const weekBefore = week.calls();

    await fireEvent.press(screen.getByRole("button", { name: "Take Break" }));

    await screen.findByText("On break");
    await waitFor(() => expect(week.calls()).toBeGreaterThan(weekBefore));
    expect(events.calls()).toBeGreaterThanOrEqual(eventsBefore);
  });

  it("keeps the buttons and the error text at body size or more, 60 tall", async () => {
    server.use(
      http.post(apiUrl("/fatigue/start-break"), () =>
        HttpResponse.json(
          { statusCode: 400, message: "Nope" },
          { status: 400 },
        ),
      ),
    );
    await renderWithQuery(<FatigueScreen />);
    const button = await screen.findByRole("button", { name: "Take Break" });

    const buttonStyle = StyleSheet.flatten(button.props.style);
    expect(buttonStyle.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
    expect(
      StyleSheet.flatten(screen.getByText("Take Break").props.style).fontSize,
    ).toBeGreaterThanOrEqual(fontSize.body);

    await fireEvent.press(button);
    const message = await screen.findByText("Nope");
    expect(
      StyleSheet.flatten(message.props.style).fontSize,
    ).toBeGreaterThanOrEqual(fontSize.body);
  });
});
