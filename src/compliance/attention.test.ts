import {
  COMPLIANCE_NOW,
  approvedExpiringIn,
  approvedIn60Days,
  approvedIn61Days,
  approvedIn7Days,
  approvedIn8Days,
  approvedPastExpiry,
  approvedToday,
  complianceDocument,
  expiredDocument,
  newerLicenceVersion,
  olderLicenceVersion,
  pendingRenewal,
  redApprovedPublicLiability,
  rejectedDocument,
} from "@/test/compliance-fixtures";

import { summarizeDocuments } from "./attention";
import type { ComplianceDocument, DocType } from "./types";

function cardFor(documents: ComplianceDocument[], docType: DocType) {
  const card = summarizeDocuments(documents, COMPLIANCE_NOW).cards.find(
    (candidate) => candidate.docType === docType,
  );
  if (!card) throw new Error(`No card for ${docType}`);
  return card;
}

describe("summarizeDocuments: attention of an approved document", () => {
  it.each([
    ["61 days", approvedIn61Days, { kind: "valid", days: 61 }, false],
    ["60 days", approvedIn60Days, { kind: "expiring", days: 60 }, true],
    ["8 days", approvedIn8Days, { kind: "expiring", days: 8 }, true],
    ["7 days", approvedIn7Days, { kind: "urgent", days: 7 }, true],
    ["0 days", approvedToday, { kind: "urgent", days: 0 }, true],
  ] as const)("%s", (_label, document, attention, needsAttention) => {
    const card = cardFor([document], document.docType);

    expect(card.attention).toEqual(attention);
    expect(card.needsAttention).toBe(needsAttention);
  });

  it("is expired when an APPROVED document is past its date", () => {
    const card = cardFor([approvedPastExpiry], "DRIVER_LICENCE");

    expect(card.attention).toEqual({ kind: "expired" });
    expect(card.needsAttention).toBe(true);
  });

  it("is expired for an EXPIRED document", () => {
    const card = cardFor([expiredDocument], "VEHICLE_REGO");

    expect(card.attention).toEqual({ kind: "expired" });
  });
});

describe("summarizeDocuments: blocksAcceptance", () => {
  it.each([
    ["valid", approvedIn61Days, null],
    ["expiring", approvedIn8Days, null],
    [
      "urgent",
      approvedIn7Days,
      {
        kind: "compliance",
        docType: "TRAILER_REGO",
        state: "expiring",
        days: 7,
      },
    ],
    [
      "expired",
      expiredDocument,
      {
        kind: "compliance",
        docType: "VEHICLE_REGO",
        state: "expired",
        days: null,
      },
    ],
  ] as const)("%s approved document", (_label, document, reason) => {
    expect(cardFor([document], document.docType).blocksAcceptance).toEqual(
      reason,
    );
  });
});

describe("summarizeDocuments: renewals", () => {
  it("shows under review with the red approved document it replaces", () => {
    const card = cardFor(
      [redApprovedPublicLiability, pendingRenewal],
      "PUBLIC_LIABILITY",
    );

    expect(card.latest.id).toBe("doc-pl-pending");
    expect(card.attention).toEqual({
      kind: "under-review",
      current: { kind: "urgent", days: 5 },
    });
    expect(card.needsAttention).toBe(true);
    expect(card.blocksAcceptance).toEqual({
      kind: "compliance",
      docType: "PUBLIC_LIABILITY",
      state: "under-review",
      days: null,
    });
  });

  it("does not need attention when under review over a valid document", () => {
    const valid = approvedExpiringIn("pl-valid", "PUBLIC_LIABILITY", 200);
    const card = cardFor([valid, pendingRenewal], "PUBLIC_LIABILITY");

    expect(card.attention).toEqual({
      kind: "under-review",
      current: { kind: "valid", days: 200 },
    });
    expect(card.needsAttention).toBe(false);
    expect(card.blocksAcceptance).toBeNull();
  });

  it("does not need attention when under review with no approved document", () => {
    const card = cardFor([pendingRenewal], "PUBLIC_LIABILITY");

    expect(card.attention).toEqual({ kind: "under-review", current: null });
    expect(card.needsAttention).toBe(false);
    expect(card.blocksAcceptance).toBeNull();
  });

  it("treats an expired current document as red while under review", () => {
    const expired = complianceDocument({
      id: "pl-expired",
      docType: "PUBLIC_LIABILITY",
      status: "EXPIRED",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    const card = cardFor([expired, pendingRenewal], "PUBLIC_LIABILITY");

    expect(card.attention).toEqual({
      kind: "under-review",
      current: { kind: "expired" },
    });
    expect(card.needsAttention).toBe(true);
    expect(card.blocksAcceptance?.state).toBe("under-review");
  });

  it("shows rejected with its reason and always needs attention", () => {
    const card = cardFor([rejectedDocument], "TRAILER_REGO");

    expect(card.attention).toEqual({
      kind: "rejected",
      reason: "The photo is blurry. Upload a sharper one.",
      current: null,
    });
    expect(card.needsAttention).toBe(true);
    expect(card.blocksAcceptance).toBeNull();
  });

  it("blocks with the reason of the current document when a rejected one replaces a red one", () => {
    const urgent = approvedExpiringIn("tr-urgent", "TRAILER_REGO", 3);
    const card = cardFor([urgent, rejectedDocument], "TRAILER_REGO");

    expect(card.attention).toEqual({
      kind: "rejected",
      reason: "The photo is blurry. Upload a sharper one.",
      current: { kind: "urgent", days: 3 },
    });
    expect(card.blocksAcceptance).toEqual({
      kind: "compliance",
      docType: "TRAILER_REGO",
      state: "expiring",
      days: 3,
    });
  });

  it("blocks as expired when a rejected document replaces an expired one", () => {
    const expired = complianceDocument({
      id: "tr-expired",
      docType: "TRAILER_REGO",
      status: "EXPIRED",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    const card = cardFor([expired, rejectedDocument], "TRAILER_REGO");

    expect(card.blocksAcceptance).toEqual({
      kind: "compliance",
      docType: "TRAILER_REGO",
      state: "expired",
      days: null,
    });
  });
});

describe("summarizeDocuments: grouping", () => {
  it("picks the latest version of a type by createdAt, in any input order", () => {
    const card = cardFor(
      [newerLicenceVersion, olderLicenceVersion],
      "DRIVER_LICENCE",
    );

    expect(card.latest.id).toBe("doc-licence-new");
    expect(card.attention.kind).toBe("valid");
  });

  it("makes one card per type in contract order", () => {
    const { cards } = summarizeDocuments(
      [
        approvedToday,
        approvedIn7Days,
        approvedIn8Days,
        approvedIn60Days,
        approvedIn61Days,
      ],
      COMPLIANCE_NOW,
    );

    expect(cards.map((card) => card.docType)).toEqual([
      "DRIVER_LICENCE",
      "VEHICLE_REGO",
      "PUBLIC_LIABILITY",
      "TRAILER_REGO",
      "DANGEROUS_GOODS",
    ]);
  });

  it("returns no cards, no count and no urgent card for an empty list", () => {
    expect(summarizeDocuments([], COMPLIANCE_NOW)).toEqual({
      cards: [],
      attentionCount: 0,
      mostUrgent: null,
    });
  });
});

describe("summarizeDocuments: summary", () => {
  it("counts the cards that need attention", () => {
    const summary = summarizeDocuments(
      [approvedIn61Days, approvedIn60Days, approvedIn7Days, approvedToday],
      COMPLIANCE_NOW,
    );

    expect(summary.attentionCount).toBe(3);
  });

  it("has no most urgent card when nothing needs attention", () => {
    const summary = summarizeDocuments([approvedIn61Days], COMPLIANCE_NOW);

    expect(summary.mostUrgent).toBeNull();
  });

  it("puts an expired document before one with days left", () => {
    const summary = summarizeDocuments(
      [approvedToday, approvedIn8Days, expiredDocument],
      COMPLIANCE_NOW,
    );

    expect(summary.mostUrgent?.docType).toBe("VEHICLE_REGO");
  });

  it("puts the one with the fewest days first among the rest", () => {
    const summary = summarizeDocuments(
      [approvedIn60Days, approvedIn8Days, approvedIn7Days],
      COMPLIANCE_NOW,
    );

    expect(summary.mostUrgent?.docType).toBe("TRAILER_REGO");
  });

  it("ranks a renewal under review by the red document it replaces", () => {
    const summary = summarizeDocuments(
      [approvedIn60Days, redApprovedPublicLiability, pendingRenewal],
      COMPLIANCE_NOW,
    );

    expect(summary.mostUrgent?.latest.id).toBe("doc-pl-pending");
  });

  it("ranks a rejected document with no current one after those with days", () => {
    const summary = summarizeDocuments(
      [rejectedDocument, approvedIn60Days],
      COMPLIANCE_NOW,
    );

    expect(summary.mostUrgent?.docType).toBe("VEHICLE_REGO");
  });
});
