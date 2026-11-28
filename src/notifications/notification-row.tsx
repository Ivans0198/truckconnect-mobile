import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatNotificationTime } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import type { AppNotification } from "./queries";

type NotificationRowProps = {
  notification: AppNotification;
  now: Date;
  onPress: (id: string) => void;
};

// Una sin leer se distingue por la palabra "New", el título en negrita y la
// barra de acento; el color solo refuerza.
export function NotificationRow({
  notification,
  now,
  onPress,
}: NotificationRowProps): React.JSX.Element {
  const isUnread = !notification.read;
  const time = formatNotificationTime(
    notification.sentAt ?? notification.createdAt,
    now,
  );
  const label = `${isUnread ? "Unread, " : ""}${notification.title}, ${notification.body}, ${time}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isUnread }}
      disabled={!isUnread}
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.row,
        isUnread && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.title, isUnread && styles.titleUnread]}>
          {notification.title}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text style={styles.body}>{notification.body}</Text>
      {isUnread ? <Text style={styles.badge}>New</Text> : null}
    </Pressable>
  );
}

const ACCENT_BAR_WIDTH = 4;

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET_MIN,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unread: {
    borderLeftWidth: ACCENT_BAR_WIDTH,
    borderLeftColor: semantic.info.accent,
    backgroundColor: semantic.info.background,
  },
  pressed: { opacity: 0.7 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  titleUnread: { fontFamily: fontFamily.bold },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.text,
  },
  badge: {
    alignSelf: "flex-start",
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: semantic.info.text,
  },
});
