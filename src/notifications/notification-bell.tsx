import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, palette, TOUCH_TARGET_MIN } from "@/theme/tokens";

import { useUnreadCount } from "./queries";

// Path de docs/mockups/10_driver_home.html (Heroicons, contorno de 24).
const BELL_PATH =
  "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9";
const BELL_SIZE = 28;
const BELL_STROKE_WIDTH = 1.5;
const DOT_SIZE = 12;
const NOTIFICATIONS_ROUTE = "/notifications";

export function NotificationBell(): React.JSX.Element {
  const unread = useUnreadCount().data ?? 0;
  const label =
    unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(NOTIFICATIONS_ROUTE)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg width={BELL_SIZE} height={BELL_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d={BELL_PATH}
          stroke={colors.text}
          strokeWidth={BELL_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {unread > 0 ? (
        <View testID="notification-dot" style={styles.dot} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TOUCH_TARGET_MIN,
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  dot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: palette.red500,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
