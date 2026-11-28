import { toSubmission, validateDraft, type DocumentDraft } from "./draft";

const completeDraft: DocumentDraft = {
  docType: "PUBLIC_LIABILITY",
  vehicleId: null,
  issueDate: "2026-06-17",
  expiryDate: "2027-06-17",
  file: {
    uri: "file:///tmp/policy.pdf",
    name: "policy.pdf",
    mimeType: "application/pdf",
  },
};

describe("validateDraft", () => {
  it("returns no errors for a complete draft", () => {
    expect(validateDraft(completeDraft)).toEqual([]);
  });

  it("flags a missing type", () => {
    expect(validateDraft({ ...completeDraft, docType: null })).toEqual([
      "missing-type",
    ]);
  });

  it("flags a missing file", () => {
    expect(validateDraft({ ...completeDraft, file: null })).toEqual([
      "missing-file",
    ]);
  });

  it("flags a missing issue date", () => {
    expect(validateDraft({ ...completeDraft, issueDate: null })).toEqual([
      "missing-issue-date",
    ]);
  });

  it("flags a missing expiry date", () => {
    expect(validateDraft({ ...completeDraft, expiryDate: null })).toEqual([
      "missing-expiry-date",
    ]);
  });

  it.each([
    ["the same day", "2026-06-17"],
    ["before the issue date", "2026-06-16"],
  ])("flags an expiry on %s as not after the issue", (_label, expiryDate) => {
    expect(validateDraft({ ...completeDraft, expiryDate })).toEqual([
      "expiry-not-after-issue",
    ]);
  });

  it("does not compare the dates when one is missing", () => {
    expect(
      validateDraft({ ...completeDraft, issueDate: null, expiryDate: null }),
    ).toEqual(["missing-issue-date", "missing-expiry-date"]);
  });

  it("flags a file that is not a PDF, JPEG or PNG", () => {
    const file = {
      uri: "file:///tmp/notes.txt",
      name: "notes.txt",
      mimeType: "text/plain",
    };
    expect(validateDraft({ ...completeDraft, file })).toEqual([
      "unsupported-file",
    ]);
  });

  it.each(["image/jpeg", "image/png"])("accepts %s", (mimeType) => {
    const file = { uri: "file:///tmp/a", name: "a", mimeType };
    expect(validateDraft({ ...completeDraft, file })).toEqual([]);
  });

  it("asks for a vehicle on the two registration types", () => {
    for (const docType of ["VEHICLE_REGO", "TRAILER_REGO"] as const) {
      expect(validateDraft({ ...completeDraft, docType })).toEqual([
        "missing-vehicle",
      ]);
      expect(
        validateDraft({ ...completeDraft, docType, vehicleId: "v-1" }),
      ).toEqual([]);
    }
  });

  it("lists every problem of an empty draft", () => {
    expect(
      validateDraft({
        docType: null,
        vehicleId: null,
        issueDate: null,
        expiryDate: null,
        file: null,
      }),
    ).toEqual([
      "missing-type",
      "missing-file",
      "missing-issue-date",
      "missing-expiry-date",
    ]);
  });
});

describe("toSubmission", () => {
  it("returns the draft ready to send when it is complete", () => {
    const { vehicleId: _omitted, ...expected } = completeDraft;
    expect(toSubmission(completeDraft)).toEqual(expected);
  });

  it("carries the vehicle only for the registration types", () => {
    const rego = { ...completeDraft, docType: "VEHICLE_REGO" as const };
    expect(toSubmission({ ...rego, vehicleId: "v-1" })).toMatchObject({
      vehicleId: "v-1",
    });
    expect(
      toSubmission({ ...completeDraft, vehicleId: "v-1" }),
    ).not.toHaveProperty("vehicleId");
    expect(toSubmission(rego)).toBeNull();
  });

  it("returns null when something is wrong", () => {
    expect(toSubmission({ ...completeDraft, file: null })).toBeNull();
  });
});
