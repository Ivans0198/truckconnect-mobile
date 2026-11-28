import { StyleSheet, View } from "react-native";

import { ComplianceBanner } from "@/compliance/compliance-banner";
import { HomeHeader } from "@/home/home-header";
import { colors, spacing } from "@/theme/tokens";

export default function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <View style={styles.banner}>
        <ComplianceBanner />
      </View>
      <HomeHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  banner: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});
