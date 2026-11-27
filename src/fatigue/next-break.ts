import type { FatigueStatus } from "./types";

export type NextBreak =
  { kind: "in"; ms: number } | { kind: "due" } | { kind: "none" };

// El back da la hora del próximo break; la app solo la compara con `now`.
export function nextBreakFor(status: FatigueStatus, now: Date): NextBreak {
  if (status.state !== "working" || status.nextBreakDueAt === null) {
    return { kind: "none" };
  }
  const ms = new Date(status.nextBreakDueAt).getTime() - now.getTime();
  return ms > 0 ? { kind: "in", ms } : { kind: "due" };
}
