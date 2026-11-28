import { test, expect, type Page } from "@playwright/test";

import {
  FIXED_NOW,
  expectFullPageScreenshot,
  expectNoAxeViolations,
  fulfillJson,
  mockDriverLogin,
  mockEmptyLists,
  signInAsDriver,
  viewports,
} from "./support/app";

type Item = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  sentAt: string;
};

const items: Item[] = [
  {
    id: "n1",
    title: "Order TC-1042 assigned",
    body: "Pickup at Laverton North at 2:30 PM.",
    read: false,
    sentAt: "2026-11-26T22:41:00.000Z",
  },
  {
    id: "n2",
    title: "Public Liability expires soon",
    body: "Renew before 17 Dec 2026 to keep driving.",
    read: false,
    sentAt: "2026-11-26T01:10:00.000Z",
  },
  {
    id: "n3",
    title: "Welcome to TruckConnect",
    body: "Your account is ready.",
    read: true,
    sentAt: "2026-11-12T00:10:00.000Z",
  },
];

function notification(item: Item) {
  return {
    ...item,
    type: "COMPLIANCE_EXPIRING",
    channel: "PUSH",
    metadata: null,
    createdAt: item.sentAt,
  };
}

async function serveNotifications(page: Page, list: Item[]): Promise<void> {
  await page.route("**/notifications**", (route) => {
    const unreadOnly =
      new URL(route.request().url()).searchParams.get("unread") === "true";
    const unread = list.filter((item) => !item.read).length;
    return route.fulfill(
      fulfillJson({
        items: unreadOnly ? [] : list.map(notification),
        total: unreadOnly ? unread : list.length,
        page: 1,
        limit: unreadOnly ? 1 : 20,
        totalPages: 1,
      }),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await mockEmptyLists(page);
  await mockDriverLogin(page);
});

for (const vp of viewports) {
  test.describe(`notifications @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows the bell dot on Home", async ({ page }) => {
      await serveNotifications(page, items);
      await signInAsDriver(page);

      await expect(
        page.getByRole("button", { name: "Notifications, 2 unread" }),
      ).toBeVisible();
      await expectFullPageScreenshot(page, `home-bell-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("lists read and unread notifications", async ({ page }) => {
      await serveNotifications(page, items);
      await signInAsDriver(page);
      await page
        .getByRole("button", { name: "Notifications, 2 unread" })
        .click();

      await expect(
        page.getByRole("heading", { name: "Notifications" }),
      ).toBeVisible();
      await expect(page.getByText("Order TC-1042 assigned")).toBeVisible();
      await expect(page.getByText("9:41 AM")).toBeVisible();
      await expect(page.getByText("12 Nov")).toBeVisible();
      await expect(page.getByText("New", { exact: true })).toHaveCount(2);
      await expectFullPageScreenshot(page, `notifications-list-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("says You're all caught up when empty", async ({ page }) => {
      await serveNotifications(page, []);
      await signInAsDriver(page);
      await page.getByRole("button", { name: "Notifications" }).click();

      await expect(page.getByText("You're all caught up")).toBeVisible();
      await expectFullPageScreenshot(
        page,
        `notifications-empty-${vp.name}.png`,
      );
      await expectNoAxeViolations(page);
    });
  });
}
