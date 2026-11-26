import type { components } from "@/api/schema";

export type FatigueStatus = components["schemas"]["FatigueStatusResponseDto"];
export type FatigueEvent = components["schemas"]["FatigueEventResponseDto"];
export type WeekSummary = components["schemas"]["WeekSummaryResponseDto"];
export type FatigueState = components["schemas"]["FatigueState"];
export type FatigueEventType = components["schemas"]["FatigueEventType"];

// HVNL Standard Hours. Solo se muestran: las horas restantes y la hora del
// próximo break las calcula el back.
export const DAILY_LIMIT_HOURS = 12;
export const WEEKLY_LIMIT_HOURS = 72;
export const AMBER_FROM_HOURS = 9;
export const RED_ABOVE_HOURS = 11;
