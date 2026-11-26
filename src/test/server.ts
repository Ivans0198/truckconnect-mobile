import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { driverAccountFixture, tokensFixture } from "./auth-fixtures";
import { TEST_API_URL } from "./env";
import {
  fatigueEventsFixture,
  fatigueStatusFixture,
  weekSummaryFixture,
} from "./fatigue-fixtures";

export const apiUrl = (path: string): string => `${TEST_API_URL}${path}`;

export const healthOk = http.get(apiUrl("/health"), () =>
  HttpResponse.json({ status: "ok", info: { database: { status: "up" } } }),
);

// Respuestas felices de las cuatro operaciones de auth; cada test las pisa
// con server.use() cuando necesita otro caso.
export const authHandlers = [
  http.post(apiUrl("/auth/login"), () => HttpResponse.json(tokensFixture)),
  http.get(apiUrl("/auth/me"), () => HttpResponse.json(driverAccountFixture)),
  http.post(apiUrl("/auth/refresh"), () => HttpResponse.json(tokensFixture)),
  http.post(
    apiUrl("/auth/logout"),
    () => new HttpResponse(null, { status: 204 }),
  ),
];

// Respuestas felices de las tres lecturas de fatiga.
export const fatigueHandlers = [
  http.get(apiUrl("/fatigue/status"), () =>
    HttpResponse.json(fatigueStatusFixture),
  ),
  http.get(apiUrl("/fatigue/events"), () =>
    HttpResponse.json(fatigueEventsFixture),
  ),
  http.get(apiUrl("/fatigue/week-summary"), () =>
    HttpResponse.json(weekSummaryFixture),
  ),
];

export const server = setupServer(
  healthOk,
  ...authHandlers,
  ...fatigueHandlers,
);
