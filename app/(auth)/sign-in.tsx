import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, spacing } from "@/theme/tokens";

// US1 completa el formulario; por ahora solo el encabezado del mockup 09.
export default function SignInScreen(): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.heading}>
        Welcome back
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    color: colors.text,
  },
});
