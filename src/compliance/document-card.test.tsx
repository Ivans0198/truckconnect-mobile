import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  COMPLIANCE_NOW,
  approvedExpiringIn,
  calendarDateIn,
  complianceDocument,
  expiredDocument,
  pendingRenewal,
  redApprovedPublicLiability,
  rejectedDocument,
} from "@/test/compliance-fixtures";
import { semantic, TOUCH_TARGET_MIN, fontSize } from "@/theme/tokens";

import { summarizeDocuments } from "./attention";
import { ComplianceDocumentCard } from "./document-card";
import type { ComplianceDocument, DocType } from "./types";

function cardOf(...documents: ComplianceDocument[]) {
  const [card] = summarizeDocuments(documents, COMPLIANCE_NOW).cards;
  if (!card) throw new Error("No card");
  return card;
}

function renderCard(
  documents: ComplianceDocument[],
  onUpload: (docType: DocType) => void = jest.fn(),
) {
  return render(
    <ComplianceDocumentCard card={cardOf(...documents)} onUpload={onUpload} />,
  );
}

function borderColorOfCard(): string | undefined {
  return StyleSheet.flatten(screen.getByTestId("document-card").props.style)
    ?.borderColor;
}

describe("ComplianceDocumentCard", () => {
  it.each([
    ["DRIVER_LICENCE", "Driver Licence"],
    ["VEHICLE_REGO", "Vehicle Registration"],
    ["PUBLIC_LIABILITY", "Public Liability"],
    ["TRAILER_REGO", "Trailer Registration"],
    ["DANGEROUS_GOODS", "Dangerous Goods"],
  ] as const)("names %s in English", async (docType, name) => {
    await renderCard([approvedExpiringIn("d", docType, 400)]);

    expect(screen.getByText(name)).toBeOnTheScreen();
  });

  it("shows a far expiry as Valid, with the Melbourne date and time left", async () => {
    await renderCard([approvedExpiringIn("d", "DRIVER_LICENCE", 400)]);

    expect(screen.getByText("Valid")).toBeOnTheScreen();
    expect(screen.getByText("Expires")).toBeOnTheScreen();
    expect(screen.getByText("1 Jan 2028")).toBeOnTheScreen();
    expect(screen.getByText("in 1y 1m")).toBeOnTheScreen();
    expect(screen.queryByText("Action needed")).not.toBeOnTheScreen();
    expect(screen.queryByText("Upload renewed document")).not.toBeOnTheScreen();
    expect(borderColorOfCard()).not.toBe(semantic.warning.accent);
  });

  it("shows the Melbourne calendar date of the expiry, not the UTC one", async () => {
    await renderCard([
      complianceDocument({
        id: "d",
        expiryDate: "2027-03-13T23:30:00.000Z",
      }),
    ]);

    expect(screen.getByText("14 Mar 2027")).toBeOnTheScreen();
  });

  it("draws an amber border, the days and Action needed at 32 days", async () => {
    const onUpload = jest.fn();
    await renderCard(
      [approvedExpiringIn("d", "PUBLIC_LIABILITY", 32)],
      onUpload,
    );

    expect(screen.getByText("32 days")).toBeOnTheScreen();
    expect(screen.getByText("Action needed")).toBeOnTheScreen();
    expect(borderColorOfCard()).toBe(semantic.warning.accent);

    await fireEvent.press(
      screen.getByRole("button", { name: "Upload renewed document" }),
    );
    expect(onUpload).toHaveBeenCalledWith("PUBLIC_LIABILITY");
  });

  it("is red from 7 days down", async () => {
    await renderCard([approvedExpiringIn("d", "TRAILER_REGO", 7)]);

    expect(screen.getByText("7 days")).toBeOnTheScreen();
    expect(borderColorOfCard()).toBe(semantic.danger.accent);
    expect(
      screen.getByRole("button", { name: "Upload renewed document" }),
    ).toBeOnTheScreen();
  });

  it("says Expired in red and offers the renewal when the date has passed", async () => {
    await renderCard([expiredDocument]);

    expect(screen.getByText("Expired")).toBeOnTheScreen();
    expect(borderColorOfCard()).toBe(semantic.danger.accent);
    expect(
      screen.getByRole("button", { name: "Upload renewed document" }),
    ).toBeOnTheScreen();
  });

  it("says Expired for an approved document whose date already passed", async () => {
    await renderCard([approvedExpiringIn("d", "DRIVER_LICENCE", -3)]);

    expect(screen.getByText("Expired")).toBeOnTheScreen();
  });

  it("says Under review in blue and offers no upload", async () => {
    await renderCard([pendingRenewal]);

    expect(screen.getByText("Under review")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
    expect(borderColorOfCard()).not.toBe(semantic.danger.accent);
  });

  it("keeps the red expiry of the approved document while the renewal is reviewed", async () => {
    await renderCard([redApprovedPublicLiability, pendingRenewal]);

    expect(screen.getByText("Under review")).toBeOnTheScreen();
    expect(screen.getByText("5 days")).toBeOnTheScreen();
    expect(borderColorOfCard()).toBe(semantic.danger.accent);
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it("keeps an Expired label while the renewal is reviewed", async () => {
    await renderCard([
      complianceDocument({
        id: "old",
        docType: "PUBLIC_LIABILITY",
        status: "EXPIRED",
        expiryDate: `${calendarDateIn(-4)}T00:00:00.000Z`,
      }),
      pendingRenewal,
    ]);

    expect(screen.getByText("Under review")).toBeOnTheScreen();
    expect(screen.getByText("Expired")).toBeOnTheScreen();
  });

  it("says Rejected with the reason and offers Upload again", async () => {
    const onUpload = jest.fn();
    await renderCard([rejectedDocument], onUpload);

    expect(screen.getByText("Rejected")).toBeOnTheScreen();
    expect(
      screen.getByText("The photo is blurry. Upload a sharper one."),
    ).toBeOnTheScreen();
    expect(borderColorOfCard()).toBe(semantic.danger.accent);

    await fireEvent.press(screen.getByRole("button", { name: "Upload again" }));
    expect(onUpload).toHaveBeenCalledWith("TRAILER_REGO");
  });

  it("still says Rejected when the backend gave no reason", async () => {
    await renderCard([{ ...rejectedDocument, rejectionReason: null }]);

    expect(screen.getByText("Rejected")).toBeOnTheScreen();
    expect(screen.getByText("No reason was given.")).toBeOnTheScreen();
  });

  it("draws no text under the body size and keeps the button tall enough", async () => {
    await renderCard([approvedExpiringIn("d", "DRIVER_LICENCE", 32)]);

    const sizes = screen
      .getAllByText(/.+/)
      .map((text) => StyleSheet.flatten(text.props.style)?.fontSize);
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes)
      expect(size).toBeGreaterThanOrEqual(fontSize.body);

    const button = StyleSheet.flatten(
      screen.getByRole("button", { name: "Upload renewed document" }).props
        .style,
    );
    expect(button.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
  });
});
