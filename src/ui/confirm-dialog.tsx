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
          testID="confirm-dialog"
          style={styles.card}
        >
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={[styles.button, styles.confirm]}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={[styles.button, styles.cancel]}
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
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  title: {
    marginBottom: spacing.sm,
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
  cancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
});
