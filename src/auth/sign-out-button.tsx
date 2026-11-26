import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ConfirmDialog } from "@/ui/confirm-dialog";
import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { signOut } from "./sign-out";

// Heroicon del botón de 14_driver_profile.html.
const LOGOUT_ICON_PATH =
  "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1";
const ICON_SIZE = 24;
const ICON_STROKE_WIDTH = 2;

export function SignOutButton(): React.JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false);

  const confirm = (): void => {
    setIsConfirming(false);
    void signOut();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsConfirming(true)}
        style={styles.button}
      >
        <Svg
          width={ICON_SIZE}
          height={ICON_SIZE}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            d={LOGOUT_ICON_PATH}
            stroke={palette.red600}
            strokeWidth={ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.label}>Log out</Text>
      </Pressable>
      <ConfirmDialog
        visible={isConfirming}
        title="Log out?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        onConfirm={confirm}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.red200,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: palette.red600,
  },
});
