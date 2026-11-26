import { fireEvent, screen } from "@testing-library/react-native";
import { delay, http, HttpResponse } from "msw";

import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";

import { HealthScreen } from "./HealthScreen";

describe("HealthScreen", () => {
  it("shows the app name and a checking state while the API answers", async () => {
    server.use(http.get(apiUrl("/health"), () => delay("infinite")));

    await renderWithQuery(<HealthScreen />);

    expect(screen.getByText("TruckConnect Driver")).toBeOnTheScreen();
    expect(screen.getByText("Checking connection…")).toBeOnTheScreen();
  });

  it("shows API online when GET /health answers ok", async () => {
    await renderWithQuery(<HealthScreen />);

    expect(await screen.findByText("API online")).toBeOnTheScreen();
  });

  it("shows an error with a Retry button when GET /health fails", async () => {
    server.use(
      http.get(
        apiUrl("/health"),
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    await renderWithQuery(<HealthScreen />);

    expect(
      await screen.findByText("Can't reach TruckConnect"),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Retry" })).toBeOnTheScreen();
  });

  it("checks again when the driver taps Retry", async () => {
    server.use(
      http.get(
        apiUrl("/health"),
        () => new HttpResponse(null, { status: 503 }),
        { once: true },
      ),
    );
    await renderWithQuery(<HealthScreen />);
    const retry = await screen.findByRole("button", { name: "Retry" });

    await fireEvent.press(retry);

    expect(await screen.findByText("API online")).toBeOnTheScreen();
  });

  it("shows the error state instead of crashing when the network is down", async () => {
    server.use(http.get(apiUrl("/health"), () => HttpResponse.error()));

    await renderWithQuery(<HealthScreen />);

    expect(
      await screen.findByText("Can't reach TruckConnect"),
    ).toBeOnTheScreen();
  });
});
