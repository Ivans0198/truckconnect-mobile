import { emergencyContactOf, initialsOf, licenceLabel } from "./profile-format";

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
