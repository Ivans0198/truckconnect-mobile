import { Pressable, StyleSheet, Text } from "react-native";

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
    justifyContent: "center",
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
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
});
