import { StyleSheet, Text, View } from "react-native";

import { NotificationBell } from "@/notifications/notification-bell";
import { colors, fontFamily, fontSize, spacing } from "@/theme/tokens";

// Aparte de la ruta para que las historias de E5 le sumen cosas sin tocar
// app/(tabs)/index.tsx (que decide E2).
export function HomeHeader(): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        Home
      </Text>
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
});
