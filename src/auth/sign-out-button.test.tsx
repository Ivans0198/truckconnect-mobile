import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";

import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";

import { useSessionStore } from "./session-store";
import { SignOutButton } from "./sign-out-button";
import { readStoredTokens, saveAccount, saveTokens } from "./token-storage";

const getSession = () => useSessionStore.getState().session;

const pressInDialog = (name: string) =>
  fireEvent.press(
    within(screen.getByTestId("confirm-dialog")).getByRole("button", { name }),
  );

describe("SignOutButton", () => {
  beforeEach(async () => {
    await saveTokens(tokensFixture);
    await saveAccount(driverAccountFixture);
    useSessionStore.getState().signIn();
  });

  it("asks for confirmation before doing anything", async () => {
    await render(<SignOutButton />);

    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByText("Log out?")).toBeTruthy();
    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it("signs out once the driver confirms", async () => {
    await render(<SignOutButton />);
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));

    await pressInDialog("Log out");

    await waitFor(() =>
      expect(getSession()).toEqual({ status: "signedOut", reason: null }),
    );
    expect(await readStoredTokens()).toBeNull();
  });

  it("changes nothing when the driver cancels", async () => {
    await render(<SignOutButton />);
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));

    await pressInDialog("Cancel");

    expect(screen.queryByText("Log out?")).toBeNull();
    expect(getSession()).toEqual({ status: "signedIn" });
    expect(await readStoredTokens()).toEqual(tokensFixture);
  });
});
