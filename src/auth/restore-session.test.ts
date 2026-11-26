import * as SecureStore from "expo-secure-store";
import { waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";

import { queryClient } from "@/api/query-client";
import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { restoreSession } from "./restore-session";
import { useSessionStore } from "./session-store";
import { CURRENT_ACCOUNT_KEY } from "./use-current-account";
import {
  readStoredTokens,
  saveAccount,
  saveTokens,
  SESSION_STORAGE_KEY,
} from "./token-storage";

const initialState = useSessionStore.getState();
const getSession = () => useSessionStore.getState().session;

// Un /auth/me que no responde hasta que el test lo suelta: si restoreSession
// esperara la red, el test se colgaría.
function holdAccountResponse(): () => void {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get(apiUrl("/auth/me"), async () => {
      await gate;
      return HttpResponse.json(driverAccountFixture);
    }),
  );
  return release;
}

describe("restoreSession", () => {
  beforeEach(() => useSessionStore.setState(initialState, true));
  afterEach(() => queryClient.clear());

  it("goes to signedOut without a reason when nothing is stored", async () => {
    await restoreSession();

    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("goes to signedIn when tokens are stored, without waiting for the network", async () => {
    await saveTokens(tokensFixture);
    const release = holdAccountResponse();

    await restoreSession();

    expect(getSession()).toEqual({ status: "signedIn" });
    release();
  });

  it("goes to signedOut and clears the store when the stored session is corrupt", async () => {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, "{not json");

    await restoreSession();

    expect(getSession()).toEqual({ status: "signedOut", reason: null });
    expect(await SecureStore.getItemAsync(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("seeds the query cache with the stored account", async () => {
    await saveTokens(tokensFixture);
    await saveAccount(driverAccountFixture);
    const release = holdAccountResponse();

    await restoreSession();

    expect(queryClient.getQueryData(CURRENT_ACCOUNT_KEY)).toEqual(
      driverAccountFixture,
    );
    release();
  });

  it("stays signedIn when GET /auth/me fails for lack of network", async () => {
    await saveTokens(tokensFixture);
    await saveAccount(driverAccountFixture);
    server.use(http.get(apiUrl("/auth/me"), () => HttpResponse.error()));

    await restoreSession();
    await waitFor(() =>
      expect(
        queryClient.getQueryState(CURRENT_ACCOUNT_KEY)?.errorUpdateCount,
      ).toBe(1),
    );

    expect(getSession()).toEqual({ status: "signedIn" });
    expect(await readStoredTokens()).toEqual(tokensFixture);
  });

  it.each(["SUSPENDED", "DEACTIVATED", "PENDING_VERIFICATION"] as const)(
    "ends the session as inactive when the account is %s",
    async (status) => {
      await saveTokens(tokensFixture);
      server.use(
        http.get(apiUrl("/auth/me"), () =>
          HttpResponse.json({ ...driverAccountFixture, status }),
        ),
      );

      await restoreSession();

      await waitFor(() =>
        expect(getSession()).toEqual({
          status: "signedOut",
          reason: "inactive",
        }),
      );
      expect(await readStoredTokens()).toBeNull();
    },
  );

  it("ends the session as inactive when the role is not DRIVER", async () => {
    await saveTokens(tokensFixture);
    server.use(
      http.get(apiUrl("/auth/me"), () =>
        HttpResponse.json({ ...driverAccountFixture, role: "CLIENT" }),
      ),
    );

    await restoreSession();

    await waitFor(() =>
      expect(getSession()).toEqual({ status: "signedOut", reason: "inactive" }),
    );
  });

  it("stays signedIn when the account is an active driver", async () => {
    await saveTokens(tokensFixture);

    await restoreSession();
    await waitFor(() =>
      expect(queryClient.getQueryData(CURRENT_ACCOUNT_KEY)).toEqual(
        driverAccountFixture,
      ),
    );

    expect(getSession()).toEqual({ status: "signedIn" });
  });
});
