import { queryClient } from "@/api/query-client";
import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";

import { endSession } from "./end-session";
import { useSessionStore } from "./session-store";
import {
  readStoredAccount,
  readStoredTokens,
  saveAccount,
  saveTokens,
} from "./token-storage";

describe("endSession", () => {
  beforeEach(async () => {
    await saveTokens(tokensFixture);
    await saveAccount(driverAccountFixture);
    queryClient.setQueryData(["auth", "me"], driverAccountFixture);
    useSessionStore.getState().signIn();
  });

  afterEach(() => queryClient.clear());

  it("deletes the stored tokens and account", async () => {
    await endSession("expired");

    expect(await readStoredTokens()).toBeNull();
    expect(await readStoredAccount()).toBeNull();
  });

  it("clears the Query cache so the next driver sees nothing of this one", async () => {
    await endSession(null);

    expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
  });

  it.each(["expired", "inactive", null] as const)(
    "leaves the session signedOut with reason %s",
    async (reason) => {
      await endSession(reason);

      expect(useSessionStore.getState().session).toEqual({
        status: "signedOut",
        reason,
      });
    },
  );
});
