import type { FatigueState } from "./types";

export type FatigueAction =
  "start-day" | "start-break" | "end-break" | "end-day";

const ACTIONS_BY_STATE: Record<FatigueState, readonly FatigueAction[]> = {
  off_duty: ["start-day"],
  working: ["start-break", "end-day"],
  on_break: ["end-break", "end-day"],
};

// El back valida la transición; la app solo ofrece las que tienen sentido.
export function fatigueActionsFor(state: FatigueState): FatigueAction[] {
  return [...ACTIONS_BY_STATE[state]];
}
