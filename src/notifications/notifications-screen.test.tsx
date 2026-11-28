import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import {
  emptyNotificationsPage,
  notification,
  notificationsPage,
} from "@/test/notification-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize, TOUCH_TARGET_MIN } from "@/theme/tokens";

import { NotificationsScreen } from "./notifications-screen";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: () => true,
    replace: jest.fn(),
  }),
  useIsFocused: () => true,
}));

// Viernes 27 nov 2026, 12:35 en Melbourne.
const NOW = new Date("2026-11-27T01:35:00.000Z");

type Item = ReturnType<typeof notification>;

function serveList(items: Item[], unread?: number): void {
  server.use(
    http.get(apiUrl("/notifications"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (params.get("unread") === "true") {
        return HttpResponse.json({
          ...emptyNotificationsPage,
          total: unread ?? items.filter((item) => !item.read).length,
        });
      }
      return HttpResponse.json({
        ...emptyNotificationsPage,
        items,
        total: items.length,
      });
    }),
  );
}

beforeEach(() => {
  mockBack.mockClear();
  jest.useFakeTimers({
    advanceTimers: true,
    now: NOW,
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

const today = notification({
  id: "today",
  title: "Order TC-1 assigned",
  body: "Pickup at Laverton North.",
  sentAt: "2026-11-26T22:41:00.000Z",
});
const yesterday = notification({
  id: "yesterday",
  title: "Licence reminder",
  body: "Renew soon.",
  read: true,
  sentAt: null,
  createdAt: "2026-11-25T23:30:00.000Z",
});
const older = notification({
  id: "older",
  title: "Welcome",
  body: "Glad to have you.",
  read: true,
  sentAt: "2026-11-12T00:10:00.000Z",
});

// Un desplazamiento hasta el final: la lista avisa que llegó al último elemento.
async function scrollToEnd(): Promise<void> {
  const list = screen.getByTestId("notifications-list");
  await fireEvent(list, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 393, height: 800 } },
  });
  await fireEvent(list, "contentSizeChange", 393, 2400);
  await fireEvent.scroll(list, {
    nativeEvent: {
      contentOffset: { x: 0, y: 2000 },
      contentSize: { width: 393, height: 2400 },
      layoutMeasurement: { width: 393, height: 800 },
    },
  });
}

describe("NotificationsScreen", () => {
  it("lists title, body and Melbourne time in the order the back sends", async () => {
    serveList([today, yesterday, older]);
    await renderWithQuery(<NotificationsScreen />);

    expect(
      await screen.findByRole("header", { name: "Notifications" }),
    ).toBeOnTheScreen();
    expect(await screen.findByText("Order TC-1 assigned")).toBeOnTheScreen();
    expect(screen.getByText("Pickup at Laverton North.")).toBeOnTheScreen();
    expect(screen.getByText("9:41 AM")).toBeOnTheScreen();
    expect(screen.getByText("Yesterday")).toBeOnTheScreen();
    expect(screen.getByText("12 Nov")).toBeOnTheScreen();
    const titles = screen
      .getAllByText(/Order TC-1 assigned|Licence reminder|Welcome/)
      .map((node) => node.props.children);
    expect(titles).toEqual([
      "Order TC-1 assigned",
      "Licence reminder",
      "Welcome",
    ]);
  });

  it("marks unread ones with the word New and not only a colour", async () => {
    serveList([today, yesterday]);
    await renderWithQuery(<NotificationsScreen />);

    await screen.findByText("Order TC-1 assigned");

    expect(screen.getAllByText("New")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /Unread.*Order TC-1 assigned/ }),
    ).toBeOnTheScreen();
  });

  it("marks one read in the back when it is tapped and drops the highlight", async () => {
    serveList([today, yesterday]);
    let patched: string | undefined;
    server.use(
      http.patch(apiUrl("/notifications/:id/read"), ({ params }) => {
        patched = params.id as string;
        return HttpResponse.json({ ...today, read: true });
      }),
    );
    await renderWithQuery(<NotificationsScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: /Order TC-1 assigned/ }),
    );

    await waitFor(() => expect(patched).toBe("today"));
    expect(screen.queryByText("New")).not.toBeOnTheScreen();
  });

  it("puts the notification back to unread and says so when marking fails", async () => {
    serveList([today]);
    server.use(
      http.patch(apiUrl("/notifications/:id/read"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    await renderWithQuery(<NotificationsScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: /Order TC-1 assigned/ }),
    );

    expect(
      await screen.findByText("Couldn't mark it as read. Try again."),
    ).toBeOnTheScreen();
    expect(await screen.findByText("New")).toBeOnTheScreen();
  });

  it("marks all read and shows none as new afterwards", async () => {
    let unread = true;
    server.use(
      http.get(apiUrl("/notifications"), ({ request }) => {
        const asksCount =
          new URL(request.url).searchParams.get("unread") === "true";
        if (asksCount) {
          return HttpResponse.json({
            ...emptyNotificationsPage,
            total: unread ? 1 : 0,
          });
        }
        return HttpResponse.json({
          ...emptyNotificationsPage,
          items: [{ ...today, read: !unread }],
          total: 1,
        });
      }),
      http.patch(apiUrl("/notifications/read-all"), () => {
        unread = false;
        return HttpResponse.json({ updated: 1 });
      }),
    );
    await renderWithQuery(<NotificationsScreen />);
    await screen.findByText("New");

    await fireEvent.press(
      screen.getByRole("button", { name: "Mark all read" }),
    );

    await waitFor(() =>
      expect(screen.queryByText("New")).not.toBeOnTheScreen(),
    );
    expect(
      screen.queryByRole("button", { name: "Mark all read" }),
    ).not.toBeOnTheScreen();
  });

  it("loads the second page at the end of the list and stops at totalPages", async () => {
    const pagesAsked: string[] = [];
    server.use(
      http.get(apiUrl("/notifications"), ({ request }) => {
        const params = new URL(request.url).searchParams;
        const page = Number(params.get("page"));
        pagesAsked.push(`${page}/${params.get("limit")}`);
        return HttpResponse.json(notificationsPage(page === 2 ? 2 : 1));
      }),
    );
    await renderWithQuery(<NotificationsScreen />);
    await screen.findByText("Notification 1");

    await scrollToEnd();
    await screen.findByText("Notification 21");
    await scrollToEnd();

    expect(pagesAsked.filter((asked) => asked.startsWith("2"))).toEqual([
      "2/20",
    ]);
    expect(pagesAsked.some((asked) => asked.startsWith("3"))).toBe(false);
  });

  it("says You're all caught up with no notifications", async () => {
    serveList([]);
    await renderWithQuery(<NotificationsScreen />);

    expect(await screen.findByText("You're all caught up")).toBeOnTheScreen();
  });

  it("shows a skeleton while loading", async () => {
    serveList([today]);
    await renderWithQuery(<NotificationsScreen />);

    expect(screen.getByTestId("notifications-skeleton")).toBeOnTheScreen();
    await screen.findByText("Order TC-1 assigned");
    expect(
      screen.queryByTestId("notifications-skeleton"),
    ).not.toBeOnTheScreen();
  });

  it("shows an error with Try again that asks again", async () => {
    server.use(
      http.get(apiUrl("/notifications"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    await renderWithQuery(<NotificationsScreen />);
    expect(
      await screen.findByText(
        "Could not load your notifications. Check your connection.",
      ),
    ).toBeOnTheScreen();

    serveList([today]);
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Order TC-1 assigned")).toBeOnTheScreen();
  });

  it("asks again when the driver pulls down", async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl("/notifications"), () => {
        calls += 1;
        return HttpResponse.json({ ...emptyNotificationsPage, items: [today] });
      }),
    );
    await renderWithQuery(<NotificationsScreen />);
    await screen.findByText("Order TC-1 assigned");
    const before = calls;

    await act(async () => {
      await screen
        .getByTestId("notifications-list")
        .props.refreshControl.props.onRefresh();
    });

    expect(calls).toBeGreaterThan(before);
  });

  it("goes back with the back arrow", async () => {
    serveList([]);
    await renderWithQuery(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalled();
  });

  it("keeps a long body whole and rows and text at driver sizes", async () => {
    const longBody = "Very long body. ".repeat(40).trim();
    serveList([{ ...today, body: longBody }]);
    await renderWithQuery(<NotificationsScreen />);

    const body = await screen.findByText(longBody);
    expect(body.props.numberOfLines).toBeUndefined();
    const row = screen.getByRole("button", { name: /Order TC-1 assigned/ });
    expect(
      StyleSheet.flatten(row.props.style).minHeight,
    ).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
    const sizes = [
      screen.getByText("Order TC-1 assigned"),
      body,
      screen.getByText("9:41 AM"),
      screen.getByText("New"),
    ].map((text) => StyleSheet.flatten(text.props.style).fontSize);
    for (const size of sizes)
      expect(size).toBeGreaterThanOrEqual(fontSize.body);
  });
});
