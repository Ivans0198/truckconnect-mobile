import { http, HttpResponse } from "msw";

import {
  emptyNotificationsPage,
  notificationsPage,
} from "@/test/notification-fixtures";
import { apiUrl, server } from "@/test/server";

import {
  NOTIFICATIONS_PAGE_SIZE,
  UNREAD_REFRESH_MS,
  fetchNotificationsPage,
  fetchUnreadCount,
  nextNotificationsPage,
} from "./queries";

describe("constants", () => {
  it("asks for 20 per page and refreshes the dot every minute", () => {
    expect(NOTIFICATIONS_PAGE_SIZE).toBe(20);
    expect(UNREAD_REFRESH_MS).toBe(60_000);
  });
});

describe("fetchNotificationsPage", () => {
  it("asks for the page with limit 20 and no unread filter", async () => {
    let search: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/notifications"), ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json(notificationsPage(2));
      }),
    );

    const page = await fetchNotificationsPage(2);

    expect(search?.get("page")).toBe("2");
    expect(search?.get("limit")).toBe("20");
    expect(search?.has("unread")).toBe(false);
    expect(page.page).toBe(2);
  });

  it("throws on a non-2xx response", async () => {
    server.use(
      http.get(apiUrl("/notifications"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    await expect(fetchNotificationsPage(1)).rejects.toThrow(/500/);
  });
});

describe("nextNotificationsPage", () => {
  it("continues until totalPages and then stops", () => {
    expect(nextNotificationsPage(notificationsPage(1))).toBe(2);
    expect(nextNotificationsPage(notificationsPage(2))).toBeUndefined();
    expect(nextNotificationsPage(emptyNotificationsPage)).toBeUndefined();
  });
});

describe("fetchUnreadCount", () => {
  it("asks for one unread item and reads total", async () => {
    let search: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/notifications"), ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json({ ...emptyNotificationsPage, total: 3 });
      }),
    );

    await expect(fetchUnreadCount()).resolves.toBe(3);

    expect(search?.get("unread")).toBe("true");
    expect(search?.get("page")).toBe("1");
    expect(search?.get("limit")).toBe("1");
  });

  it("throws on a non-2xx response", async () => {
    server.use(
      http.get(
        apiUrl("/notifications"),
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    await expect(fetchUnreadCount()).rejects.toThrow(/503/);
  });
});
