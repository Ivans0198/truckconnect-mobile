import { useSessionStore } from "./session-store";

const initialState = useSessionStore.getState();
const getSession = () => useSessionStore.getState().session;

describe("session store", () => {
  beforeEach(() => useSessionStore.setState(initialState, true));

  it("starts restoring", () => {
    expect(getSession()).toEqual({ status: "restoring" });
  });

  it("goes from restoring to signedIn when tokens were stored", () => {
    useSessionStore.getState().finishRestoring({ hasTokens: true });

    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it("goes from restoring to signedOut without a reason when nothing was stored", () => {
    useSessionStore.getState().finishRestoring({ hasTokens: false });

    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("goes from signedOut to signedIn after a successful login", () => {
    useSessionStore.getState().finishRestoring({ hasTokens: false });

    useSessionStore.getState().signIn();

    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it.each(["expired", "inactive", null] as const)(
    "goes from signedIn to signedOut with reason %s",
    (reason) => {
      useSessionStore.getState().signIn();

      useSessionStore.getState().signOut(reason);

      expect(getSession()).toEqual({ status: "signedOut", reason });
    },
  );
});
