import { shouldStartDevMocks } from "./should-start-dev-mocks";

describe("shouldStartDevMocks", () => {
  it.each([
    { isDev: true, apiUrl: undefined, expected: true },
    { isDev: true, apiUrl: "https://api.truckconnect.com.au", expected: false },
    { isDev: true, apiUrl: "", expected: true },
    { isDev: true, apiUrl: "   ", expected: true },
    { isDev: false, apiUrl: undefined, expected: false },
    {
      isDev: false,
      apiUrl: "https://api.truckconnect.com.au",
      expected: false,
    },
  ])(
    "returns $expected when isDev is $isDev and the API URL is $apiUrl",
    ({ isDev, apiUrl, expected }) => {
      expect(shouldStartDevMocks({ isDev, apiUrl })).toBe(expected);
    },
  );
});
