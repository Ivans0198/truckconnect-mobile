import { StyleSheet, Text, View } from "react-native";

import {
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { FormButton } from "./form-button";

type CameraRationaleProps = {
  onContinue: () => void;
  onCancel: () => void;
};

// Explica el permiso antes de que el sistema lo pida (stack profile).
export function CameraRationale({
  onContinue,
  onCancel,
}: CameraRationaleProps): React.JSX.Element {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        TruckConnect needs the camera to photograph your document. Your phone
        will ask you to allow it next.
      </Text>
      <FormButton label="Continue" variant="primary" onPress={onContinue} />
      <FormButton label="Not now" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: semantic.info.background,
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: semantic.info.text,
  },
});
