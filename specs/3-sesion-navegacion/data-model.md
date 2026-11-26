# Data model: Sesión y navegación

Los tipos de la API salen de `src/api/schema.d.ts`; acá solo se nombran. Lo que
no viene del contrato es estado de la app.

## Tokens (del contrato)

`components["schemas"]["AuthTokensDto"]`: `accessToken`, `refreshToken`.

- Se guardan en secure store bajo una sola key (`truckconnect.session`), como
  JSON, para que nunca quede guardada una mitad del par.
- Se reemplazan completos en cada renovación: el back rota `refreshToken`.
- Se borran al cerrar sesión, al ser rechazada la renovación, o cuando la
  cuenta deja de ser válida.

## Cuenta (del contrato)

`components["schemas"]["UserResponseDto"]`. La app usa `id`, `fullName`,
`email`, `role` y `status`.

- `role`: `ADMIN | DRIVER | CLIENT`. Solo `DRIVER` entra.
- `status`: `ACTIVE | SUSPENDED | PENDING_VERIFICATION | DEACTIVATED`. Solo
  `ACTIVE` se queda dentro.
- Copia de arranque en secure store (`truckconnect.account`), escrita cada vez
  que `GET /auth/me` responde `200`.

## Estado de la sesión (local)

```ts
type SignOutReason = "expired" | "inactive";

type SessionState =
  | { status: "restoring" }
  | { status: "signedOut"; reason: SignOutReason | null }
  | { status: "signedIn" };
```

Transiciones:

| Desde       | Evento                                            | Hacia                        |
| ----------- | ------------------------------------------------- | ---------------------------- |
| `restoring` | hay tokens guardados                              | `signedIn`                   |
| `restoring` | no hay tokens                                     | `signedOut` (`reason: null`) |
| `signedOut` | login correcto con rol DRIVER y estado ACTIVE     | `signedIn`                   |
| `signedIn`  | renovación rechazada (`401` en `/auth/refresh`)   | `signedOut` (`expired`)      |
| `signedIn`  | `/auth/me` con `status` no ACTIVE o rol no DRIVER | `signedOut` (`inactive`)     |
| `signedIn`  | el conductor confirma "Log out"                   | `signedOut` (`reason: null`) |

El rol ajeno en el login no pasa por `signedIn`: el login lo muestra como
error del formulario ("This app is for TruckConnect drivers only") y el
estado sigue en `signedOut`.

Mensajes del login según `reason`:

| `reason`   | Mensaje                                              |
| ---------- | ---------------------------------------------------- |
| `expired`  | Your session has expired. Please sign in again.      |
| `inactive` | Your account is not active. Contact your dispatcher. |

## Resultado de la renovación (local)

```ts
type RefreshOutcome =
  | { kind: "renewed"; tokens: AuthTokens }
  | { kind: "rejected" }
  | { kind: "unreachable" };
```

`rejected` solo con `401`. Error de red, `429` y `5xx` son `unreachable` y
dejan la sesión como está.

## Formulario de login (local)

| Campo      | Regla                                                              |
| ---------- | ------------------------------------------------------------------ |
| `email`    | Obligatorio. Se recorta antes de enviar. Se conserva tras un error |
| `password` | Obligatorio. Oculto por defecto, con botón para mostrarlo          |

Mensajes de campo vacío: "Enter your email", "Enter your password".
