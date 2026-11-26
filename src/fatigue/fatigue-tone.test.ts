import { fatigueTone } from "./fatigue-tone";

describe("fatigueTone", () => {
  it.each([
    [8.9, "success"],
    [9, "warning"],
    [11, "warning"],
    [11.1, "danger"],
  ] as const)("gives %s h the %s tone", (hours, tone) => {
    expect(fatigueTone(hours)).toBe(tone);
  });
});
