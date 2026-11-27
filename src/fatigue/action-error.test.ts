import { classifyFatigueActionError } from "./action-error";

describe("classifyFatigueActionError", () => {
  it("classifies a fetch that throws as offline", () => {
    expect(
      classifyFatigueActionError({ thrown: new TypeError("fail") }),
    ).toEqual({ kind: "offline" });
  });

  it("classifies a 429 as rate-limited", () => {
    expect(
      classifyFatigueActionError({
        status: 429,
        body: { statusCode: 429, message: "Too Many Requests" },
      }),
    ).toEqual({ kind: "rate-limited" });
  });

  it.each([400, 403])("keeps the back's message on a %i", (status) => {
    expect(
      classifyFatigueActionError({
        status,
        body: { statusCode: status, message: "Driver is already on break" },
      }),
    ).toEqual({ kind: "rejected", message: "Driver is already on break" });
  });

  it("joins the lines when the message is an array", () => {
    expect(
      classifyFatigueActionError({
        status: 400,
        body: { statusCode: 400, message: ["First problem", "Second problem"] },
      }),
    ).toEqual({ kind: "rejected", message: "First problem. Second problem" });
  });

  it("falls back to a generic message when the body has none", () => {
    expect(
      classifyFatigueActionError({ status: 500, body: undefined }),
    ).toEqual({
      kind: "rejected",
      message: "Something went wrong. Try again.",
    });
  });
});
