import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ConfirmDialog } from "@/ui/confirm-dialog";
import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { fatigueActionsFor } from "./fatigue-actions";
import type { FatigueAction } from "./fatigue-actions";
import { actionErrorOf, useFatigueAction } from "./mutations";
import type { FatigueState } from "./types";

type ButtonTone = "primary" | "break" | "end";

const LABELS: Record<FatigueAction, string> = {
  "start-day": "Start Day",
  "start-break": "Take Break",
  "end-break": "End Break",
  "end-day": "End Day",
};

const TONES: Record<FatigueAction, ButtonTone> = {
  "start-day": "primary",
  "start-break": "break",
  "end-break": "primary",
  "end-day": "end",
};

// Lo que no se registró, para "No connection. Your <x> was not recorded."
const UNRECORDED: Record<FatigueAction, string> = {
  "start-day": "day start",
  "start-break": "break",
  "end-break": "break end",
  "end-day": "day end",
};

const PENDING_LABEL = "Saving...";
const RATE_LIMITED_MESSAGE = "Too many attempts, try again in a moment";

type FatigueActionBarProps = { state: FatigueState };

export function FatigueActionBar({
  state,
}: FatigueActionBarProps): React.JSX.Element {
  const startDay = useFatigueAction("start-day");
  const startBreak = useFatigueAction("start-break");
  const endBreak = useFatigueAction("end-break");
  const endDay = useFatigueAction("end-day");
  const mutations = {
    "start-day": startDay,
    "start-break": startBreak,
    "end-break": endBreak,
    "end-day": endDay,
  };
  const [isConfirming, setIsConfirming] = useState(false);
  const [lastAction, setLastAction] = useState<FatigueAction | null>(null);

  const isBusy = Object.values(mutations).some((m) => m.isPending);
  const failure = lastAction
    ? actionErrorOf(mutations[lastAction].error)
    : null;

  const run = (action: FatigueAction): void => {
    if (isBusy) return;
    setLastAction(action);
    mutations[action].mutate();
  };

  const onPress = (action: FatigueAction): void => {
    if (action === "end-day") setIsConfirming(true);
    else run(action);
  };

  const actions = fatigueActionsFor(state);
  const isSingle = actions.length === 1;

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {actions.map((action) => (
          <ActionButton
            key={action}
            tone={TONES[action]}
            isLarge={isSingle}
            isPending={mutations[action].isPending}
            isDisabled={isBusy}
            label={LABELS[action]}
            onPress={() => onPress(action)}
          />
        ))}
      </View>
      {failure && lastAction ? (
        <FailureMessage
          failure={failure}
          action={lastAction}
          onRetry={() => run(lastAction)}
        />
      ) : null}
      <ConfirmDialog
        visible={isConfirming}
        title="End your day?"
        confirmLabel="Yes, end day"
        cancelLabel="Keep working"
        onConfirm={() => {
          setIsConfirming(false);
          run("end-day");
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </View>
  );
}

type ActionButtonProps = {
  tone: ButtonTone;
  isLarge: boolean;
  isPending: boolean;
  isDisabled: boolean;
  label: string;
  onPress: () => void;
};

function ActionButton({
  tone,
  isLarge,
  isPending,
  isDisabled,
  label,
  onPress,
}: ActionButtonProps): React.JSX.Element {
  const text = isPending ? PENDING_LABEL : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: isDisabled, busy: isPending }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isLarge && styles.buttonLarge,
        BUTTON_STYLES[tone].box,
        pressed && BUTTON_STYLES[tone].pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, BUTTON_STYLES[tone].text]}>{text}</Text>
    </Pressable>
  );
}

type FailureMessageProps = {
  failure: NonNullable<ReturnType<typeof actionErrorOf>>;
  action: FatigueAction;
  onRetry: () => void;
};

function FailureMessage({
  failure,
  action,
  onRetry,
}: FailureMessageProps): React.JSX.Element {
  const message =
    failure.kind === "offline"
      ? `No connection. Your ${UNRECORDED[action]} was not recorded.`
      : failure.kind === "rate-limited"
        ? RATE_LIMITED_MESSAGE
        : failure.message;
  return (
    <View style={styles.error}>
      <Text accessibilityLiveRegion="polite" style={styles.errorText}>
        {message}
      </Text>
      {failure.kind === "offline" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.retryPressed,
          ]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const OUTLINE_WIDTH = 2;
const DISABLED_OPACITY = 0.6;

const BUTTON_STYLES = {
  primary: {
    box: { backgroundColor: colors.primary },
    pressed: { backgroundColor: colors.primaryPressed },
    text: { color: colors.onPrimary },
  },
  break: {
    box: { backgroundColor: palette.amber500 },
    pressed: { backgroundColor: palette.amber700 },
    text: { color: palette.slate900 },
  },
  end: {
    box: {
      backgroundColor: colors.surface,
      borderWidth: OUTLINE_WIDTH,
      borderColor: palette.red200,
    },
    pressed: { backgroundColor: palette.red50 },
    text: { color: palette.red700 },
  },
} as const;

const LARGE_BUTTON_HEIGHT = 72;

const styles = StyleSheet.create({
  bar: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  button: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
  },
  buttonLarge: { minHeight: LARGE_BUTTON_HEIGHT },
  disabled: { opacity: DISABLED_OPACITY },
  buttonText: { fontFamily: fontFamily.bold, fontSize: fontSize.lead },
  error: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: semantic.danger.background,
  },
  errorText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
  },
  retry: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  retryPressed: { backgroundColor: colors.primaryPressed },
  retryText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
});
