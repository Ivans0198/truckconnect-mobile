import { fireEvent, render, screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";

import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { useSessionStore } from "./session-store";
import { SignInScreen } from "./sign-in-screen";

const EMAIL = "driver@truckconnect.test";

const initialState = useSessionStore.getState();
const getSession = () => useSessionStore.getState().session;

async function fillAndSubmit(email = EMAIL, password = "secret") {
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), password);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
}

const loginReturns = (status: number) =>
  server.use(
    http.post(apiUrl("/auth/login"), () =>
      HttpResponse.json({ message: "no" }, { status }),
    ),
  );

describe("SignInScreen", () => {
  beforeEach(() => {
    useSessionStore.setState(initialState, true);
    useSessionStore.getState().finishRestoring({ hasTokens: false });
  });

  it("signs a driver in", async () => {
    await render(<SignInScreen />);

    await fillAndSubmit();

    await screen.findByRole("button", { name: "Sign in" });
    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it("does not offer Face ID", async () => {
    await render(<SignInScreen />);

    expect(screen.queryByText(/face id/i)).toBeNull();
  });

  it("hides the password and lets the driver show it", async () => {
    await render(<SignInScreen />);
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);

    await fireEvent.press(
      screen.getByRole("button", { name: "Show password" }),
    );

    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeOnTheScreen();
  });

  it("asks for the email and sends nothing when it is empty", async () => {
    let requests = 0;
    server.use(
      http.post(apiUrl("/auth/login"), () => {
        requests += 1;
        return HttpResponse.json(tokensFixture);
      }),
    );
    await render(<SignInScreen />);

    await fireEvent.changeText(screen.getByLabelText("Password"), "secret");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your email")).toBeOnTheScreen();
    expect(requests).toBe(0);
  });

  it("asks for the password and sends nothing when it is empty", async () => {
    await render(<SignInScreen />);

    await fireEvent.changeText(screen.getByLabelText("Email"), EMAIL);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your password")).toBeOnTheScreen();
    expect(screen.queryByText("Enter your email")).toBeNull();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("treats a blank email as empty", async () => {
    await render(<SignInScreen />);

    await fillAndSubmit("   ", "secret");

    expect(await screen.findByText("Enter your email")).toBeOnTheScreen();
  });

  it.each([400, 401])(
    "explains incorrect credentials on a %i and keeps the email",
    async (status) => {
      loginReturns(status);
      await render(<SignInScreen />);

      await fillAndSubmit();

      expect(
        await screen.findByText(
          "Incorrect email or password, or the account is not active",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Email").props.value).toBe(EMAIL);
    },
  );

  it("tells an ADMIN account the app is for drivers only", async () => {
    server.use(
      http.get(apiUrl("/auth/me"), () =>
        HttpResponse.json({ ...driverAccountFixture, role: "ADMIN" }),
      ),
    );
    await render(<SignInScreen />);

    await fillAndSubmit();

    expect(
      await screen.findByText("This app is for TruckConnect drivers only"),
    ).toBeOnTheScreen();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("tells the driver to wait on a 429 and allows trying again", async () => {
    loginReturns(429);
    await render(<SignInScreen />);

    await fillAndSubmit();
    expect(
      await screen.findByText("Too many attempts, try again in a moment"),
    ).toBeOnTheScreen();

    server.resetHandlers();
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("button", { name: "Sign in" });
    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it.each([
    ["a server error", () => loginReturns(503)],
    [
      "no network",
      () =>
        server.use(
          http.post(apiUrl("/auth/login"), () => HttpResponse.error()),
        ),
    ],
  ])("offers to retry on %s", async (_name, breakLogin) => {
    breakLogin();
    await render(<SignInScreen />);

    await fillAndSubmit();

    expect(
      await screen.findByText(
        "Can't reach TruckConnect. Check your connection and try again",
      ),
    ).toBeOnTheScreen();
    server.resetHandlers();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("button", { name: "Sign in" });
    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it("shows the dispatcher hint on Forgot password and keeps the email", async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText("Email"), EMAIL);

    await fireEvent.press(
      screen.getByRole("button", { name: "Forgot password?" }),
    );

    expect(
      await screen.findByText("Contact your dispatcher to reset your password"),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Email").props.value).toBe(EMAIL);
  });

  it("shows a working button that cannot be pressed twice while waiting", async () => {
    let requests = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(apiUrl("/auth/login"), async () => {
        requests += 1;
        await gate;
        return HttpResponse.json(tokensFixture);
      }),
    );
    await render(<SignInScreen />);

    await fillAndSubmit();
    const working = await screen.findByRole("button", { name: "Signing in…" });
    await fireEvent.press(working);

    expect(working).toBeDisabled();
    release();
    await screen.findByRole("button", { name: "Sign in" });
    expect(requests).toBe(1);
  });

  it("announces errors in a live region", async () => {
    loginReturns(401);
    await render(<SignInScreen />);

    await fillAndSubmit();

    const message = await screen.findByText(
      "Incorrect email or password, or the account is not active",
    );
    expect(message.props.accessibilityLiveRegion).toBe("polite");
  });

  it.each([
    ["expired", "Your session has expired. Please sign in again."],
    ["inactive", "Your account is not active. Contact your dispatcher."],
  ] as const)("shows the message for reason %s", async (reason, text) => {
    useSessionStore.getState().signOut(reason);

    await render(<SignInScreen />);

    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it("shows no reason message when the driver signed out on purpose", async () => {
    await render(<SignInScreen />);

    expect(screen.queryByText(/session has expired/)).toBeNull();
    expect(screen.queryByText(/account is not active/)).toBeNull();
  });
});
