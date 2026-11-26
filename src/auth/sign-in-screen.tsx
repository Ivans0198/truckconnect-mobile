import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import {
  brandGradient,
  colors,
  fontFamily,
  fontSize,
  loginOverlay,
  palette,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { useSessionStore } from "./session-store";
import { signIn, type SignInError } from "./sign-in";
import type { SignOutReason } from "./types";

const ERROR_MESSAGES: Readonly<Record<SignInError, string>> = {
  invalidCredentials:
    "Incorrect email or password, or the account is not active",
  rateLimited: "Too many attempts, try again in a moment",
  notDriver: "This app is for TruckConnect drivers only",
  unreachable: "Can't reach TruckConnect. Check your connection and try again",
};

const REASON_MESSAGES: Readonly<Record<SignOutReason, string>> = {
  expired: "Your session has expired. Please sign in again.",
  inactive: "Your account is not active. Contact your dispatcher.",
};

const FORGOT_PASSWORD_HINT = "Contact your dispatcher to reset your password";

// Heroicons del mockup 09_driver_login.html.
const CALENDAR_PATH =
  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";
const EYE_PATHS = [
  "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
] as const;
const EYE_OFF_PATH =
  "M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858.908a3 3 0 11-4.243-4.243M6.228 6.228A9.97 9.97 0 002.457 12c1.274 4.057 5.065 7 9.543 7a9.97 9.97 0 005.77-1.84";
const ICON_SIZE = 24;
const LOGO_ICON_SIZE = 32;
const LOGO_BOX_SIZE = 64;
const ICON_STROKE_WIDTH = 2;
const GRADIENT_START = { x: 0.25, y: 0 } as const;
const GRADIENT_END = { x: 0.75, y: 1 } as const;
const GRADIENT_STOPS = [0, 0.3, 0.6, 1] as const;

type FieldErrors = { email?: string; password?: string };

function validate(email: string, password: string): FieldErrors {
  return {
    email: email.trim() === "" ? "Enter your email" : undefined,
    password: password === "" ? "Enter your password" : undefined,
  };
}

function Icon({ paths }: { paths: readonly string[] }): React.JSX.Element {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      {paths.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={palette.blue200}
          strokeWidth={ICON_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

function Notice({
  message,
  tone,
}: {
  message: string;
  tone: "danger" | "info";
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: semantic[tone].background,
          borderColor: semantic[tone].accent,
        },
      ]}
    >
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.noticeText, { color: semantic[tone].text }]}
      >
        {message}
      </Text>
    </View>
  );
}

function Field({
  label,
  error,
  trailing,
  inputProps,
}: {
  label: string;
  error?: string;
  trailing?: React.ReactNode;
  inputProps: React.ComponentProps<typeof TextInput>;
}): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={palette.blue200}
          {...inputProps}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            trailing ? styles.inputWithTrailing : null,
            isFocused ? styles.inputFocused : null,
          ]}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function SignInScreen(): React.JSX.Element {
  const reason = useSessionStore((s) =>
    s.session.status === "signedOut" ? s.session.reason : null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [signInError, setSignInError] = useState<SignInError | null>(null);
  const [isForgotHintShown, setIsForgotHintShown] = useState(false);
  const [isPending, setIsPending] = useState(false);
  // El estado se actualiza al terminar el render; el ref frena un segundo
  // toque que llegue antes.
  const isSubmitting = useRef(false);

  const submit = async (): Promise<void> => {
    if (isSubmitting.current) return;
    const errors = validate(email, password);
    setFieldErrors(errors);
    setIsForgotHintShown(false);
    if (errors.email || errors.password) return;

    isSubmitting.current = true;
    setIsPending(true);
    setSignInError(null);
    const result = await signIn({ email, password });
    isSubmitting.current = false;
    setIsPending(false);
    if (result.kind === "error") setSignInError(result.error);
  };

  const shownError = signInError ? ERROR_MESSAGES[signInError] : null;

  return (
    <LinearGradient
      colors={brandGradient}
      locations={GRADIENT_STOPS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Svg
                width={LOGO_ICON_SIZE}
                height={LOGO_ICON_SIZE}
                viewBox="0 0 24 24"
                fill="none"
              >
                <Path
                  d={CALENDAR_PATH}
                  stroke={colors.onPrimary}
                  strokeWidth={ICON_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View>
              <Text style={styles.brand}>TruckConnect</Text>
              <Text style={styles.brandSub}>Driver App</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.heading}>
            Welcome back
          </Text>
          <Text style={styles.subheading}>Sign in to start your day</Text>

          {reason ? (
            <Notice message={REASON_MESSAGES[reason]} tone="info" />
          ) : null}
          {shownError ? <Notice message={shownError} tone="danger" /> : null}
          {isForgotHintShown ? (
            <Notice message={FORGOT_PASSWORD_HINT} tone="info" />
          ) : null}

          <Field
            label="Email"
            error={fieldErrors.email}
            inputProps={{
              value: email,
              onChangeText: setEmail,
              autoCapitalize: "none",
              autoCorrect: false,
              autoComplete: "email",
              keyboardType: "email-address",
              textContentType: "username",
            }}
          />
          <Field
            label="Password"
            error={fieldErrors.password}
            inputProps={{
              value: password,
              onChangeText: setPassword,
              secureTextEntry: !isPasswordShown,
              autoCapitalize: "none",
              autoCorrect: false,
              autoComplete: "current-password",
              textContentType: "password",
              onSubmitEditing: () => void submit(),
            }}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isPasswordShown ? "Hide password" : "Show password"
                }
                onPress={() => setIsPasswordShown((shown) => !shown)}
                style={styles.eyeButton}
              >
                <Icon paths={isPasswordShown ? [EYE_OFF_PATH] : EYE_PATHS} />
              </Pressable>
            }
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsForgotHintShown(true)}
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => void submit()}
            style={[styles.signIn, isPending ? styles.signInPending : null]}
          >
            <Text style={styles.signInText}>
              {isPending ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>

          {signInError === "unreachable" && !isPending ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void submit()}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}

          <Text style={styles.terms}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: loginOverlay.border,
    backgroundColor: loginOverlay.field,
  },
  brand: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
  brandSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: palette.blue200,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    color: colors.onPrimary,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: palette.blue100,
    marginBottom: spacing.xl,
  },
  notice: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
  },
  field: { marginBottom: spacing.lg },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: palette.blue100,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: loginOverlay.border,
    backgroundColor: loginOverlay.field,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.onPrimary,
  },
  inputWithTrailing: { paddingRight: TOUCH_TARGET_MIN },
  inputFocused: {
    borderColor: loginOverlay.borderFocused,
    backgroundColor: loginOverlay.fieldFocused,
  },
  trailing: { position: "absolute", right: 0, top: 0 },
  eyeButton: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldError: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.onPrimary,
  },
  forgot: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignSelf: "flex-end",
    justifyContent: "center",
  },
  forgotText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    color: palette.blue100,
  },
  signIn: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  signInPending: { opacity: 0.7 },
  signInText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: palette.blue900,
  },
  retry: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: loginOverlay.border,
    backgroundColor: loginOverlay.field,
  },
  retryText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.onPrimary,
  },
  terms: {
    marginTop: "auto",
    paddingTop: spacing.xl,
    textAlign: "center",
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: palette.blue200,
  },
});
