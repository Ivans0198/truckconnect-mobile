import type { components } from "@/api/schema";

export type AuthTokens = components["schemas"]["AuthTokensDto"];
export type Account = components["schemas"]["UserResponseDto"];

export type SignOutReason = "expired" | "inactive";

export type SessionState =
  | { status: "restoring" }
  | { status: "signedOut"; reason: SignOutReason | null }
  | { status: "signedIn" };
