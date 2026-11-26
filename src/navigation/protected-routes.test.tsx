import { Text } from "react-native";
import { renderRouter, screen } from "expo-router/testing-library";

import { useSessionStore } from "@/auth/session-store";

import RootLayout from "../../app/_layout";
import AuthLayout from "../../app/(auth)/_layout";
import NotFound from "../../app/+not-found";
import SignIn from "../../app/(auth)/sign-in";
import TabsLayout from "../../app/(tabs)/_layout";

jest.mock("@expo-google-fonts/inter", () => ({
  useFonts: () => [true, null],
  Inter_400Regular: 1,
  Inter_500Medium: 1,
  Inter_600SemiBold: 1,
  Inter_700Bold: 1,
  Inter_800ExtraBold: 1,
}));

const title = (name: string) =>
  function Screen() {
    return <Text>{`${name} screen`}</Text>;
  };

const routes = {
  _layout: RootLayout,
  "+not-found": NotFound,
  "(auth)/_layout": AuthLayout,
  "(auth)/sign-in": SignIn,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": title("Home"),
  "(tabs)/fatigue": title("Fatigue"),
  "(tabs)/docs": title("Docs"),
  "(tabs)/profile": title("Profile"),
};

const signedOut = () =>
  useSessionStore.getState().finishRestoring({ hasTokens: false });
const signedIn = () =>
  useSessionStore.getState().finishRestoring({ hasTokens: true });

describe("protected routes", () => {
  const initialState = useSessionStore.getState();
  beforeEach(() => useSessionStore.setState(initialState, true));

  it.each(["/", "/profile"])(
    "shows the login and no inner screen at %s without a session",
    async (url) => {
      signedOut();

      await renderRouter(routes, { initialUrl: url });

      expect(await screen.findByText("Welcome back")).toBeOnTheScreen();
      expect(screen.queryByText("Home screen")).toBeNull();
      expect(screen.queryByText("Profile screen")).toBeNull();
      expect(screen.queryByRole("tab")).toBeNull();
    },
  );

  it("shows Home with the tab bar at / with a session", async () => {
    signedIn();

    await renderRouter(routes, { initialUrl: "/" });

    expect(await screen.findByText("Home screen")).toBeOnTheScreen();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it("does not reach /sign-in with a session", async () => {
    signedIn();

    await renderRouter(routes, { initialUrl: "/sign-in" });

    expect(await screen.findByText("Home screen")).toBeOnTheScreen();
    expect(screen.queryByText("Welcome back")).toBeNull();
  });
});
