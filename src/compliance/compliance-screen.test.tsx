import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import {
  COMPLIANCE_NOW,
  approvedExpiringIn,
  documentsPage,
} from "@/test/compliance-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize, TOUCH_TARGET_MIN } from "@/theme/tokens";

import { ComplianceScreen } from "./compliance-screen";
import type { ComplianceDocument } from "./types";

const mockPush = jest.fn();
const mockFocusCallbacks: (() => void)[] = [];
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: mockPush }),
    useIsFocused: () => true,
    useFocusEffect: (callback: () => void) => {
      mockFocusCallbacks.push(callback);
      useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

function serveDocuments(items: ComplianceDocument[]): { calls: () => number } {
  let calls = 0;
  server.use(
    http.get(apiUrl("/compliance/documents"), () => {
      calls += 1;
      return HttpResponse.json(documentsPage(items));
    }),
  );
  return { calls: () => calls };
}

const farAway = [
  approvedExpiringIn("a", "DRIVER_LICENCE", 400),
  approvedExpiringIn("b", "VEHICLE_REGO", 180),
];

beforeEach(() => {
  mockPush.mockClear();
  mockFocusCallbacks.length = 0;
  jest.useFakeTimers({
    advanceTimers: true,
    now: COMPLIANCE_NOW,
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ComplianceScreen", () => {
  it("titles the screen without a back arrow and offers the add button", async () => {
    serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);

    expect(
      screen.getByRole("header", { name: "Compliance" }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/back/i)).not.toBeOnTheScreen();
    const add = screen.getByRole("button", { name: "Add document" });
    expect(
      StyleSheet.flatten(add.props.style).minHeight,
    ).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
  });

  it("draws one card per document and no banner when all is valid", async () => {
    serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);

    expect(await screen.findByText("Driver Licence")).toBeOnTheScreen();
    expect(screen.getByText("Vehicle Registration")).toBeOnTheScreen();
    expect(screen.getAllByText("Valid")).toHaveLength(2);
    expect(screen.queryByText(/need.* attention/)).not.toBeOnTheScreen();
  });

  it("shows the count and the most urgent document on top", async () => {
    serveDocuments([
      approvedExpiringIn("a", "PUBLIC_LIABILITY", 32),
      approvedExpiringIn("b", "DRIVER_LICENCE", 400),
    ]);
    await renderWithQuery(<ComplianceScreen />);

    expect(
      await screen.findByText("1 document needs attention"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Public Liability expires in 32 days. Renew before 29 Dec 2026 to avoid being blocked from new orders.",
      ),
    ).toBeOnTheScreen();
  });

  it("explains how the alerts work at the end of the list", async () => {
    serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);

    expect(await screen.findByText("How alerts work")).toBeOnTheScreen();
    expect(
      screen.getByText(/90, 60, 30, 14 and 7 days before expiry/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/can't accept new ones/)).toBeOnTheScreen();
  });

  it("invites the driver to add the first document when there are none", async () => {
    serveDocuments([]);
    await renderWithQuery(<ComplianceScreen />);

    expect(await screen.findByText("No documents yet")).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Add your first document" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/documents/new");
  });

  it("shows a skeleton while the documents are on their way", async () => {
    serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);

    expect(screen.getByTestId("compliance-skeleton")).toBeOnTheScreen();
    await screen.findByText("Driver Licence");
    expect(screen.queryByTestId("compliance-skeleton")).not.toBeOnTheScreen();
  });

  it("shows an error with Try again that asks again, and does not crash", async () => {
    server.use(
      http.get(apiUrl("/compliance/documents"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    await renderWithQuery(<ComplianceScreen />);

    expect(
      await screen.findByText(/Could not load your documents/),
    ).toBeOnTheScreen();
    const documents = serveDocuments(farAway);
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Driver Licence")).toBeOnTheScreen();
    expect(documents.calls()).toBe(1);
  });

  it("shows the error when the network is down", async () => {
    server.use(
      http.get(apiUrl("/compliance/documents"), () => HttpResponse.error()),
    );
    await renderWithQuery(<ComplianceScreen />);

    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeOnTheScreen();
  });

  it("asks again when the tab gets the focus back", async () => {
    const documents = serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);
    await screen.findByText("Driver Licence");
    const before = documents.calls();

    await act(async () => {
      mockFocusCallbacks.at(-1)?.();
    });

    await waitFor(() => expect(documents.calls()).toBeGreaterThan(before));
  });

  it("asks again when the driver pulls down", async () => {
    const documents = serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);
    await screen.findByText("Driver Licence");
    const before = documents.calls();

    const { refreshControl } = screen.getByTestId("compliance-scroll").props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(documents.calls()).toBeGreaterThan(before);
  });

  it("opens the upload form for the type of the card", async () => {
    serveDocuments([approvedExpiringIn("a", "PUBLIC_LIABILITY", 32)]);
    await renderWithQuery(<ComplianceScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Upload renewed document" }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/documents/new?type=PUBLIC_LIABILITY",
    );
  });

  it("opens the empty upload form from the plus button", async () => {
    serveDocuments(farAway);
    await renderWithQuery(<ComplianceScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Add document" }));

    expect(mockPush).toHaveBeenCalledWith("/documents/new");
  });

  it("draws no text under the body size", async () => {
    serveDocuments([
      approvedExpiringIn("a", "PUBLIC_LIABILITY", 32),
      approvedExpiringIn("b", "DRIVER_LICENCE", 400),
    ]);
    await renderWithQuery(<ComplianceScreen />);
    await screen.findByText("Driver Licence");

    const sizes = screen
      .getAllByText(/.+/)
      .map((text) => StyleSheet.flatten(text.props.style)?.fontSize);
    for (const size of sizes)
      expect(size).toBeGreaterThanOrEqual(fontSize.body);
  });
});
