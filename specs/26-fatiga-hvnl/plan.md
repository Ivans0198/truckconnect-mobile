# Implementation Plan: Fatiga HVNL

**Branch**: `spec-26` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Generated with**: fabrica 0.5.29, Spec Kit 1.2.2

**Input**: Feature specification from `/specs/26-fatiga-hvnl/spec.md`

## Summary

La pestaña Fatigue deja de ser un título y pasa a ser la pantalla del mockup 12. Muestra un anillo con las horas del día y su semáforo, los datos de
"Remaining", "Next break in" y "This week", y los botones Start Day, Take
Break, End Break y End Day según el estado. Abajo van los eventos de hoy y la
semana por día. Además deja la regla de "puede aceptar órdenes" (límite
diario, límite semanal, break vencido) como interfaz para el botón "Accept"
de E2. Técnicamente: tres queries de TanStack Query y cuatro mutaciones sobre
`/fatigue/*`, funciones puras para todo lo derivado (semáforo, próximo break,
línea de tiempo, regla de aceptar), un formateador compartido de hora de
Melbourne sin dependencias nuevas y el anillo con `react-native-svg`
([research.md](./research.md)).

## Technical Context

**Language/Version**: TypeScript strict (~6.0), React 19.3, React Native 0.88

**Primary Dependencies**: Expo SDK 58 (dev build), Expo Router, TanStack Query v5, `openapi-fetch` con tipos de `pnpm gen:api`, `react-native-svg` (ya instalado). Ninguna dependencia nueva (R6, R7)

**Storage**: ninguno propio; caché de TanStack Query. Nada se encola (FR-017)

**Testing**: jest-expo + Testing Library v14 + msw (`src/test/server.ts`) con fake timers; Playwright + axe sobre Expo web. Sin Maestro (R11)

**Target Platform**: Android (dev build) como plataforma real; Expo web como aproximación para Playwright y el ui-reviewer

**Project Type**: mobile-app

**Performance Goals**: estado de fatiga legible en menos de 3 s desde que se abre la pestaña (SC-001); el anillo no espera a eventos ni a la semana

**Constraints**: sin cola offline para fatiga; horas en `Australia/Melbourne`; áreas táctiles ≥60 y texto ≥16; la UI en inglés; solo `/fatigue/*` del contrato

**Scale/Scope**: 5 conductores; 1 pantalla con 4 secciones, 1 diálogo de confirmación, 1 interfaz para E2

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio / regla                       | Cómo lo cumple el plan                                                                                                         | Estado |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Test-first                           | Cada historia arranca con sus tests desde los escenarios; las funciones puras de Foundational también                          | OK     |
| II. Historias independientes            | US1 crea la pantalla y la query de estado. US2 a US5 dependen de US1 y lo declaran; entre ellas no                             | OK     |
| III. Spec fija                          | El plan no cambia la spec; R9 elige cumplir 16 pt, que FR-015 permite                                                          | OK     |
| Types (mandatory)                       | `OrderAcceptance`, `NextBreak` y `FatigueActionError` como uniones discriminadas ([data-model.md](./data-model.md))            | OK     |
| Magic values (mandatory)                | `DAILY_LIMIT_HOURS`, `WEEKLY_LIMIT_HOURS`, `AMBER_FROM_HOURS`, `RED_ABOVE_HOURS`, intervalo de refresco con nombre (R8)        | OK     |
| Errors (mandatory)                      | Las queries lanzan ante un no-2xx; las acciones clasifican la falla sin tragarla (R4)                                          | OK     |
| State & purity (mandatory)              | Semáforo, botones, próximo break, línea de tiempo y regla de aceptar son funciones puras con `now` como parámetro              | OK     |
| Packages (mandatory)                    | Ninguna dependencia nueva                                                                                                      | OK     |
| Native projects / dev build (mandatory) | Nada nativo nuevo; `app.json` no cambia                                                                                        | OK     |
| Routing                                 | `app/(tabs)/fatigue.tsx` solo compone `FatigueScreen`; la lógica vive en `src/fatigue/`                                        | OK     |
| Styles (mandatory)                      | Colores, tamaños y fuentes de `src/theme/tokens.ts`; el semáforo usa `semantic`                                                | OK     |
| Driver ergonomics (mandatory)           | Botones ≥60; todo texto ≥16 aunque el mockup dibuje 10 a 12 px (R9)                                                            | OK     |
| Accessibility (mandatory)               | Botones con rol y nombre; el estado y el aviso de bloqueo con `accessibilityLiveRegion`; el color nunca solo (R8)              | OK     |
| Components                              | `ScrollView` con `RefreshControl`: los eventos de un día son pocos; `ConfirmDialog` de E1 para End Day                         | OK     |
| The contract (mandatory)                | Solo los siete endpoints de `/fatigue/*` con el cliente tipado ([contracts/api-usage.md](./contracts/api-usage.md))            | OK     |
| Server state (mandatory)                | Todo en Query con keys `const`; nada copiado a estado de componente ni a un store                                              | OK     |
| Errors / 429 (mandatory)                | Cada sección con error y "Try again"; 429 dice "try again shortly"                                                             | OK     |
| Money and time (mandatory)              | Un formateador compartido de Melbourne en `src/format/time.ts` (R6)                                                            | OK     |
| Offline (mandatory where it applies)    | No aplica a fatiga: el perfil la pide para orden, POD e incidentes. La spec decide no encolar (FR-017) y lo avisa al conductor | OK     |
| Tests: jest (mandatory)                 | Consultas por rol y texto; HTTP con msw en los paths del contrato; sin mockear el cliente; fake timers en vez de esperas       | OK     |
| Maestro (mandatory when native)         | No aplica: nada nativo (R11)                                                                                                   | OK     |

Re-check después de la Fase 1: sin cambios. Sin violaciones, así que no hay
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/26-fatiga-hvnl/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md
│   ├── order-acceptance.md      # la interfaz que consume E2
│   └── routes.md
├── checklists/requirements.md
└── tasks.md                     # /fabrica:tasks
```

### Source Code (repository root)

```text
app/
├── _layout.tsx                  # suma connectAppFocus() (R2)
└── (tabs)/
    └── fatigue.tsx              # compone FatigueScreen

src/
├── api/
│   └── app-focus.ts             # focusManager de TanStack ↔ AppState
├── format/
│   ├── time.ts                  # hora de Melbourne, "5h 30m", startOfMelbourneDay, día corto
│   └── time.test.ts
├── fatigue/
│   ├── types.ts                 # alias de components["schemas"] y constantes de Standard Hours
│   ├── fatigue-tone.ts          # semáforo
│   ├── fatigue-actions.ts       # botones por estado
│   ├── next-break.ts            # NextBreak
│   ├── timeline.ts              # TimelineEntry desde los eventos
│   ├── order-acceptance.ts      # evaluateOrderAcceptance, useOrderAcceptance, mensajes
│   ├── action-error.ts          # classifyFatigueActionError
│   ├── queries.ts               # keys, fetchers y hooks de estado, eventos y semana
│   ├── mutations.ts             # useFatigueAction
│   ├── fatigue-screen.tsx       # compone las secciones, refresco y pull-to-refresh
│   ├── hours-ring.tsx           # anillo SVG con estado y horas
│   ├── fatigue-stats.tsx        # Remaining, Next break in, This week
│   ├── fatigue-action-bar.tsx   # Start Day / Take Break / End Break / End Day + diálogo
│   ├── acceptance-banner.tsx    # "You can't accept new orders"
│   ├── today-events.tsx         # Today's events
│   ├── week-summary.tsx         # This week por día
│   ├── section-error.tsx        # error con "Try again" de cada sección
│   └── *.test.ts(x)
└── test/
    ├── fatigue-fixtures.ts      # estado, eventos y semana tipados del contrato
    └── server.ts                # suma los handlers felices de /fatigue/*

tests/ui.spec.ts                 # Fatigue en los dos viewports, diálogo de End Day, axe
```

**Structure Decision**: una sola app Expo, como en E1. La pantalla vive en
`src/fatigue/`, partida en una sección por historia para que cada una se
construya y se revise sola. `src/format/` es nuevo porque el formateador de
Melbourne lo va a usar E2.

## Complexity Tracking

Sin violaciones de la constitución.
