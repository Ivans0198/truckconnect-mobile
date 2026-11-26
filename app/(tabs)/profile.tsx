import { StyleSheet, View } from "react-native";

import { SignOutButton } from "@/auth/sign-out-button";
import { TitleScreen } from "@/navigation/title-screen";
import { spacing } from "@/theme/tokens";

// El resto de Profile (datos, vehículo, ajustes) llega con su épica.
export default function ProfileScreen(): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <TitleScreen title="Profile" />
      <View style={styles.actions}>
        <SignOutButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  actions: { padding: spacing.xl },
});
