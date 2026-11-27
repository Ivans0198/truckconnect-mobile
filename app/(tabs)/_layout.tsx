import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBar } from "@/navigation/tab-bar";
import { colors } from "@/theme/tokens";

export default function TabsLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Una sola vez para todas las pestañas: ninguna pantalla tiene que
        // acordarse de la barra de estado. El color es el de los encabezados
        // (surface), para que la franja se lea como parte de ellos.
        sceneStyle: { paddingTop: insets.top, backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="fatigue" options={{ title: "Fatigue" }} />
      <Tabs.Screen name="docs" options={{ title: "Docs" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
