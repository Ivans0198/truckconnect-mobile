import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { Account } from "@/auth/types";
import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { emergencyContactOf } from "./profile-format";

// Heroicons del mockup 14.
const EMAIL_ICON =
  "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
const PHONE_ICON =
  "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z";
const EMERGENCY_ICON =
  "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636";
const ICON_SIZE = 20;
const NOT_SET = "Not set";

export function PersonalInfo({
  account,
}: {
  account: Account;
}): React.JSX.Element {
  const contact = emergencyContactOf(account.emergencyContact);
  return (
    <View style={styles.card}>
      <Row icon={EMAIL_ICON} label="Email" value={account.email} />
      <Row icon={PHONE_ICON} label="Phone" value={account.phone} divided />
      <Row
        icon={EMERGENCY_ICON}
        label="Emergency contact"
        value={contact ? `${contact.name} · ${contact.phone}` : NOT_SET}
        divided
      />
    </View>
  );
}

type RowProps = {
  icon: string;
  label: string;
  value: string;
  divided?: boolean;
};

// Solo lectura: sin flecha y sin Pressable.
function Row({ icon, label, value, divided }: RowProps): React.JSX.Element {
  return (
    <View style={[styles.row, divided && styles.divided]}>
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d={icon}
          stroke={palette.slate400}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divided: { borderTopWidth: 1, borderTopColor: palette.slate100 },
  texts: { flex: 1 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  value: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
});
