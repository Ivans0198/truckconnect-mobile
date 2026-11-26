import { http, HttpResponse } from "msw";

import type { components } from "@/api/schema";

import { driverAccountFixture } from "./auth-fixtures";

type ApiError = components["schemas"]["ApiErrorDto"];
type AuthTokens = components["schemas"]["AuthTokensDto"];

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NO_CONTENT = 204;

// El conductor de prueba de los mocks de desarrollo. Los flows de Maestro
// escriben la contraseña en claro: es un mock, no un secreto.
export const DEV_DRIVER_EMAIL = driverAccountFixture.email;
export const DEV_DRIVER_PASSWORD = "driver-password";

// Los handlers no guardan estado: aceptan cualquier token con su prefijo, así
// uno leído de secure store tras matar la app sigue valiendo.
const ACCESS_TOKEN = "dev-mock-access-token";
const REFRESH_TOKEN = "dev-mock-refresh-token";
const BEARER_PREFIX = "Bearer ";

const issueTokens = (): AuthTokens => ({
  accessToken: ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
});

const errorResponse = (
  statusCode: number,
  message: string,
  error: string,
): Response => {
  const body: ApiError = { statusCode, message, error };
  return HttpResponse.json(body, { status: statusCode });
};

const unauthorized = (message: string): Response =>
  errorResponse(HTTP_UNAUTHORIZED, message, "Unauthorized");

// Un cuerpo ilegible o sin objeto se trata como vacío: el 400 lo decide el
// handler que sabe qué campos pide.
async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

async function login(request: Request): Promise<Response> {
  const { email, password } = await readJsonObject(request);
  if (typeof email !== "string" || typeof password !== "string") {
    return errorResponse(
      HTTP_BAD_REQUEST,
      "email and password are required",
      "Bad Request",
    );
  }
  // Comparación exacta: la app ya recorta el email antes de enviarlo.
  const isDriver =
    email === DEV_DRIVER_EMAIL && password === DEV_DRIVER_PASSWORD;
  return isDriver
    ? HttpResponse.json(issueTokens())
    : unauthorized("Invalid credentials");
}

function me(request: Request): Response {
  const authorization = request.headers.get("Authorization");
  return authorization === `${BEARER_PREFIX}${ACCESS_TOKEN}`
    ? HttpResponse.json(driverAccountFixture)
    : unauthorized("Unauthorized");
}

async function refresh(request: Request): Promise<Response> {
  const { refreshToken } = await readJsonObject(request);
  return refreshToken === REFRESH_TOKEN
    ? HttpResponse.json(issueTokens())
    : unauthorized("Invalid refresh token");
}

// Las cuatro operaciones de auth del contrato, contra un conductor ACTIVE.
export function createDevAuthHandlers(baseUrl: string) {
  return [
    http.post(`${baseUrl}/auth/login`, ({ request }) => login(request)),
    http.get(`${baseUrl}/auth/me`, ({ request }) => me(request)),
    http.post(`${baseUrl}/auth/refresh`, ({ request }) => refresh(request)),
    http.post(
      `${baseUrl}/auth/logout`,
      () => new HttpResponse(null, { status: HTTP_NO_CONTENT }),
    ),
  ];
}
