import { fatigueActionsFor } from "./fatigue-actions";

describe("fatigueActionsFor", () => {
  it("offers only Start Day when the driver is off duty", () => {
    expect(fatigueActionsFor("off_duty")).toEqual(["start-day"]);
  });

  it("offers a break and the end of the day while working", () => {
    expect(fatigueActionsFor("working")).toEqual(["start-break", "end-day"]);
  });

  it("offers the end of the break and of the day while on break", () => {
    expect(fatigueActionsFor("on_break")).toEqual(["end-break", "end-day"]);
  });
});
