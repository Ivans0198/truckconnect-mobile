import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { SectionError } from "@/fatigue/section-error";
import { DateField } from "@/ui/date-field";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
} from "@/theme/tokens";

import { CameraRationale } from "./camera-rationale";
import {
  toSubmission,
  validateDraft,
  type DocumentDraft,
  type DraftError,
  type PickedFile,
} from "./draft";
import { FormButton } from "./form-button";
import { chooseFile, takePhoto, type PickResult } from "./pick-file";
import { submitFailureMessage, useSubmitDocument } from "./submit-document";
import { TypePicker } from "./type-picker";
import { DOC_TYPE_NAMES, type DocType } from "./types";

type DocumentFormProps = { initialType?: DocType };

type CameraState = "idle" | "explaining" | "denied";

const DRAFT_ERROR_MESSAGES: Record<DraftError, string> = {
  "missing-type": "Choose a document type.",
  "missing-file": "Add a photo or a file.",
  "missing-issue-date": "Select the issue date.",
  "missing-expiry-date": "Select the expiry date.",
  "expiry-not-after-issue": "The expiry date must be after the issue date.",
  "unsupported-file": "Use a PDF, JPEG or PNG file.",
};
const PICKER_FAILED_MESSAGE =
  "Could not open that. Try again or choose a file instead.";
const PREVIEW_SIZE = 160;

export function DocumentForm({
  initialType,
}: DocumentFormProps): React.JSX.Element {
  const router = useRouter();
  const submitDocument = useSubmitDocument();
  const [draft, setDraft] = useState<DocumentDraft>({
    docType: initialType ?? null,
    issueDate: null,
    expiryDate: null,
    file: null,
  });
  const [isChoosingType, setIsChoosingType] = useState(!initialType);
  const [camera, setCamera] = useState<CameraState>("idle");
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const errors = showErrors ? validateDraft(draft) : [];
  const errorOf = (...kinds: DraftError[]): string | null => {
    const found = errors.find((error) => kinds.includes(error));
    return found ? DRAFT_ERROR_MESSAGES[found] : null;
  };

  const update = (changes: Partial<DocumentDraft>): void =>
    setDraft((current) => ({ ...current, ...changes }));

  const receive = (result: PickResult): void => {
    if (result.kind === "permission-denied") setCamera("denied");
    else if (result.kind === "picked") update({ file: result.file });
  };

  const pick = async (open: () => Promise<PickResult>): Promise<void> => {
    setPickerError(null);
    try {
      receive(await open());
    } catch {
      setPickerError(PICKER_FAILED_MESSAGE);
    }
  };

  const onTakePhoto = (): void => {
    setCamera("idle");
    void pick(takePhoto);
  };

  const send = (): void => {
    if (submitDocument.isPending) return;
    const submission = toSubmission(draft);
    setShowErrors(true);
    if (!submission) return;
    submitDocument.mutate(submission, { onSuccess: () => router.back() });
  };

  const typeError = errorOf("missing-type");
  const fileError = errorOf("missing-file", "unsupported-file");
  const expiryError = errorOf("missing-expiry-date", "expiry-not-after-issue");
  const issueError = errorOf("missing-issue-date");

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Upload document
        </Text>
        <FormButton label="Close" onPress={() => router.back()} />
      </View>

      <Section label="Document type" error={typeError}>
        {isChoosingType ? (
          <TypePicker
            selected={draft.docType}
            onSelect={(docType) => {
              update({ docType });
              setIsChoosingType(false);
            }}
          />
        ) : (
          <View style={styles.chosen}>
            <Text style={styles.chosenName}>
              {draft.docType ? DOC_TYPE_NAMES[draft.docType] : ""}
            </Text>
            <FormButton
              label="Change type"
              onPress={() => setIsChoosingType(true)}
            />
          </View>
        )}
      </Section>

      <Section label="Document" error={fileError}>
        {draft.file ? <FilePreview file={draft.file} /> : null}
        {camera === "explaining" ? (
          <CameraRationale
            onContinue={onTakePhoto}
            onCancel={() => setCamera("idle")}
          />
        ) : (
          <FormButton
            label="Take photo"
            onPress={() => setCamera("explaining")}
          />
        )}
        {camera === "denied" ? (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            Camera access is off. To take a photo, allow the camera for
            TruckConnect in your phone&apos;s Settings. You can also choose a
            file instead.
          </Text>
        ) : null}
        <FormButton label="Choose file" onPress={() => void pick(chooseFile)} />
        {pickerError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {pickerError}
          </Text>
        ) : null}
      </Section>

      <Section label="Dates" error={null}>
        <DateField
          label="Issue date"
          value={draft.issueDate}
          hasError={issueError !== null}
          onChange={(issueDate) => update({ issueDate })}
        />
        {issueError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {issueError}
          </Text>
        ) : null}
        <DateField
          label="Expiry date"
          value={draft.expiryDate}
          hasError={expiryError !== null}
          onChange={(expiryDate) => update({ expiryDate })}
        />
        {expiryError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {expiryError}
          </Text>
        ) : null}
      </Section>

      {submitDocument.isError ? (
        <SectionError
          message={submitFailureMessage(submitDocument.error)}
          onRetry={send}
        />
      ) : null}
      {submitDocument.isPending ? (
        <Text accessibilityLiveRegion="polite" style={styles.progress}>
          Uploading your document...
        </Text>
      ) : null}
      <FormButton
        label="Submit"
        variant="primary"
        isBusy={submitDocument.isPending}
        onPress={send}
      />
    </ScrollView>
  );
}

type SectionProps = {
  label: string;
  error: string | null;
  children: React.ReactNode;
};

function Section({ label, error, children }: SectionProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function FilePreview({ file }: { file: PickedFile }): React.JSX.Element {
  const isImage = file.mimeType.startsWith("image/");
  return (
    <View style={styles.preview}>
      {isImage ? (
        <Image
          accessibilityLabel="Photo preview"
          source={{ uri: file.uri }}
          style={styles.previewImage}
        />
      ) : null}
      <Text style={styles.fileName}>{file.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.xl, padding: spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
  section: { gap: spacing.md },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chosen: { gap: spacing.md },
  chosenName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  preview: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  previewImage: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: radius.lg,
  },
  fileName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  notice: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: semantic.warning.text,
    backgroundColor: semantic.warning.background,
  },
  error: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
  },
  progress: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.info.text,
  },
});
