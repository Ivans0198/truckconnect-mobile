import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SectionError } from "@/fatigue/section-error";
import { useNow } from "@/fatigue/use-now";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  semantic,
  spacing,
  TOUCH_TARGET_MIN,
} from "@/theme/tokens";

import { summarizeDocuments } from "./attention";
import { AttentionBanner } from "./attention-banner";
import { ComplianceDocumentCard } from "./document-card";
import { ComplianceIcon } from "./icons";
import { useComplianceDocuments } from "./queries";
import type { DocType } from "./types";

const ERROR_MESSAGE = "Could not load your documents. Check your connection.";
const SKELETON_CARDS = 3;
const INFO_ICON_SIZE = 20;
const ALERTS_TEXT =
  "We notify you 90, 60, 30, 14 and 7 days before expiry. At 7 days you can finish current orders but can't accept new ones until you renew.";

export function ComplianceScreen(): React.JSX.Element {
  const router = useRouter();
  const documents = useComplianceDocuments();
  const now = useNow();
  const [isPulling, setIsPulling] = useState(false);

  const { refetch, data } = documents;
  const summary = useMemo(
    () => (data ? summarizeDocuments(data, now) : null),
    [data, now],
  );

  // La primera carga ya la hace la query al montar: solo se vuelve a pedir
  // cuando la pestaña recupera el foco.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const onRefresh = useCallback(async () => {
    setIsPulling(true);
    try {
      await refetch();
    } finally {
      setIsPulling(false);
    }
  }, [refetch]);

  const openForm = (docType?: DocType): void => {
    router.push(docType ? `/documents/new?type=${docType}` : "/documents/new");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Compliance
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add document"
          onPress={() => openForm()}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>
      <ScrollView
        testID="compliance-scroll"
        // Sin tarjetas con botón, el área que se desplaza no tendría nada
        // enfocable para quien navega con teclado (axe: scrollable-region).
        focusable
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isPulling} onRefresh={onRefresh} />
        }
      >
        {summary ? (
          summary.cards.length === 0 ? (
            <EmptyState onAdd={() => openForm()} />
          ) : (
            <>
              <AttentionBanner summary={summary} />
              <Text style={styles.sectionLabel}>
                {`Your documents · ${summary.cards.length} total`}
              </Text>
              {summary.cards.map((card) => (
                <ComplianceDocumentCard
                  key={card.docType}
                  card={card}
                  onUpload={openForm}
                />
              ))}
              <View style={styles.info}>
                <View style={styles.infoHeader}>
                  <ComplianceIcon
                    name="info"
                    color={semantic.info.accent}
                    size={INFO_ICON_SIZE}
                  />
                  <Text style={styles.infoTitle}>How alerts work</Text>
                </View>
                <Text style={styles.infoText}>{ALERTS_TEXT}</Text>
              </View>
            </>
          )
        ) : documents.isError ? (
          <SectionError
            message={ERROR_MESSAGE}
            onRetry={() => void refetch()}
          />
        ) : (
          <Skeleton />
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No documents yet</Text>
      <Text style={styles.emptyText}>
        Add your licence and the vehicle papers so you can keep taking orders.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add your first document"
        onPress={onAdd}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>Add your first document</Text>
      </Pressable>
    </View>
  );
}

function Skeleton(): React.JSX.Element {
  return (
    <View
      testID="compliance-skeleton"
      accessibilityLabel="Loading your documents"
      style={styles.skeleton}
    >
      {Array.from({ length: SKELETON_CARDS }, (_, index) => (
        <View key={index} style={styles.skeletonCard} />
      ))}
    </View>
  );
}

const SKELETON_CARD_HEIGHT = 112;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
  add: {
    width: TOUCH_TARGET_MIN,
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: semantic.info.background,
  },
  addText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    color: colors.primary,
  },
  pressed: { opacity: 0.85 },
  content: { gap: spacing.lg, padding: spacing.xl },
  info: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: semantic.info.background,
  },
  infoTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: semantic.info.text,
  },
  infoText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: semantic.info.text,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  empty: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.text,
  },
  cta: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  ctaText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lead,
    color: colors.onPrimary,
  },
  skeleton: { gap: spacing.lg },
  skeletonCard: {
    height: SKELETON_CARD_HEIGHT,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
  },
});
