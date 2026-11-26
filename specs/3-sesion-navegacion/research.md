# Research: Sesión y navegación

Decisiones técnicas de la épica #3. Cada una dice qué se eligió, por qué y qué
se descartó. No queda ninguna duda abierta.

## R1. Guard de rutas

- **Decision**: `Stack.Protected` de Expo Router en `app/_layout.tsx`, con
  `guard` atado al estado de la sesión. Grupo `(auth)` con `sign-in` visible
  solo sin sesión; grupo `(tabs)` visible solo con sesión.
- **Rationale**: es el mecanismo del router para esto. Si el guard pasa a
  falso, el router saca al conductor de las pantallas protegidas solo, y un
  enlace a una pantalla interna sin sesión cae en el login (edge case de la
  spec). No hace falta un `useEffect` con `router.replace` en cada pantalla.
- **Alternatives considered**: redirigir con `<Redirect>` en cada layout
  (duplica la regla en varios lados); un HOC de pantalla protegida (no
  protege las rutas que alguien olvide envolver).

## R2. Tab bar

- **Decision**: `Tabs` de `expo-router` (tabs en JS) con una tab bar propia
  dibujada con los tokens: fondo blanco, borde superior `slate200`, icono y
  etiqueta azul en la pestaña activa y `slate400` en las otras. Los iconos son
  los mismos paths SVG del mockup 10 (Heroicons), dibujados con
  `react-native-svg`.
- **Rationale**: el mockup manda sobre el estilo de la plataforma.
  `NativeTabs` usa la barra de Material en Android y no se puede llevar al
  mockup, y además no se renderiza igual en Expo web, que es donde corren
  Playwright y el ui-reviewer.
- **Alternatives considered**: `NativeTabs` (descartado arriba);
  `@expo/vector-icons` (no tiene esos iconos exactos de Heroicons).
- **Desvío deliberado del mockup**: las etiquetas del mockup miden 10 px. La
  regla 2 de `docs/CLAUDE_MOBILE.md` y la regla obligatoria del perfil piden
  texto de al menos 16 y áreas de 60. Esa regla está por encima del mockup
  (`CLAUDE.md`, orden de precedencia), así que las etiquetas van en
  `fontSize.body` y cada pestaña mide al menos `TOUCH_TARGET_MIN`. La captura
  de la tab bar va a diferir del PNG del mockup por eso; el PR lo dice.

## R3. Dónde viven la sesión y la cuenta

- **Decision**:
  - Los tokens (acceso y renovación) viven en `expo-secure-store`, en un
    módulo `src/auth/token-storage.ts` con stub `token-storage.web.ts` en
    memoria para Expo web.
  - El estado de la sesión (`signedOut` / `signedIn`, y el motivo de la
    última salida para el mensaje del login) vive en un store de Zustand,
    `src/auth/session-store.ts`. Es estado local de la app, no del servidor.
  - La cuenta (`GET /auth/me`) es estado del servidor: vive en TanStack Query
    con la key `["auth", "me"]`. Para entrar sin red, la última respuesta se
    guarda también en secure store y se usa como `initialData` de esa query
    al arrancar.
- **Rationale**: cumple las dos reglas obligatorias del perfil: tokens solo en
  secure store, y datos del servidor en Query, nunca copiados a un store. La
  copia en disco es caché de arranque, no una segunda fuente: la query la
  reemplaza en cuanto el back responde.
- **Alternatives considered**: guardar la cuenta en el store de Zustand
  (rompe la regla de Server state); persistir toda la caché de Query con
  `persistQueryClient` (otra dependencia para guardar un solo objeto);
  AsyncStorage para la cuenta (otra dependencia, y es información personal:
  mejor cifrada).

## R4. Bearer y renovación automática

- **Decision**: un middleware de `openapi-fetch` en `src/api/auth-middleware.ts`
  registrado sobre el cliente `api` de `src/api/client.ts`.
  - `onRequest`: agrega `Authorization: Bearer <access>` si hay sesión, y
    guarda un clon del request para poder repetirlo.
  - `onResponse`: con un `401` en cualquier path que no sea `/auth/*`, pide la
    renovación y repite el request una vez con el token nuevo.
  - La renovación es **single-flight**: una sola promesa compartida mientras
    está en curso, así varios `401` simultáneos producen un solo
    `POST /auth/refresh` (escenario 2.3).
  - `POST /auth/refresh` sale por un cliente sin ese middleware, para que un
    `401` de la renovación no dispare otra renovación.
- **Resultado de la renovación**, como unión discriminada
  (`renewed` / `rejected` / `unreachable`):
  - `200`: guarda el par nuevo (el back rota la credencial de renovación).
  - `401`: `rejected`. Borra la sesión y sale con motivo `expired`
    (escenario 2.4).
  - Error de red, `429` o `5xx`: `unreachable`. La sesión queda; el request
    original devuelve su `401` y la pantalla muestra su error normal
    (FR-007 y edge case de la spec).
- **Rationale**: un solo lugar para el token. Las pantallas no saben que la
  sesión se renueva.
- **Alternatives considered**: renovar por tiempo antes de que venza (el
  contrato no dice cuánto dura el acceso, y el `401` igual hay que
  manejarlo); envolver `fetch` global (afectaría el `PUT` a R2 de épicas
  futuras, que no lleva Bearer).

## R5. Login y control de rol

- **Decision**: `POST /auth/login` con el email recortado, luego
  `GET /auth/me` con el token nuevo. Si `role !== "DRIVER"` o
  `status !== "ACTIVE"`, se hace un `POST /auth/logout` de cortesía para
  revocar la credencial (si falla, no importa) y no se guarda nada. Solo con
  rol y estado correctos se guarda la sesión.
- **Mapeo de errores del login**:

  | Respuesta                    | Mensaje                                                       |
  | ---------------------------- | ------------------------------------------------------------- |
  | `401`                        | Incorrect email or password, or the account is not active     |
  | `429`                        | Too many attempts, try again in a moment                      |
  | `400`                        | Incorrect email or password, or the account is not active     |
  | rol no DRIVER                | This app is for TruckConnect drivers only                     |
  | red caída, `5xx`, inesperado | Can't reach TruckConnect. Check your connection and try again |

  Un `400` solo llega si el email no tiene formato válido; para el conductor
  es lo mismo que credenciales incorrectas.

- **Rationale**: el contrato no trae el rol en la respuesta del login, así que
  hay que pedir `/auth/me`. Revocar la credencial de un rol ajeno evita dejar
  una sesión viva que la app nunca va a usar.

## R6. Arranque con sesión guardada

- **Decision**: al abrir, `src/auth/restore-session.ts` lee los tokens y la
  cuenta guardada. Con tokens, el estado pasa a `signedIn` en el acto (sin
  esperar red) y la query `["auth","me"]` se valida en segundo plano. Si el
  back responde con `status` distinto de `ACTIVE` o rol distinto de `DRIVER`,
  se cierra la sesión con motivo `inactive` (escenario 2.6). Mientras se leen
  los tokens se mantiene la splash screen, como ya se hace con las fuentes.
- **Rationale**: escenario 2.5. Sin red, el conductor entra igual.

## R7. Confirmación de "Log out"

- **Decision**: un diálogo propio con `Modal` de React Native: título
  "Log out?", botones "Log out" y "Cancel" de al menos 60 de alto.
- **Rationale**: `Alert.alert` no hace nada en react-native-web, así que
  Playwright y el ui-reviewer no podrían ver la confirmación. Un componente
  propio se prueba igual en jest, en web y en Android.
- **Alternatives considered**: `Alert.alert` (descartado arriba); una ruta
  modal del router (más maquinaria para dos botones).

## R8. Cierre de sesión

- **Decision**: `POST /auth/logout` con el Bearer y la credencial de
  renovación; pase lo que pase con esa llamada, se borran tokens y cuenta de
  secure store, se limpia la caché de Query y el estado pasa a `signedOut`.
- **Rationale**: escenarios 3.2 y 3.3. Limpiar la caché evita que el próximo
  conductor en ese teléfono vea datos del anterior.

## R9. Lo que deja de existir

- **Decision**: la pantalla de salud (`app/index.tsx` y `src/health/`) se
  elimina con sus tests. `/` pasa a ser la pestaña Home. `.maestro/smoke.yaml`
  y `tests/ui.spec.ts` pasan a esperar el login.
- **Rationale**: era el esqueleto del bootstrap. Dejarla sería código muerto
  detrás del guard.

## R10. Dependencias nuevas

Todas con `pnpm exec expo install`.

| Paquete                | Para qué                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| `expo-secure-store`    | Tokens y cuenta guardada, cifrados (regla obligatoria del perfil)           |
| `zustand`              | Estado de la sesión, compartido por el guard, el middleware y las pantallas |
| `expo-linear-gradient` | El degradado de marca del login (`brandGradient`, mockup 09)                |
| `react-native-svg`     | Los iconos de la tab bar y del login, con los paths del mockup              |

`expo-secure-store` agrega código nativo: la historia que lo instala necesita
un dev build nuevo (`pnpm android`) y su flujo de Maestro.
