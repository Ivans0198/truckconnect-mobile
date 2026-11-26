import { Tabs } from "expo-router";

import { TabBar } from "@/navigation/tab-bar";

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="fatigue" options={{ title: "Fatigue" }} />
      <Tabs.Screen name="docs" options={{ title: "Docs" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
