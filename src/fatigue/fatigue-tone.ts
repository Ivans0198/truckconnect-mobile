import type { SemanticTone } from "@/theme/tokens";

import { AMBER_FROM_HOURS, RED_ABOVE_HOURS } from "./types";

export type FatigueTone = Extract<
  SemanticTone,
  "success" | "warning" | "danger"
>;

export function fatigueTone(hours: number): FatigueTone {
  if (hours > RED_ABOVE_HOURS) return "danger";
  if (hours >= AMBER_FROM_HOURS) return "warning";
  return "success";
}
