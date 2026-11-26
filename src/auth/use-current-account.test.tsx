import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { driverAccountFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { readStoredAccount, saveTokens } from "./token-storage";
import { CURRENT_ACCOUNT_KEY, useCurrentAccount } from "./use-current-account";

const storedAccount = { ...driverAccountFixture, fullName: "Stored Name" };
const freshAccount = { ...driverAccountFixture, fullName: "Fresh Name" };

// restoreSession siembra la cuenta guardada en la caché antes de montar nada;
// el test hace lo mismo con su propio cliente.
function setup(seed: boolean) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  if (seed) client.setQueryData(CURRENT_ACCOUNT_KEY, storedAccount);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCurrentAccount(), { wrapper });
}

describe("useCurrentAccount", () => {
  beforeEach(() => saveTokens({ accessToken: "a", refreshToken: "r" }));

  it("starts from the stored account and replaces it with the server response", async () => {
    server.use(
      http.get(apiUrl("/auth/me"), () => HttpResponse.json(freshAccount)),
    );

    const { result } = await setup(true);

    expect(result.current.data?.fullName).toBe("Stored Name");
    await waitFor(() =>
      expect(result.current.data?.fullName).toBe("Fresh Name"),
    );
  });

  it("keeps the stored account while there is no network", async () => {
    server.use(http.get(apiUrl("/auth/me"), () => HttpResponse.error()));

    const { result } = await setup(true);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data?.fullName).toBe("Stored Name");
  });

  it("stores the account again when /auth/me responds 200", async () => {
    server.use(
      http.get(apiUrl("/auth/me"), () => HttpResponse.json(freshAccount)),
    );

    await setup(false);

    await waitFor(async () =>
      expect(await readStoredAccount()).toEqual(freshAccount),
    );
  });
});
