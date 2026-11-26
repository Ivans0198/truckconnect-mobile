import { create } from "zustand";

import type { SessionState, SignOutReason } from "./types";

type SessionStore = {
  session: SessionState;
  finishRestoring: (options: { hasTokens: boolean }) => void;
  signIn: () => void;
  signOut: (reason: SignOutReason | null) => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  session: { status: "restoring" },
  finishRestoring: ({ hasTokens }) =>
    set({
      session: hasTokens
        ? { status: "signedIn" }
        : { status: "signedOut", reason: null },
    }),
  signIn: () => set({ session: { status: "signedIn" } }),
  signOut: (reason) => set({ session: { status: "signedOut", reason } }),
}));
