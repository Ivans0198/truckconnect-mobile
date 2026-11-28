import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

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

import { useMarkAllRead, useMarkRead } from "./mutations";
import { NotificationRow } from "./notification-row";
import {
  NOTIFICATIONS_PAGE_SIZE,
  UNREAD_COUNT_KEY,
  useNotifications,
  useUnreadCount,
  type AppNotification,
} from "./queries";

const LOAD_ERROR = "Could not load your notifications. Check your connection.";
const MARK_READ_ERROR = "Couldn't mark it as read. Try again.";
const MARK_ALL_ERROR = "Couldn't mark them all as read. Try again.";
const BACK_ARROW_PATH = "M15 19l-7-7 7-7";
const ICON_SIZE = 28;
const ICON_STROKE_WIDTH = 2;
const SKELETON_ROWS = [0, 1, 2, 3];
const SKELETON_ROW_HEIGHT = 88;
const END_REACHED_THRESHOLD = 0.5;

export function NotificationsScreen(): React.JSX.Element {
  const router = useRouter();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const list = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const [isPulling, setIsPulling] = useState(false);

  // Al cerrar la lista, la campana de Home se pone al día (FR-027).
  useEffect(
    () => () => {
      void client.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
    [client],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const { refetch: refetchList } = list;
  const onRefresh = useCallback(async () => {
    setIsPulling(true);
    try {
      await Promise.all([
        refetchList(),
        client.invalidateQueries({ queryKey: UNREAD_COUNT_KEY }),
      ]);
    } finally {
      setIsPulling(false);
    }
  }, [client, refetchList]);

  const items: AppNotification[] =
    list.data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = (unread.data ?? 0) > 0;
  const actionError = markRead.isError
    ? MARK_READ_ERROR
    : markAllRead.isError
      ? MARK_ALL_ERROR
      : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={styles.iconButton}
        >
          <Svg
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d={BACK_ARROW_PATH}
              stroke={colors.text}
              strokeWidth={ICON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Notifications
        </Text>
        {hasUnread ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all read"
            onPress={() => {
              markRead.reset();
              markAllRead.mutate();
            }}
            style={styles.markAll}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>
      {actionError ? (
        <Text accessibilityLiveRegion="polite" style={styles.actionError}>
          {actionError}
        </Text>
      ) : null}
      {list.isError && !list.data ? (
        <View style={styles.padded}>
          <SectionError
            message={LOAD_ERROR}
            onRetry={() => void refetchList()}
          />
        </View>
      ) : !list.data ? (
        <Skeleton />
      ) : (
        <FlatList
          testID="notifications-list"
          data={items}
          initialNumToRender={NOTIFICATIONS_PAGE_SIZE}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              now={now}
              onPress={(id) => {
                markAllRead.reset();
                markRead.mutate(id);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <Text style={styles.empty}>You&apos;re all caught up</Text>
          }
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          refreshControl={
            <RefreshControl refreshing={isPulling} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

function Skeleton(): React.JSX.Element {
  return (
    <View
      accessibilityLabel="Loading your notifications"
      testID="notifications-skeleton"
      style={[styles.padded, styles.skeleton]}
    >
      {SKELETON_ROWS.map((row) => (
        <View key={row} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  iconButton: {
    width: TOUCH_TARGET_MIN,
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    color: colors.text,
  },
  markAll: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  markAllText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    color: colors.primary,
  },
  actionError: {
    padding: spacing.lg,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: semantic.danger.text,
    backgroundColor: semantic.danger.background,
  },
  padded: { padding: spacing.lg },
  listContent: { flexGrow: 1, padding: spacing.lg },
  separator: { height: spacing.md },
  empty: {
    paddingVertical: spacing.xxl,
    textAlign: "center",
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lead,
    color: colors.textMuted,
  },
  skeleton: { gap: spacing.md },
  skeletonRow: {
    height: SKELETON_ROW_HEIGHT,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
  },
});
