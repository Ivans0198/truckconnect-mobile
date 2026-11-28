import { Text } from "react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "@/auth/session-store";
import { withQueryClient } from "@/test/render";

import TabsLayout from "../../app/(tabs)/_layout";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual(
    "react-native-safe-area-context/jest/mock",
  ).default;
  return { ...actual, useSafeAreaInsets: jest.fn() };
});

const STATUS_BAR_HEIGHT = 47;

const tabScreen = (name: string) =>
  function Screen() {
    return <Text>{`${name} screen`}</Text>;
  };

const routes = {
  "(tabs)/_layout": withQueryClient(TabsLayout),
  "(tabs)/index": tabScreen("Home"),
  "(tabs)/fatigue": tabScreen("Fatigue"),
  "(tabs)/docs": tabScreen("Docs"),
  "(tabs)/profile": tabScreen("Profile"),
};

function topPaddingAbove(node: { parent: unknown }): number {
  let current = node.parent as {
    parent: unknown;
    props: { style?: unknown };
  } | null;
  while (current) {
    const flat = Array.isArray(current.props.style)
      ? Object.assign({}, ...current.props.style.flat(Infinity))
      : ((current.props.style as { paddingTop?: number } | undefined) ?? {});
    if (typeof flat.paddingTop === "number" && flat.paddingTop > 0) {
      return flat.paddingTop;
    }
    current = current.parent as typeof current;
  }
  return 0;
}

describe("tab screens and the status bar", () => {
  beforeEach(() => {
    useSessionStore.getState().finishRestoring({ hasTokens: true });
    jest.mocked(useSafeAreaInsets).mockReturnValue({
      top: STATUS_BAR_HEIGHT,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });

  it.each([
    ["/", "Home"],
    ["/fatigue", "Fatigue"],
    ["/docs", "Docs"],
    ["/profile", "Profile"],
  ])("keeps %s below the top safe area", async (url, name) => {
    await renderRouter(routes, { initialUrl: url });

    const content = await screen.findByText(`${name} screen`);

    expect(topPaddingAbove(content)).toBe(STATUS_BAR_HEIGHT);
  });
});
