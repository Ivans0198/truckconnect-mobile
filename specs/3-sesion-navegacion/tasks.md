---
description: "Task list for Sesión y navegación"
---

# Tasks: Sesión y navegación

**Input**: Design documents from `/specs/3-sesion-navegacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: MANDATORY (constitution, principle I). Every user story has its own "Tests for User Story N" section with at least one test task, listed before its implementation tasks. The tests are written first and confirmed failing. In Setup and Foundational too, a task that writes logic comes after the task that writes its failing test; tasks that only configure need no test.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: las dependencias nuevas y la configuración nativa.

- [ ] T001 Instalar `expo-secure-store`, `zustand`, `expo-linear-gradient` y `react-native-svg` con `pnpm exec expo install` (research R10), actualizando `package.json` y `pnpm-lock.yaml`
- [ ] T002 Agregar el plugin `expo-secure-store` a `plugins` en `app.json` (configuración nativa por config, nunca a mano en `android/`)
- [ ] T003 [P] Agregar a `src/test/server.ts` los handlers por defecto de `POST /auth/login`, `GET /auth/me` (DRIVER, ACTIVE), `POST /auth/refresh` y `POST /auth/logout` con las formas de `AuthTokensDto` y `UserResponseDto`, y fixtures tipados desde `src/api/schema.d.ts` en `src/test/auth-fixtures.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: almacenamiento de la sesión, su estado, el Bearer, y la estructura de rutas con guard y tab bar. Todas las historias montan sobre esto.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (write first) ⚠️

- [ ] T004 [P] Test de `src/auth/token-storage.test.ts`: guarda y lee el par de tokens bajo una sola key `truckconnect.session` (nunca una mitad), guarda y lee la cuenta bajo `truckconnect.account`, y `clear` borra las dos
- [ ] T005 [P] Test de `src/auth/session-store.test.ts`: las transiciones de data-model.md (`restoring` → `signedIn` / `signedOut`; `signedIn` → `signedOut` con `reason` `"expired"`, `"inactive"` o `null`)
- [ ] T006 [P] Test de `src/auth/end-session.test.ts`: `endSession(reason)` borra tokens y cuenta del almacenamiento, limpia la caché de Query y deja `signedOut` con ese `reason`
- [ ] T007 [P] Test de `src/api/auth-middleware.test.ts`: con sesión, todo request a la API lleva `Authorization: Bearer <accessToken>`; sin sesión, no lleva header; `POST /auth/login` y `POST /auth/refresh` nunca lo llevan
- [ ] T008 [P] Test de `src/navigation/tab-bar.test.tsx`: cuatro pestañas en orden Home, Fatigue, Docs, Profile, cada una con rol `tab`, nombre visible, estado seleccionado en la activa, y alto y ancho de al menos `TOUCH_TARGET_MIN`; la etiqueta mide al menos `fontSize.body`
- [ ] T009 [P] Test de `src/navigation/protected-routes.test.tsx` (con `renderRouter` de `expo-router/testing-library`): sin sesión, `/` y `/profile` muestran el login; con sesión, `/` muestra Home y `/sign-in` no es alcanzable (FR-001, escenario 1.1, edge case de enlace sin sesión)

### Implementation for Foundational

- [ ] T010 [P] `src/auth/token-storage.ts` sobre `expo-secure-store` y `src/auth/token-storage.web.ts` en memoria para Expo web, con las keys como constantes con nombre (pasa T004)
- [ ] T011 [P] `src/auth/session-store.ts` con Zustand y el tipo `SessionState` de data-model.md como unión discriminada (pasa T005)
- [ ] T012 `src/api/query-client.ts` con el `QueryClient` único de la app; `app/_layout.tsx` pasa a usarlo en vez de crear el suyo
- [ ] T013 `src/auth/end-session.ts` (pasa T006; depende de T010, T011, T012)
- [ ] T014 `src/api/auth-middleware.ts` con el Bearer en `onRequest`, registrado sobre `api` en `src/api/client.ts`; `authApi` sin middleware en el mismo archivo para `/auth/refresh` (pasa T007)
- [ ] T015 [P] `src/navigation/tab-icons.tsx` con los cuatro paths SVG de la tab bar del mockup `10_driver_home.html` y `src/navigation/tab-bar.tsx` con tokens (fondo `surface`, borde `border`, activa `primary`, inactiva `slate400`; etiquetas en `fontSize.body`, research R2) (pasa T008)
- [ ] T016 Rutas: `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx` con solo el encabezado "Welcome back" (US1 lo completa), `app/(tabs)/_layout.tsx` con `Tabs` y la tab bar propia, y `app/(tabs)/index.tsx`, `fatigue.tsx`, `docs.tsx`, `profile.tsx` mostrando su título; `Stack.Protected` en `app/_layout.tsx` atado a `session-store` (pasa T009)
- [ ] T017 Eliminar `app/index.tsx` y `src/health/` con sus tests (research R9)
- [ ] T018 Actualizar `.maestro/smoke.yaml` para que su primera aserción sea "Welcome back" en vez de la pantalla de salud
- [ ] T019 Actualizar `tests/ui.spec.ts`: sin sesión, `/` muestra "Welcome back"; captura, sin scroll horizontal y axe en los dos viewports. El `page.route` de `/health` se reemplaza por los de `/auth/*`

**Checkpoint**: la app arranca en el login, el guard funciona y la tab bar existe. Las historias pueden empezar.

---

## Phase 3: User Story 1 - Entrar a la app con mi cuenta (Priority: P1) 🎯 MVP

**Goal**: un conductor activo entra con email y contraseña y llega a Home; ninguna otra cuenta entra.

**Independent Test**: con msw, un DRIVER activo entra y ve Home; una cuenta ADMIN con credenciales válidas se queda en el login con su mensaje.

### Tests for User Story 1 (MANDATORY, write first) ⚠️

- [ ] T020 [P] [US1] Test de `src/auth/sign-in.test.ts`: login correcto con DRIVER y ACTIVE guarda el par de tokens y la cuenta y deja `signedIn`; el email se envía recortado; con rol ADMIN o CLIENT llama a `POST /auth/logout`, no guarda nada y devuelve el error `notDriver` aunque el logout falle; mapea `400` y `401` a `invalidCredentials`, `429` a `rateLimited`, red caída y `5xx` a `unreachable` (contracts/api-usage.md)
- [ ] T021 [P] [US1] Test de `src/auth/sign-in-screen.test.tsx`: escenarios 1.2 a 1.9 de la spec por rol y texto visible, con los mensajes exactos de research R5; campos vacíos muestran "Enter your email" / "Enter your password" y no envían nada; el botón "Sign in" queda deshabilitado mientras espera; "Forgot password?" muestra "Contact your dispatcher to reset your password" y conserva el email (FR-014); no hay botón "Use Face ID" (FR-015); el error se anuncia con `accessibilityLiveRegion`; mostrar y ocultar la contraseña (FR-002); con `reason` `"expired"` o `"inactive"` en el store, muestra su mensaje de data-model.md
- [ ] T022 [P] [US1] Agregar a `tests/ui.spec.ts` el login completo y el paso a Home con `page.route` sobre `/auth/login` y `/auth/me`: captura de Home con la tab bar y axe en los dos viewports; a 360×800 con el campo de contraseña enfocado, "Sign in" sigue visible

### Implementation for User Story 1

- [ ] T023 [US1] `src/auth/sign-in.ts`: `POST /auth/login`, `GET /auth/me` con el token nuevo, control de rol y estado, guardado en `token-storage` y paso a `signedIn`, con el resultado como unión discriminada (pasa T020)
- [ ] T024 [US1] `src/auth/sign-in-screen.tsx` según el mockup `09_driver_login.html`: `brandGradient` con `expo-linear-gradient`, campos "Email" y "Password" de al menos `TOUCH_TARGET_MIN`, botón "Sign in", "Forgot password?", la línea de Terms como texto; todo de `src/theme/tokens.ts` (pasa T021)
- [ ] T025 [US1] `app/(auth)/sign-in.tsx` compone `SignInScreen`; después del login el router lleva a `/` (pasa T022)

**Checkpoint**: User Story 1 funciona sola: se entra, se ve Home y la tab bar.

---

## Phase 4: User Story 2 - Seguir dentro sin volver a escribir la contraseña (Priority: P1)

**Goal**: la sesión sobrevive a reinicios y a la falta de red, se renueva sola, y sale solo cuando ya no se puede renovar o la cuenta dejó de estar activa.

**Independent Test**: entrar, reiniciar la app y llegar a Home sin login; un `401` en un pedido se resuelve con una sola renovación y el pedido se completa.

### Tests for User Story 2 (MANDATORY, write first) ⚠️

- [ ] T026 [P] [US2] Test de `src/auth/refresh-session.test.ts`: `200` devuelve `renewed` y guarda el par nuevo; `401` devuelve `rejected`; red caída, `429` y `5xx` devuelven `unreachable` sin tocar la sesión; dos llamadas simultáneas producen un solo `POST /auth/refresh` (data-model.md, `RefreshOutcome`)
- [ ] T027 [P] [US2] Agregar a `src/api/auth-middleware.test.ts`: un `401` en un path que no es `/auth/*` renueva y repite el request una vez con el token nuevo (escenario 2.2); tres `401` simultáneos producen una renovación y tres respuestas correctas (2.3); renovación `rejected` llama a `endSession("expired")` (2.4); `unreachable` deja la sesión y devuelve el `401` original (FR-007)
- [ ] T028 [P] [US2] Test de `src/auth/restore-session.test.ts`: con tokens guardados pasa a `signedIn` sin esperar red (2.1, 2.5); sin tokens pasa a `signedOut`; si `GET /auth/me` responde `status` distinto de `ACTIVE` o rol distinto de `DRIVER`, llama a `endSession("inactive")` (2.6); si `/auth/me` falla por red, sigue `signedIn`
- [ ] T029 [P] [US2] Test de `src/auth/use-current-account.test.tsx`: arranca con la cuenta guardada como `initialData` y, cuando `GET /auth/me` responde `200`, la reemplaza y la vuelve a guardar (FR-008)
- [ ] T030 [P] [US2] `.maestro/session.yaml`: login con un conductor de prueba, `stopApp` y `launchApp` sin `clearState`, y la primera aserción en un texto que solo tiene Home

### Implementation for User Story 2

- [ ] T031 [US2] `src/auth/refresh-session.ts` single-flight sobre `authApi` (pasa T026)
- [ ] T032 [US2] Renovación en `onResponse` de `src/api/auth-middleware.ts`, con el clon del request guardado en `onRequest` (pasa T027; depende de T031)
- [ ] T033 [P] [US2] `src/auth/use-current-account.ts` con la key `["auth", "me"]` como `const` junto al hook (pasa T029)
- [ ] T034 [US2] `src/auth/restore-session.ts` y su llamada en `app/_layout.tsx`, con la splash screen visible mientras se leen los tokens (research R6) (pasa T028)

**Checkpoint**: User Stories 1 y 2 funcionan; reiniciar la app no pide contraseña.

---

## Phase 5: User Story 3 - Cerrar sesión (Priority: P2)

**Goal**: el conductor cierra sesión desde Profile, con confirmación, haya red o no.

**Independent Test**: entrar, cerrar sesión, y comprobar que se ve el login y que el almacenamiento quedó vacío.

### Tests for User Story 3 (MANDATORY, write first) ⚠️

- [ ] T035 [P] [US3] Test de `src/auth/sign-out.test.ts`: llama a `POST /auth/logout` con el Bearer y el `refreshToken`, y después a `endSession(null)`; si el back responde error o no hay red, igual llama a `endSession(null)` (escenarios 3.2, 3.3)
- [ ] T036 [P] [US3] Test de `src/ui/confirm-dialog.test.tsx`: título, botón de confirmar y "Cancel", ambos con rol `button` y alto de al menos `TOUCH_TARGET_MIN`; "Cancel" lo cierra sin confirmar
- [ ] T037 [P] [US3] Test de `src/auth/sign-out-button.test.tsx`: "Log out" abre "Log out?" (3.1); confirmar cierra la sesión y deja el login a la vista (3.2); cancelar no cierra nada
- [ ] T038 [P] [US3] `.maestro/sign-out.yaml`: con sesión, Profile → "Log out" → confirmar → "Welcome back"; reabrir la app sigue en el login (3.4)

### Implementation for User Story 3

- [ ] T039 [P] [US3] `src/ui/confirm-dialog.tsx` con `Modal` de React Native (research R7) (pasa T036)
- [ ] T040 [US3] `src/auth/sign-out.ts` (pasa T035)
- [ ] T041 [US3] `src/auth/sign-out-button.tsx` y su uso en `app/(tabs)/profile.tsx` (pasa T037; depende de T039, T040)

**Checkpoint**: las tres historias funcionan por separado.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: lo que solo tiene sentido con las tres historias hechas.

- [ ] T042 [P] Agregar a `tests/ui.spec.ts` la captura del diálogo "Log out?" en Profile, sin scroll horizontal y con axe, en los dos viewports
- [ ] T043 Recorrer `quickstart.md` de punta a punta y dejar escrito en el PR qué capas se corrieron y cuáles quedan para una persona (Maestro, teléfono real)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias.
- **User Story 1 (Phase 3)**: depende de Foundational.
- **User Story 2 (Phase 4)**: depende de User Story 1 (necesita una sesión creada por el login para restaurarla y renovarla).
- **User Story 3 (Phase 5)**: depende de User Story 1 (necesita entrar para poder salir).
- **Polish (Phase 6)**: depende de las tres historias.

### User Story Dependencies

- **US1**: después de Foundational.
- **US2** y **US3**: después de US1. Entre ellas no hay dependencia y no comparten archivos: US2 toca `src/api/auth-middleware.ts`, `src/auth/refresh-session.ts`, `src/auth/restore-session.ts`, `src/auth/use-current-account.ts`, `app/_layout.tsx` y `.maestro/session.yaml`; US3 toca `src/auth/sign-out.ts`, `src/auth/sign-out-button.tsx`, `src/ui/confirm-dialog.tsx`, `app/(tabs)/profile.tsx` y `.maestro/sign-out.yaml`. Lo que las dos necesitan (`end-session.ts`, `token-storage.ts`, `session-store.ts`, los handlers de `src/test/server.ts`) está en Setup y Foundational. Cada test agrega sus casos con `server.use` dentro del propio test, sin tocar `src/test/server.ts`.

### Within Each User Story

- Los tests se escriben primero y fallan antes de implementar.
- Lógica en `src/` antes que la ruta en `app/`.
- Commit cada vez que una pieza queda verde.

### Parallel Opportunities

- T004 a T009 en paralelo; T010, T011 y T015 en paralelo.
- Los tests de cada historia marcados [P] en paralelo.
- US2 y US3 en paralelo después de US1.

---

## Parallel Example: User Story 2

```bash
Task: "Test de src/auth/refresh-session.test.ts"
Task: "Test de src/auth/restore-session.test.ts"
Task: "Test de src/auth/use-current-account.test.tsx"
Task: ".maestro/session.yaml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup y Foundational: la app arranca en el login, con guard y tab bar.
2. User Story 1: se entra y se ve Home.
3. **STOP and VALIDATE**: con eso ya se puede montar E2, E4 y E5 encima.

### Incremental Delivery

1. Setup + Foundational.
2. US1 → MVP.
3. US2 y US3 en paralelo.
4. Polish.

---

## Notes

- `expo-secure-store` es código nativo: después de Setup hace falta un dev build nuevo (`pnpm android`). Las historias con flujo de Maestro (Foundational, US2, US3) piden en el PR que una persona corra `pnpm e2e:android`.
- Las capturas de `tests/ui.spec.ts` cambian en Foundational, US1 y Polish. Una persona acepta las nuevas desde el job visual de cada PR.
- La tab bar va a diferir del mockup en el tamaño de las etiquetas (16 en vez de 10): es deliberado (research R2) y el PR lo dice.
