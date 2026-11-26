import * as SecureStore from "expo-secure-store";

import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";

import {
  ACCOUNT_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  clearStoredSession,
  readStoredAccount,
  readStoredTokens,
  saveAccount,
  saveTokens,
} from "./token-storage";

describe("token storage", () => {
  it("returns nothing when no session was saved", async () => {
    expect(await readStoredTokens()).toBeNull();
    expect(await readStoredAccount()).toBeNull();
  });

  it("saves the token pair under a single key and reads it back", async () => {
    await saveTokens(tokensFixture);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      JSON.stringify(tokensFixture),
    );
    expect(SESSION_STORAGE_KEY).toBe("truckconnect.session");
    expect(await readStoredTokens()).toEqual(tokensFixture);
  });

  it("saves the account under its own key and reads it back", async () => {
    await saveAccount(driverAccountFixture);

    expect(ACCOUNT_STORAGE_KEY).toBe("truckconnect.account");
    expect(await readStoredAccount()).toEqual(driverAccountFixture);
  });

  it("clear removes both the tokens and the account", async () => {
    await saveTokens(tokensFixture);
    await saveAccount(driverAccountFixture);

    await clearStoredSession();

    expect(await readStoredTokens()).toBeNull();
    expect(await readStoredAccount()).toBeNull();
  });
});
