import { ScrollView, StyleSheet, View } from "react-native";

import { ComplianceBanner } from "@/compliance/compliance-banner";
import { HomeHeader } from "@/home/home-header";
import { colors, spacing } from "@/theme/tokens";

export default function HomeScreen(): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.header}>
        <HomeHeader />
      </View>
      <View style={styles.banner}>
        <ComplianceBanner />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  // El encabezado no crece: el aviso queda debajo de él, no al pie.
  header: { flexGrow: 0 },
  banner: { paddingHorizontal: spacing.xl },
});
