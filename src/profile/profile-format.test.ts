import {
  emergencyContactOf,
  formatAbn,
  formatAuPhone,
  initialsOf,
  licenceLabel,
} from "./profile-format";

describe("formatAbn", () => {
  it("groups a raw ABN as NN NNN NNN NNN", () => {
    expect(formatAbn("72629318504")).toBe("72 629 318 504");
  });

  it("keeps an ABN that is already formatted", () => {
    expect(formatAbn("12 345 678 901")).toBe("12 345 678 901");
  });

  it.each(["1234", "ABC", "123456789012", ""])(
    "returns %p as it is when it does not fit",
    (value) => {
      expect(formatAbn(value)).toBe(value);
    },
  );
});

describe("formatAuPhone", () => {
  it("formats a raw mobile as +61 4NN NNN NNN", () => {
    expect(formatAuPhone("+61400777888")).toBe("+61 400 777 888");
  });

  it("formats a raw landline as +61 N NNNN NNNN", () => {
    expect(formatAuPhone("+61390001234")).toBe("+61 3 9000 1234");
  });

  it("keeps a phone that is already formatted", () => {
    expect(formatAuPhone("+61 412 555 102")).toBe("+61 412 555 102");
    expect(formatAuPhone("+61 3 9000 1234")).toBe("+61 3 9000 1234");
  });

  it.each(["0400777888", "+14155550123", "+6140077", "n/a", ""])(
    "returns %p as it is when it does not fit",
    (value) => {
      expect(formatAuPhone(value)).toBe(value);
    },
  );
});

describe("initialsOf", () => {
  it("takes the first letter of the first and last name", () => {
    expect(initialsOf("David Chen")).toBe("DC");
  });

  it("uses one letter for a single name", () => {
    expect(initialsOf("Madonna")).toBe("M");
  });

  it("ignores extra spaces and middle names", () => {
    expect(initialsOf("  anna  maria chen ")).toBe("AC");
  });
});

describe("licenceLabel", () => {
  it.each([
    ["HR", "Heavy Rigid (HR)"],
    ["HC", "Heavy Combination (HC)"],
    ["MC", "Multi Combination (MC)"],
  ])("spells out %s", (code, label) => {
    expect(licenceLabel(code)).toBe(label);
  });

  it("returns another value as it is", () => {
    expect(licenceLabel("LR")).toBe("LR");
  });

  it("returns nothing for null", () => {
    expect(licenceLabel(null)).toBeNull();
  });
});

describe("emergencyContactOf", () => {
  it("reads name and phone when both are strings", () => {
    expect(
      emergencyContactOf({ name: "Anna Chen", phone: "+61 412 555 199" }),
    ).toEqual({ name: "Anna Chen", phone: "+61 412 555 199" });
  });

  it.each([
    ["null", null],
    ["an empty object", {}],
    ["a name without phone", { name: "Anna" }],
    ["numbers", { name: 1, phone: 2 }],
    ["a string", "Anna"],
  ])("returns null for %s", (_label, value) => {
    expect(emergencyContactOf(value)).toBeNull();
  });
});
