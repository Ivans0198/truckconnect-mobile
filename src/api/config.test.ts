import { DEFAULT_API_URL, resolveApiBaseUrl } from "./config";

describe("resolveApiBaseUrl", () => {
  it("uses the configured URL when EXPO_PUBLIC_API_URL is set", () => {
    expect(resolveApiBaseUrl("https://api.truckconnect.com.au")).toBe(
      "https://api.truckconnect.com.au",
    );
  });

  it("falls back to the local API from the contract when nothing is configured", () => {
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_URL);
    expect(resolveApiBaseUrl("  ")).toBe(DEFAULT_API_URL);
  });

  it("drops a trailing slash so paths from the contract join cleanly", () => {
    expect(resolveApiBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
  });
});
