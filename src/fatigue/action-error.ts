import type { components } from "@/api/schema";

export type FatigueActionError =
  | { kind: "offline" }
  | { kind: "rate-limited" }
  | { kind: "rejected"; message: string };

// Lo que dejó el pedido: o el fetch lanzó (sin respuesta), o hubo un no-2xx.
export type FatigueActionFailure =
  | { thrown: unknown }
  | { status: number; body: components["schemas"]["ApiErrorDto"] | undefined };

const TOO_MANY_REQUESTS = 429;
const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export class FatigueActionFailed extends Error {
  readonly error: FatigueActionError;

  constructor(error: FatigueActionError) {
    super(error.kind === "rejected" ? error.message : error.kind);
    this.name = "FatigueActionFailed";
    this.error = error;
  }
}

export function classifyFatigueActionError(
  failure: FatigueActionFailure,
): FatigueActionError {
  if ("thrown" in failure) return { kind: "offline" };
  if (failure.status === TOO_MANY_REQUESTS) return { kind: "rate-limited" };
  const message = failure.body?.message;
  if (!message || message.length === 0) {
    return { kind: "rejected", message: FALLBACK_MESSAGE };
  }
  return {
    kind: "rejected",
    message: Array.isArray(message) ? message.join(". ") : message,
  };
}
