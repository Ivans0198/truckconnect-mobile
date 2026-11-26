import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  DEV_DRIVER_EMAIL,
  DEV_DRIVER_PASSWORD,
} from "@/mocks/dev-auth-handlers";
import { createDevAuthMswHandlers } from "@/test/dev-auth-msw";
import { TEST_API_URL } from "@/test/env";
import { server } from "@/test/server";

import { useSessionStore } from "./session-store";
import { SignInScreen } from "./sign-in-screen";

const initialState = useSessionStore.getState();

async function signInWith(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), password);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
}

describe("sign-in screen with dev mocks", () => {
  beforeEach(() => {
    server.use(...createDevAuthMswHandlers(TEST_API_URL));
    useSessionStore.setState(initialState, true);
    useSessionStore.getState().finishRestoring({ hasTokens: false });
  });

  it("signs the test driver in", async () => {
    await render(<SignInScreen />);

    await signInWith(DEV_DRIVER_EMAIL, DEV_DRIVER_PASSWORD);

    await screen.findByRole("button", { name: "Sign in" });
    expect(useSessionStore.getState().session).toEqual({ status: "signedIn" });
  });

  it("shows the credentials error for a wrong password", async () => {
    await render(<SignInScreen />);

    await signInWith(DEV_DRIVER_EMAIL, "wrong");

    expect(await screen.findByText(/incorrect/i)).toBeOnTheScreen();
    expect(useSessionStore.getState().session).not.toEqual({
      status: "signedIn",
    });
  });
});
