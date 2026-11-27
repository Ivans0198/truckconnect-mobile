import type { components, operations } from "@/api/schema";

type Notification = components["schemas"]["NotificationResponseDto"];
type NotificationsPage =
  operations["NotificationsController_findAll"]["responses"][200]["content"]["application/json"];

export const NOTIFICATIONS_PAGE_SIZE = 20;
const TOTAL_NOTIFICATIONS = 2 * NOTIFICATIONS_PAGE_SIZE;

export function notification(
  overrides: Partial<Notification> & Pick<Notification, "id">,
): Notification {
  return {
    type: "COMPLIANCE_EXPIRING",
    channel: "PUSH",
    title: "Public Liability expires soon",
    body: "Renew before 17 Jun 2026.",
    read: false,
    metadata: null,
    sentAt: "2026-11-26T22:41:00.000Z",
    createdAt: "2026-11-26T22:40:00.000Z",
    ...overrides,
  };
}

// Cuarenta notificaciones, de la más nueva a la más vieja: las impares ya
// están leídas.
const allNotifications: Notification[] = Array.from(
  { length: TOTAL_NOTIFICATIONS },
  (_, index) =>
    notification({
      id: `notification-${index + 1}`,
      title: `Notification ${index + 1}`,
      read: (index + 1) % 2 === 1,
      sentAt: null,
      createdAt: new Date(
        Date.UTC(2026, 10, 26, 22, 0) - index * 3_600_000,
      ).toISOString(),
    }),
);

export function notificationsPage(page: 1 | 2): NotificationsPage {
  const start = (page - 1) * NOTIFICATIONS_PAGE_SIZE;
  return {
    items: allNotifications.slice(start, start + NOTIFICATIONS_PAGE_SIZE),
    total: TOTAL_NOTIFICATIONS,
    page,
    limit: NOTIFICATIONS_PAGE_SIZE,
    totalPages: 2,
  };
}

export const emptyNotificationsPage: NotificationsPage = {
  items: [],
  total: 0,
  page: 1,
  limit: NOTIFICATIONS_PAGE_SIZE,
  totalPages: 1,
};
