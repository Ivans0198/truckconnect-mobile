import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, spacing } from "@/theme/tokens";

// Las pestañas muestran solo su título hasta que llega su épica.
export function TitleScreen({ title }: { title: string }): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
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
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
});
