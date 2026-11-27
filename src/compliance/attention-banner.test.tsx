import { render, screen } from "@testing-library/react-native";

import {
  COMPLIANCE_NOW,
  approvedExpiringIn,
  expiredDocument,
  rejectedDocument,
} from "@/test/compliance-fixtures";

import { summarizeDocuments } from "./attention";
import { AttentionBanner } from "./attention-banner";
import type { ComplianceDocument } from "./types";

function bannerFor(documents: ComplianceDocument[]) {
  return render(
    <AttentionBanner summary={summarizeDocuments(documents, COMPLIANCE_NOW)} />,
  );
}

describe("AttentionBanner", () => {
  it("counts one document and names the most urgent with its deadline", async () => {
    await bannerFor([approvedExpiringIn("d", "PUBLIC_LIABILITY", 32)]);

    expect(screen.getByText("1 document needs attention")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Public Liability expires in 32 days. Renew before 29 Dec 2026 to avoid being blocked from new orders.",
      ),
    ).toBeOnTheScreen();
  });

  it("uses the plural and picks the one that expires first", async () => {
    await bannerFor([
      approvedExpiringIn("a", "PUBLIC_LIABILITY", 32),
      approvedExpiringIn("b", "TRAILER_REGO", 5),
    ]);

    expect(screen.getByText("2 documents need attention")).toBeOnTheScreen();
    expect(
      screen.getByText(/^Trailer Registration expires in 5 days\./),
    ).toBeOnTheScreen();
  });

  it("says a document expired when it did", async () => {
    await bannerFor([expiredDocument]);

    expect(
      screen.getByText(/^Vehicle Registration has expired\./),
    ).toBeOnTheScreen();
  });

  it("says a document was rejected when nothing is approved under it", async () => {
    await bannerFor([rejectedDocument]);

    expect(
      screen.getByText(/^Trailer Registration was rejected\./),
    ).toBeOnTheScreen();
  });

  it("talks about the rejection, not the old expiry, when the renewal was rejected", async () => {
    await bannerFor([
      approvedExpiringIn("old", "TRAILER_REGO", 20),
      { ...rejectedDocument },
    ]);

    expect(
      screen.getByText(/^Trailer Registration was rejected\./),
    ).toBeOnTheScreen();
  });

  it("draws nothing when no document needs attention", async () => {
    await bannerFor([approvedExpiringIn("d", "DRIVER_LICENCE", 400)]);

    expect(screen.queryByText(/need/)).not.toBeOnTheScreen();
  });
});
