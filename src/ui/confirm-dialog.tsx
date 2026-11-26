import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  scrim,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

const TITLE_ID = "confirm-dialog-title";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Modal de React Native y no Alert.alert: Alert no hace nada en
// react-native-web, y así Playwright y el ui-reviewer también lo ven.
export function ConfirmDialog({
  visible,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          role="dialog"
          aria-modal
          aria-labelledby={TITLE_ID}
          testID="confirm-dialog"
          style={styles.card}
        >
          <Text
            nativeID={TITLE_ID}
            accessibilityRole="header"
            style={styles.title}
          >
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.button,
              styles.confirm,
              pressed && styles.confirmPressed,
            ]}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.button,
              styles.cancel,
              pressed && styles.cancelPressed,
            ]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: scrim,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
  button: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
  },
  confirm: { backgroundColor: palette.red600 },
  confirmPressed: { backgroundColor: palette.red700 },
  confirmText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
  cancel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelPressed: { backgroundColor: palette.slate100 },
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
});
