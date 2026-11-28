import { focusManager } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { emptyNotificationsPage } from "@/test/notification-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { TOUCH_TARGET_MIN } from "@/theme/tokens";

import { NotificationBell } from "./notification-bell";
import { UNREAD_REFRESH_MS } from "./queries";

const mockPush = jest.fn();
let mockIsFocused = true;
jest.mock("expo-router", () => ({
  router: { push: (path: string) => mockPush(path) },
  useIsFocused: () => mockIsFocused,
}));

function serveUnread(total: number): { calls: () => number } {
  let calls = 0;
  server.use(
    http.get(apiUrl("/notifications"), () => {
      calls += 1;
      return HttpResponse.json({ ...emptyNotificationsPage, total });
    }),
  );
  return { calls: () => calls };
}

beforeEach(() => {
  mockPush.mockClear();
  mockIsFocused = true;
  jest.useFakeTimers({
    advanceTimers: true,
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("NotificationBell", () => {
  it("shows a red dot and says how many are unread", async () => {
    serveUnread(3);
    await renderWithQuery(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("notification-dot")).toBeOnTheScreen();
  });

  it("has no dot and a plain name when nothing is unread", async () => {
    serveUnread(0);
    await renderWithQuery(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications" }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("notification-dot")).not.toBeOnTheScreen();
  });

  it("is a plain bell until the count arrives and stays one if it fails", async () => {
    server.use(
      http.get(apiUrl("/notifications"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    await renderWithQuery(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications" }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("notification-dot")).not.toBeOnTheScreen();
  });

  it("is at least 60 wide and tall", async () => {
    serveUnread(0);
    await renderWithQuery(<NotificationBell />);

    const style = StyleSheet.flatten(
      (await screen.findByRole("button", { name: "Notifications" })).props
        .style,
    );
    expect(style.width).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
  });

  it("opens the notifications list when tapped", async () => {
    serveUnread(1);
    await renderWithQuery(<NotificationBell />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Notifications, 1 unread" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });

  it("asks again every minute while Home is in view", async () => {
    const served = serveUnread(1);
    await renderWithQuery(<NotificationBell />);
    await screen.findByRole("button", { name: "Notifications, 1 unread" });
    const before = served.calls();

    serveUnread(4);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(UNREAD_REFRESH_MS);
    });

    expect(
      await screen.findByRole("button", { name: "Notifications, 4 unread" }),
    ).toBeOnTheScreen();
    expect(before).toBe(1);
  });

  it("does not ask on a timer while Home is out of view", async () => {
    mockIsFocused = false;
    const served = serveUnread(1);
    await renderWithQuery(<NotificationBell />);
    await screen.findByRole("button", { name: "Notifications, 1 unread" });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(UNREAD_REFRESH_MS * 3);
    });

    expect(served.calls()).toBe(1);
  });

  it("asks again when the app comes back to the foreground", async () => {
    const served = serveUnread(1);
    await renderWithQuery(<NotificationBell />);
    await screen.findByRole("button", { name: "Notifications, 1 unread" });

    serveUnread(2);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    expect(
      await screen.findByRole("button", { name: "Notifications, 2 unread" }),
    ).toBeOnTheScreen();
    expect(served.calls()).toBe(1);
  });
});
