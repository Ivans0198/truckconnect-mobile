import { StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

type DateFieldProps = {
  label: string;
  // YYYY-MM-DD
  value: string | null;
  onChange: (value: string) => void;
  hasError?: boolean;
};

// En web (Playwright, ui-reviewer) el campo es el selector de fecha del
// navegador. El valor sigue siendo YYYY-MM-DD.
export function DateField({
  label,
  value,
  onChange,
  hasError = false,
}: DateFieldProps): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        aria-label={label}
        aria-invalid={hasError}
        value={value ?? ""}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        style={{
          ...inputStyle,
          borderColor: hasError ? semantic.danger.accent : colors.border,
        }}
      />
    </View>
  );
}

const inputStyle = {
  boxSizing: "border-box",
  minHeight: TOUCH_TARGET_MIN,
  padding: `0 ${spacing.lg}px`,
  borderRadius: radius.xl,
  borderWidth: 2,
  borderStyle: "solid",
  backgroundColor: colors.surface,
  color: colors.text,
  fontFamily: fontFamily.semibold,
  fontSize: fontSize.lead,
} as const;

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
