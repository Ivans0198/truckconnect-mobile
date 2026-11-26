# Implementation Plan: Sesión y navegación

**Branch**: `spec-3` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Generated with**: fabrica 0.5.23, Spec Kit 1.2.2

**Input**: Feature specification from `/specs/3-sesion-navegacion/spec.md`

## Summary

El conductor entra con email y contraseña, solo si su cuenta es DRIVER y está
activa. La sesión queda cifrada en el teléfono, se renueva sola cuando el
acceso vence y sobrevive a reinicios y a la falta de red. Un guard del router
separa el login de las cuatro pestañas (Home, Fatigue, Docs, Profile), y
Profile ofrece "Log out". Técnicamente: `Stack.Protected` para el guard,
`expo-secure-store` para los tokens, un store de Zustand para el estado de la
sesión, TanStack Query para la cuenta, y un middleware de `openapi-fetch` que
pone el Bearer y renueva el acceso con una sola llamada aunque fallen varios
pedidos a la vez ([research.md](./research.md)).

## Technical Context

**Language/Version**: TypeScript strict (~6.0), React 19.3, React Native 0.88

**Primary Dependencies**: Expo SDK 58 (dev build), Expo Router, TanStack Query v5, `openapi-fetch` con tipos de `pnpm gen:api`. Nuevas: `expo-secure-store`, `zustand`, `expo-linear-gradient`, `react-native-svg` (justificación en research R10)

**Storage**: `expo-secure-store` para tokens y la copia de arranque de la cuenta; stub en memoria en web

**Testing**: jest-expo + Testing Library v14 + msw v3 (`src/test/server.ts`); Playwright + axe sobre Expo web; Maestro en el emulador Android

**Target Platform**: Android (dev build) como plataforma real; Expo web como aproximación para Playwright y el ui-reviewer

**Project Type**: mobile-app

**Performance Goals**: login completo en menos de 30 s (SC-001); arranque con sesión directo a Home sin esperar red (SC-002)

**Constraints**: funciona sin red con sesión guardada; tokens nunca fuera de secure store ni en logs; áreas táctiles ≥60 y texto ≥16; la UI en inglés

**Scale/Scope**: 5 conductores; 1 pantalla de login, 4 pestañas con contenido mínimo, 1 diálogo de confirmación

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio / regla                       | Cómo lo cumple el plan                                                                                      | Estado |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| I. Test-first                           | Cada historia arranca con sus tests de jest desde los escenarios; la lógica de Foundational también         | OK     |
| II. Historias independientes            | US1 se entrega sola (login, guard, pestañas). US2 y US3 dependen de US1 y lo declaran; entre ellas no       | OK     |
| III. Spec fija                          | El plan no cambia la spec; el desvío de 16 pt en las pestañas viene de la spec (FR-012)                     | OK     |
| Types (mandatory)                       | Sesión y renovación como uniones discriminadas ([data-model.md](./data-model.md))                           | OK     |
| Magic values (mandatory)                | Keys de secure store, mensajes y `TOUCH_TARGET_MIN` como constantes con nombre                              | OK     |
| Errors (mandatory)                      | La renovación distingue `rejected` de `unreachable`; logout ignora el fallo del back a propósito y lo dice  | OK     |
| Packages (mandatory)                    | Las cuatro dependencias con `pnpm exec expo install`, cada una justificada (R10)                            | OK     |
| Native projects / dev build (mandatory) | `expo-secure-store` por config de Expo; nada depende de Expo Go                                             | OK     |
| Styles (mandatory)                      | Todo color, tamaño y fuente de `src/theme/tokens.ts`, incluido `brandGradient`                              | OK     |
| Driver ergonomics (mandatory)           | Inputs, botones y pestañas ≥60; etiquetas de pestaña a 16 aunque el mockup diga 10 (R2)                     | OK     |
| Accessibility (mandatory)               | Botones con rol y nombre; pestañas con `tab` y seleccionado; errores del login en `accessibilityLiveRegion` | OK     |
| Platform code                           | `token-storage.ts` / `token-storage.web.ts`, sin `Platform.OS` en componentes                               | OK     |
| The contract (mandatory)                | Solo las cuatro operaciones de auth del cliente tipado ([contracts/api-usage.md](./contracts/api-usage.md)) | OK     |
| Server state (mandatory)                | La cuenta vive en Query; el store guarda solo el estado de la sesión (R3)                                   | OK     |
| Secrets (mandatory)                     | Tokens solo en secure store, nunca en un log                                                                | OK     |
| Tests: jest (mandatory)                 | Consultas por rol y texto; HTTP con msw en los paths del contrato; sin mockear el cliente                   | OK     |
| Maestro (mandatory when native)         | US2 (secure store) actualiza `.maestro/`; el PR pide correr `pnpm e2e:android`                              | OK     |

Re-check después de la Fase 1: sin cambios. Sin violaciones, así que no hay
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/3-sesion-navegacion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md
│   └── routes.md
├── checklists/requirements.md
└── tasks.md             # /fabrica:tasks
```

### Source Code (repository root)

```text
app/
├── _layout.tsx                  # fuentes, Query, restauración de sesión, Stack.Protected
├── (auth)/
│   ├── _layout.tsx
│   └── sign-in.tsx              # compone src/auth/sign-in-screen
└── (tabs)/
    ├── _layout.tsx              # Tabs con la tab bar propia
    ├── index.tsx                # Home (título)
    ├── fatigue.tsx              # Fatigue (título)
    ├── docs.tsx                 # Docs (título)
    └── profile.tsx              # Profile: Log out

src/
├── api/
│   ├── client.ts                # api (con middleware) y authApi (sin él, para refresh)
│   ├── auth-middleware.ts       # Bearer, 401 → renovar una vez → repetir
│   ├── auth-middleware.test.ts
│   └── query-client.ts          # el QueryClient único (endSession limpia su caché)
├── auth/
│   ├── token-storage.ts         # expo-secure-store
│   ├── token-storage.web.ts     # stub en memoria
│   ├── session-store.ts         # Zustand: SessionState y motivo de salida
│   ├── end-session.ts           # borra tokens y cuenta, limpia la caché, signedOut
│   ├── refresh-session.ts       # single-flight, devuelve RefreshOutcome
│   ├── restore-session.ts       # arranque con sesión guardada
│   ├── sign-in.ts               # login + /auth/me + control de rol
│   ├── sign-out.ts              # logout del back + limpieza local
│   ├── use-current-account.ts   # Query ["auth","me"] con initialData guardada
│   ├── sign-in-screen.tsx
│   ├── sign-out-button.tsx      # botón + diálogo de confirmación
│   └── *.test.ts(x)
├── navigation/
│   ├── tab-bar.tsx              # tab bar del mockup 10 con tokens
│   ├── tab-icons.tsx            # paths SVG del mockup
│   ├── tab-bar.test.tsx
│   └── protected-routes.test.tsx
├── ui/
│   └── confirm-dialog.tsx       # Modal con dos botones ≥60
├── test/                        # server.ts suma handlers de auth; auth-fixtures.ts
└── theme/tokens.ts

tests/ui.spec.ts                 # login y Home con tab bar, en los dos viewports
.maestro/
├── smoke.yaml                   # pasa a esperar el login
└── session.yaml                 # login, reabrir sin login, log out
```

Se eliminan `app/index.tsx` y `src/health/` (R9).

**Structure Decision**: una sola app Expo. `app/` solo tiene rutas finas que
componen piezas de `src/`; la lógica de sesión vive en `src/auth/`, donde
jest la prueba sin router, y la navegación compartida en `src/navigation/`.
