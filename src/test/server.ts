import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { TEST_API_URL } from "./env";

export const apiUrl = (path: string): string => `${TEST_API_URL}${path}`;

export const healthOk = http.get(apiUrl("/health"), () =>
  HttpResponse.json({ status: "ok", info: { database: { status: "up" } } }),
);

export const server = setupServer(healthOk);
