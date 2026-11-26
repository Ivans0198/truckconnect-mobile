# Contrato consumido: auth

La épica no expone interfaces propias: consume cuatro operaciones de
`docs/openapi.json`. Este archivo dice cuáles, con qué y qué hace la app con
cada respuesta. Los tipos salen de `src/api/schema.d.ts`.

| Operación            | Bearer | Body              | Lo usa                            |
| -------------------- | ------ | ----------------- | --------------------------------- |
| `POST /auth/login`   | no     | `LoginDto`        | login (Story 1)                   |
| `GET /auth/me`       | sí     | (ninguno)         | login, arranque (Stories 1, 2)    |
| `POST /auth/refresh` | no     | `RefreshTokenDto` | middleware (Story 2)              |
| `POST /auth/logout`  | sí     | `RefreshTokenDto` | log out, rol ajeno (Stories 1, 3) |

## `POST /auth/login`

| Respuesta   | La app                                                          |
| ----------- | --------------------------------------------------------------- |
| `200`       | Pide `GET /auth/me` con el `accessToken` recibido               |
| `400`       | "Incorrect email or password, or the account is not active"     |
| `401`       | "Incorrect email or password, or the account is not active"     |
| `429`       | "Too many attempts, try again in a moment"; conserva el email   |
| red / `5xx` | "Can't reach TruckConnect. Check your connection and try again" |

## `GET /auth/me`

| Respuesta               | En el login                          | Al arrancar o después               |
| ----------------------- | ------------------------------------ | ----------------------------------- |
| `200` DRIVER y ACTIVE   | guarda sesión y cuenta, entra        | actualiza la cuenta guardada        |
| `200` otro rol o estado | logout de cortesía, error en el form | cierra sesión, motivo `inactive`    |
| `401`                   | (no pasa: el token es de recién)     | lo maneja el middleware (renovar)   |
| red / `5xx`             | error de red del login               | sigue dentro con la cuenta guardada |

## `POST /auth/refresh`

| Respuesta         | La app                                                  |
| ----------------- | ------------------------------------------------------- |
| `200`             | Reemplaza el par de tokens y repite el request original |
| `401`             | Borra la sesión, vuelve al login con motivo `expired`   |
| `429`, `5xx`, red | La sesión queda; el request original falla con su error |

Nunca hay dos renovaciones en curso a la vez.

## `POST /auth/logout`

Cualquier respuesta, incluida la falta de red, termina igual: tokens y cuenta
borrados, caché limpia, login.

## Pruebas

Cada fila de estas tablas es un handler de msw en `src/test/server.ts` o en el
test que la usa, sobre el path del contrato. Playwright responde los mismos
paths con `page.route` en `tests/ui.spec.ts`.
