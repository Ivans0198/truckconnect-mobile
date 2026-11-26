import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  colors,
  palette,
  fontFamily,
  fontSize,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { TabIcon, type TabIconName } from "./tab-icons";

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const ICON_SIZE = 24;

const TAB_ICONS: Readonly<Partial<Record<string, TabIconName>>> = {
  index: "home",
  fatigue: "fatigue",
  docs: "docs",
  profile: "profile",
};

function iconFor(routeName: string): TabIconName {
  const icon = TAB_ICONS[routeName];
  if (!icon) throw new Error(`No tab icon for route "${routeName}"`);
  return icon;
}

export function TabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: TabBarProps): React.JSX.Element {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}
    >
      {state.routes.map((route, index) => {
        const isSelected = state.index === index;
        const title = descriptors[route.key]?.options.title ?? route.name;
        const tint = isSelected ? colors.primary : colors.textMuted;

        const press = (): void => {
          const event = emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isSelected && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            aria-selected={isSelected}
            onPress={press}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          >
            <TabIcon name={iconFor(route.name)} color={tint} size={ICON_SIZE} />
            <Text
              style={[
                styles.label,
                { color: tint },
                isSelected ? styles.labelSelected : null,
              ]}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  tabPressed: { backgroundColor: palette.slate100 },
  label: { fontSize: fontSize.body, fontFamily: fontFamily.medium },
  labelSelected: { fontFamily: fontFamily.semibold },
});
