import { act, fireEvent, screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";

import {
  COMPLIANCE_NOW,
  approvedExpiringIn,
  complianceDocument,
  calendarDateIn,
  documentsPage,
  expiredDocument,
  pendingRenewal,
  redApprovedPublicLiability,
} from "@/test/compliance-fixtures";
import { renderWithQuery } from "@/test/render";
import { semantic } from "@/theme/tokens";
import { apiUrl, server } from "@/test/server";

import { ComplianceBanner } from "./compliance-banner";
import type { ComplianceDocument } from "./types";

const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
  router: { navigate: (...args: unknown[]) => mockNavigate(...args) },
  useIsFocused: () => true,
}));

function serveDocuments(items: ComplianceDocument[]): void {
  server.use(
    http.get(apiUrl("/compliance/documents"), () =>
      HttpResponse.json(documentsPage(items)),
    ),
  );
}

// Deja pasar la respuesta de la query antes de afirmar que no se dibujó nada.
async function letQueryAnswer(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
}

beforeEach(() => {
  mockNavigate.mockClear();
  jest.useFakeTimers({
    advanceTimers: true,
    now: COMPLIANCE_NOW,
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ComplianceBanner", () => {
  it("shows an amber notice for a document that expires in 32 days", async () => {
    serveDocuments([approvedExpiringIn("a", "PUBLIC_LIABILITY", 32)]);

    await renderWithQuery(<ComplianceBanner />);

    expect(
      await screen.findByText(
        "Public Liability expires in 32 days. Renew now to avoid being blocked from new orders.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("compliance-banner")).toHaveStyle({
      borderColor: semantic.warning.accent,
    });
    expect(screen.queryByText(/more$/)).not.toBeOnTheScreen();
  });

  it("turns red at 7 days or fewer", async () => {
    serveDocuments([approvedExpiringIn("a", "PUBLIC_LIABILITY", 7)]);

    await renderWithQuery(<ComplianceBanner />);

    expect(
      await screen.findByText(
        "Public Liability expires in 7 days. You can't accept new orders until it's renewed.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("compliance-banner")).toHaveStyle({
      borderColor: semantic.danger.accent,
    });
  });

  it("says it expires today", async () => {
    serveDocuments([approvedExpiringIn("a", "PUBLIC_LIABILITY", 0)]);

    await renderWithQuery(<ComplianceBanner />);

    expect(
      await screen.findByText(
        "Public Liability expires today. You can't accept new orders until it's renewed.",
      ),
    ).toBeOnTheScreen();
  });

  it("is red and says so when a document already expired", async () => {
    serveDocuments([expiredDocument]);

    await renderWithQuery(<ComplianceBanner />);

    expect(
      await screen.findByText(
        "Vehicle Registration expired. You can't accept new orders until it's renewed.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("compliance-banner")).toHaveStyle({
      borderColor: semantic.danger.accent,
    });
  });

  it("names the most urgent one and counts the rest", async () => {
    serveDocuments([
      approvedExpiringIn("a", "PUBLIC_LIABILITY", 32),
      approvedExpiringIn("b", "TRAILER_REGO", 5),
      approvedExpiringIn("c", "DRIVER_LICENCE", 40),
    ]);

    await renderWithQuery(<ComplianceBanner />);

    expect(
      await screen.findByText(
        "Trailer Registration expires in 5 days. You can't accept new orders until it's renewed.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("and 2 more")).toBeOnTheScreen();
  });

  it("says the renewal is under review when the document is red", async () => {
    serveDocuments([redApprovedPublicLiability, pendingRenewal]);

    await renderWithQuery(<ComplianceBanner />);

    expect(
      await screen.findByText(
        "Public Liability renewal under review. You can't accept new orders until it's approved.",
      ),
    ).toBeOnTheScreen();
  });

  it("stops counting an amber document whose renewal is under review", async () => {
    serveDocuments([
      approvedExpiringIn("a", "PUBLIC_LIABILITY", 32),
      complianceDocument({
        id: "renewal",
        docType: "PUBLIC_LIABILITY",
        status: "PENDING_REVIEW",
        expiryDate: `${calendarDateIn(730)}T00:00:00.000Z`,
        createdAt: "2026-11-26T00:00:00.000Z",
      }),
    ]);

    await renderWithQuery(<ComplianceBanner />);

    await letQueryAnswer();
    expect(screen.queryByTestId("compliance-banner")).not.toBeOnTheScreen();
  });

  it("goes to the Docs tab when tapped", async () => {
    serveDocuments([approvedExpiringIn("a", "PUBLIC_LIABILITY", 32)]);

    await renderWithQuery(<ComplianceBanner />);
    const banner = await screen.findByRole("button");
    await fireEvent.press(banner);

    expect(mockNavigate).toHaveBeenCalledWith("/docs");
  });

  it("draws nothing when no document needs attention", async () => {
    serveDocuments([approvedExpiringIn("a", "PUBLIC_LIABILITY", 400)]);

    await renderWithQuery(<ComplianceBanner />);

    await letQueryAnswer();
    expect(screen.queryByTestId("compliance-banner")).not.toBeOnTheScreen();
  });

  it("draws nothing when the documents fail to load", async () => {
    server.use(
      http.get(
        apiUrl("/compliance/documents"),
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await renderWithQuery(<ComplianceBanner />);

    await letQueryAnswer();
    expect(screen.queryByTestId("compliance-banner")).not.toBeOnTheScreen();
  });
});
