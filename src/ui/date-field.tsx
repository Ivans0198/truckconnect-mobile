import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMelbourneDate } from "@/format/time";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { fromCalendarDate, toCalendarDate } from "./calendar-date";

type DateFieldProps = {
  label: string;
  // YYYY-MM-DD
  value: string | null;
  onChange: (value: string) => void;
  hasError?: boolean;
};

const PLACEHOLDER = "Select date";

// El diálogo nativo de Android: escribir una fecha con el teclado es lento y
// se presta a confundir día y mes (research R7). En web lo reemplaza
// date-field.web.tsx.
export function DateField({
  label,
  value,
  onChange,
  hasError = false,
}: DateFieldProps): React.JSX.Element {
  const shown = value ? formatMelbourneDate(value) : PLACEHOLDER;

  const open = (): void => {
    DateTimePickerAndroid.open({
      mode: "date",
      value: value ? fromCalendarDate(value) : new Date(),
      onChange: (event, date) => {
        if (event.type === "set" && date) onChange(toCalendarDate(date));
      },
    });
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        onPress={open}
        style={({ pressed }) => [
          styles.button,
          hasError && styles.error,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {shown}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  button: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  error: { borderColor: semantic.danger.accent },
  pressed: { opacity: 0.85 },
  value: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  placeholder: { color: colors.textMuted },
});
