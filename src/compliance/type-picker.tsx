import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { DOC_TYPE_NAMES, DOC_TYPES, type DocType } from "./types";

const RADIO_SIZE = 24;
const RADIO_DOT_SIZE = 12;

type TypePickerProps = {
  selected: DocType | null;
  onSelect: (docType: DocType) => void;
};

// Los cinco tipos del contrato, en su orden fijo.
export function TypePicker({
  selected,
  onSelect,
}: TypePickerProps): React.JSX.Element {
  return (
    <>
      {DOC_TYPES.map((docType) => {
        const isSelected = docType === selected;
        return (
          <Pressable
            key={docType}
            role="radio"
            accessibilityLabel={DOC_TYPE_NAMES[docType]}
            aria-checked={isSelected}
            onPress={() => onSelect(docType)}
            style={[styles.option, isSelected && styles.selected]}
          >
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={styles.name}>{DOC_TYPE_NAMES[docType]}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: semantic.info.accent,
    backgroundColor: semantic.info.background,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  radioSelected: { borderColor: semantic.info.accent },
  radioDot: {
    width: RADIO_DOT_SIZE,
    height: RADIO_DOT_SIZE,
    borderRadius: radius.full,
    backgroundColor: semantic.info.accent,
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
});
