import { http, HttpResponse } from "msw";

import { driverAccountFixture } from "@/test/auth-fixtures";
import {
  activeVehicleFixture,
  driverStatsFixture,
  inactiveVehicleFixture,
} from "@/test/profile-fixtures";
import { apiUrl, server } from "@/test/server";

import { fetchDriverStats, fetchActiveVehicles } from "./queries";

describe("fetchDriverStats", () => {
  it("asks for the month of the account id", async () => {
    let seen: { id?: string; period?: string | null } = {};
    server.use(
      http.get(apiUrl("/drivers/:id/stats"), ({ params, request }) => {
        seen = {
          id: params.id as string,
          period: new URL(request.url).searchParams.get("period"),
        };
        return HttpResponse.json(driverStatsFixture);
      }),
    );

    const stats = await fetchDriverStats(driverAccountFixture.id);

    expect(seen).toEqual({ id: driverAccountFixture.id, period: "month" });
    expect(stats.totalOrders).toBe(driverStatsFixture.totalOrders);
  });

  it("throws on a non-2xx response", async () => {
    server.use(
      http.get(apiUrl("/drivers/:id/stats"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    await expect(fetchDriverStats("x")).rejects.toThrow(/500/);
  });

  it("throws when the body is not the stats shape", async () => {
    server.use(
      http.get(apiUrl("/drivers/:id/stats"), () =>
        HttpResponse.json({ items: [], total: 0, page: 1 }),
      ),
    );

    await expect(fetchDriverStats("x")).rejects.toThrow(/shape/);
  });
});

describe("fetchActiveVehicles", () => {
  it("asks for one page of 100 and keeps only the active vehicles", async () => {
    let search = "";
    server.use(
      http.get(apiUrl("/vehicles"), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({
          items: [activeVehicleFixture, inactiveVehicleFixture],
          total: 2,
          page: 1,
          limit: 100,
          totalPages: 1,
        });
      }),
    );

    const vehicles = await fetchActiveVehicles();

    expect(search).toContain("page=1");
    expect(search).toContain("limit=100");
    expect(vehicles).toEqual([activeVehicleFixture]);
  });

  it("throws on a non-2xx response", async () => {
    server.use(
      http.get(apiUrl("/vehicles"), () =>
        HttpResponse.json({ message: "boom" }, { status: 503 }),
      ),
    );

    await expect(fetchActiveVehicles()).rejects.toThrow(/503/);
  });
});
