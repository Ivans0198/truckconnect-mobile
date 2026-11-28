import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { useSessionStore } from "@/auth/session-store";
import { driverAccountFixture } from "@/test/auth-fixtures";
import {
  activeVehicleFixture,
  driverStatsFixture,
  inactiveVehicleFixture,
} from "@/test/profile-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize } from "@/theme/tokens";

import { ProfileScreen } from "./profile-screen";

// jest-expo no lee app.json: se fija la versión que la app instalada declara.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "0.1.0" } },
}));

const mockFocusCallbacks: (() => void)[] = [];
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useFocusEffect: (callback: () => void) => {
      mockFocusCallbacks.push(callback);
      useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

// 8 meses después del alta de la fixture de la cuenta (2026-01-01).
const NOW = new Date("2026-09-15T02:00:00.000Z");

const account = {
  ...driverAccountFixture,
  fullName: "David Chen",
  email: "david.chen@truckconnect.com.au",
  phone: "+61 412 555 102",
  abn: "12 345 678 901",
  licenceClass: "HC",
  emergencyContact: { name: "Anna Chen", phone: "+61 412 555 199" },
};

function serveAccount(value: Record<string, unknown> = account): void {
  server.use(http.get(apiUrl("/auth/me"), () => HttpResponse.json(value)));
}

function serveVehicles(items: unknown[]): void {
  server.use(
    http.get(apiUrl("/vehicles"), () =>
      HttpResponse.json({
        items,
        total: items.length,
        page: 1,
        limit: 100,
        totalPages: 1,
      }),
    ),
  );
}

const serverError = () => HttpResponse.json({ message: "x" }, { status: 500 });

beforeEach(() => {
  mockFocusCallbacks.length = 0;
  useSessionStore.getState().signIn();
  jest.useFakeTimers({
    advanceTimers: true,
    now: NOW,
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
  serveAccount();
});

afterEach(() => {
  jest.useRealTimers();
});

async function openProfile(): Promise<void> {
  await renderWithQuery(<ProfileScreen />);
  await screen.findByText("David Chen");
}

describe("ProfileScreen", () => {
  it("shows the initials, name, licence and ABN", async () => {
    await openProfile();

    expect(screen.getByText("DC")).toBeOnTheScreen();
    expect(screen.getByText("Heavy Combination (HC)")).toBeOnTheScreen();
    expect(screen.getByText("ABN 12 345 678 901")).toBeOnTheScreen();
  });

  it("shows the month's deliveries, an empty rating and the tenure", async () => {
    await openProfile();

    expect(await screen.findByText("47")).toBeOnTheScreen();
    expect(screen.getByText("Deliveries")).toBeOnTheScreen();
    expect(screen.getByText("— —")).toBeOnTheScreen();
    expect(screen.getByText("Rating")).toBeOnTheScreen();
    expect(screen.getByText("8mo")).toBeOnTheScreen();
    expect(screen.getByText("With us")).toBeOnTheScreen();
  });

  it("asks the stats of the account for the month", async () => {
    let seen = "";
    server.use(
      http.get(apiUrl("/drivers/:id/stats"), ({ params, request }) => {
        seen = `${params.id as string}?${new URL(request.url).searchParams.toString()}`;
        return HttpResponse.json(driverStatsFixture);
      }),
    );
    await openProfile();

    await waitFor(() => expect(seen).toBe(`${account.id}?period=month`));
  });

  it("lists email, phone and the emergency contact", async () => {
    await openProfile();

    expect(screen.getByText("Personal info")).toBeOnTheScreen();
    expect(
      screen.getByText("david.chen@truckconnect.com.au"),
    ).toBeOnTheScreen();
    expect(screen.getByText("+61 412 555 102")).toBeOnTheScreen();
    expect(screen.getByText("Anna Chen · +61 412 555 199")).toBeOnTheScreen();
  });

  it("says Not set when there is no emergency contact", async () => {
    serveAccount({ ...account, emergencyContact: null });
    await openProfile();

    expect(screen.getByText("Emergency contact")).toBeOnTheScreen();
    expect(screen.getByText("Not set")).toBeOnTheScreen();
  });

  it("shows the active vehicle with all its figures", async () => {
    serveVehicles([
      { ...activeVehicleFixture, type: "SEMI_TRAILER" },
      inactiveVehicleFixture,
    ]);
    await openProfile();

    expect(await screen.findByText("Isuzu FRR 110-260 2021")).toBeOnTheScreen();
    expect(screen.getByText("1AB-2CD")).toBeOnTheScreen();
    expect(screen.getByText("Semi-trailer")).toBeOnTheScreen();
    expect(screen.getByText("10 pallets")).toBeOnTheScreen();
    expect(screen.getByText("11,000 kg")).toBeOnTheScreen();
    expect(screen.getByText("2.4 m")).toBeOnTheScreen();
    expect(screen.queryByText("XYZ-987")).not.toBeOnTheScreen();
  });

  it("calls a rigid truck Rigid", async () => {
    await openProfile();

    expect(await screen.findByText("Rigid")).toBeOnTheScreen();
  });

  it("says No vehicle on file when there is none active", async () => {
    serveVehicles([inactiveVehicleFixture]);
    await openProfile();

    expect(await screen.findByText("No vehicle on file")).toBeOnTheScreen();
  });

  it("draws one card per active vehicle", async () => {
    serveVehicles([
      activeVehicleFixture,
      { ...activeVehicleFixture, id: "v3", registrationNumber: "ZZZ-111" },
    ]);
    await openProfile();

    expect(await screen.findByText("1AB-2CD")).toBeOnTheScreen();
    expect(screen.getByText("ZZZ-111")).toBeOnTheScreen();
  });

  it("never writes null or undefined for missing optional fields", async () => {
    serveAccount({
      ...account,
      abn: null,
      licenceClass: null,
      emergencyContact: null,
    });
    serveVehicles([
      { ...activeVehicleFixture, make: null, model: null, year: null },
    ]);
    await openProfile();
    await screen.findByText("1AB-2CD");

    expect(screen.queryByText(/ABN/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/null|undefined/)).not.toBeOnTheScreen();
  });

  it("fails each section alone and keeps Log out", async () => {
    server.use(
      http.get(apiUrl("/drivers/:id/stats"), serverError),
      http.get(apiUrl("/vehicles"), serverError),
    );
    await openProfile();

    expect(
      await screen.findAllByRole("button", { name: "Try again" }),
    ).toHaveLength(2);
    expect(screen.getByText("Personal info")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Log out" })).toBeOnTheScreen();
  });

  it("retries only the failed section", async () => {
    let statsCalls = 0;
    let vehicleCalls = 0;
    server.use(
      http.get(apiUrl("/drivers/:id/stats"), () => {
        statsCalls += 1;
        return statsCalls === 1
          ? serverError()
          : HttpResponse.json(driverStatsFixture);
      }),
      http.get(apiUrl("/vehicles"), () => {
        vehicleCalls += 1;
        return HttpResponse.json({
          items: [activeVehicleFixture],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        });
      }),
    );
    await openProfile();
    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );

    expect(await screen.findByText("47")).toBeOnTheScreen();
    expect(vehicleCalls).toBe(1);
  });

  it("shows the user error alone when the account fails", async () => {
    server.use(http.get(apiUrl("/auth/me"), serverError));
    await renderWithQuery(<ProfileScreen />);

    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Log out" })).toBeOnTheScreen();
  });

  it("refreshes every section when the tab regains focus", async () => {
    let vehicleCalls = 0;
    server.use(
      http.get(apiUrl("/vehicles"), () => {
        vehicleCalls += 1;
        return HttpResponse.json({
          items: [activeVehicleFixture],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        });
      }),
    );
    await openProfile();
    await screen.findByText("1AB-2CD");

    await act(async () => {
      mockFocusCallbacks[mockFocusCallbacks.length - 1]?.();
    });

    await waitFor(() => expect(vehicleCalls).toBe(2));
  });

  it("refreshes on pull-to-refresh", async () => {
    let vehicleCalls = 0;
    server.use(
      http.get(apiUrl("/vehicles"), () => {
        vehicleCalls += 1;
        return HttpResponse.json({
          items: [activeVehicleFixture],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        });
      }),
    );
    await openProfile();
    await screen.findByText("1AB-2CD");

    const scroll = screen.getByTestId("profile-scroll");
    await act(async () => {
      scroll.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(vehicleCalls).toBe(2));
  });

  it("is read only: no chevrons, Edit, Preferences or Support", async () => {
    await openProfile();
    await screen.findByText("1AB-2CD");

    expect(screen.queryByText("Edit")).not.toBeOnTheScreen();
    expect(screen.queryByText(/Preferences/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Support/)).not.toBeOnTheScreen();
    expect(screen.queryByTestId("row-chevron")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: /email|phone/i }),
    ).not.toBeOnTheScreen();
  });

  it("shows the installed version at the end", async () => {
    await openProfile();

    expect(screen.getByText("TruckConnect Driver · v0.1.0")).toBeOnTheScreen();
  });

  it("logs the driver out", async () => {
    await openProfile();
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByText("Log out?")).toBeOnTheScreen();
  });

  it("never draws text under 16", async () => {
    await openProfile();
    await screen.findByText("1AB-2CD");

    const sizes = screen
      .getAllByText(/.+/)
      .map((text) => StyleSheet.flatten(text.props.style)?.fontSize);
    for (const size of sizes)
      expect(size).toBeGreaterThanOrEqual(fontSize.body);
  });
});
