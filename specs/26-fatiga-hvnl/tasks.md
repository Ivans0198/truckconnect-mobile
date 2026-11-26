---
description: "Task list for Fatiga HVNL"
---

# Tasks: Fatiga HVNL

**Input**: Design documents from `/specs/26-fatiga-hvnl/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obligatorios (principio I de la constitución). Cada historia escribe sus tests primero y los ve fallar.

**Organization**: una fase por historia. US2 a US5 montan su sección en `src/fatigue/fatigue-screen.tsx`, así que van en cadena (ver "Dependencies & Execution Order").

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (otro archivo, sin dependencias pendientes)
- **[Story]**: historia de la spec (US1 a US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: tipos y datos de prueba que usan todas las historias.

- [ ] T001 [P] `src/fatigue/types.ts`: alias de `components["schemas"]` (`FatigueStatus`, `FatigueEvent`, `WeekSummary`, `FatigueState`, `FatigueEventType`) y las constantes `DAILY_LIMIT_HOURS`, `WEEKLY_LIMIT_HOURS`, `AMBER_FROM_HOURS`, `RED_ABOVE_HOURS` de data-model.md
- [ ] T002 [P] `src/test/fatigue-fixtures.ts`: estado `working` con 5,5 h (`nextBreakDueAt` a 2 h 12 min), eventos del mockup 12 sin "Lunch break" ni lugar, y semana de cinco días, tipados con el contrato; `src/test/server.ts` suma los handlers felices de `GET /fatigue/status`, `/fatigue/events` y `/fatigue/week-summary`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: formato de horas, refresco al volver la app, las tres queries y el semáforo.

**⚠️ CRITICAL**: ninguna historia empieza antes de que esta fase esté completa.

- [ ] T003 [P] Test de `src/format/time.test.ts`: `formatMelbourneTime` da "6:35 AM" para un UTC dado, en horario normal y de verano; `formatHoursMinutes` da "5h 30m" desde 5,5 h y "0h 45m" desde 0,75 h; `formatBreakLength` da "15 min" desde 15 minutos en ms; `startOfMelbourneDay(now)` devuelve la medianoche de Melbourne en UTC, también justo después de medianoche local y en los días de cambio de horario; `formatWeekday("2026-11-23")` da "Mon"
- [ ] T004 `src/format/time.ts` con `Intl.DateTimeFormat` y `timeZone: "Australia/Melbourne"`, sin dependencias nuevas (research R6; pasa T003)
- [ ] T005 [P] Test de `src/api/app-focus.test.ts`: con `connectAppFocus()`, un cambio de `AppState` a `active` marca el `focusManager` de TanStack como enfocado y a `background` como no enfocado; quitar la suscripción deja de escuchar
- [ ] T006 `src/api/app-focus.ts` y su llamada en `app/_layout.tsx` (research R2; pasa T005)
- [ ] T007 [P] Test de `src/fatigue/queries.test.ts` con msw: cada fetcher devuelve el cuerpo del contrato y lanza ante un no-2xx; `GET /fatigue/events` manda `from` = `startOfMelbourneDay(now)` y `to` = `now` en ISO UTC (contracts/api-usage.md)
- [ ] T008 `src/fatigue/queries.ts`: keys `FATIGUE_KEY`, `FATIGUE_STATUS_KEY`, `FATIGUE_EVENTS_KEY`, `FATIGUE_WEEK_KEY`, fetchers y hooks `useFatigueStatus`, `useTodayFatigueEvents`, `useWeekSummary` con el refresco de research R2 (pasa T007)
- [ ] T009 [P] Test de `src/fatigue/fatigue-tone.test.ts`: 8,9 h `success`; 9 h y 11 h `warning`; 11,1 h `danger` (FR-002)
- [ ] T010 `src/fatigue/fatigue-tone.ts` con los umbrales de `types.ts` y los tonos `semantic` de `src/theme/tokens.ts` (pasa T009)

**Checkpoint**: datos y formato listos; las historias pueden empezar.

---

## Phase 3: User Story 1 - Ver cuánto llevo trabajado hoy (Priority: P1) 🎯 MVP

**Goal**: la pestaña Fatigue muestra el anillo con las horas del día, el estado, el semáforo y los datos "Remaining", "Next break in" y "This week".

**Independent Test**: con msw devolviendo estado y semana, la pestaña muestra horas, estado, tono y los tres datos sin tocar nada; con el servidor caído, el error con "Try again".

### Tests for User Story 1 (MANDATORY, write first) ⚠️

- [ ] T011 [P] [US1] Test de `src/fatigue/next-break.test.ts`: `working` con `nextBreakDueAt` futuro da `{ kind: "in", ms }`; igual o pasado da `due`; `on_break`, `off_duty` o `nextBreakDueAt` nulo dan `none` (data-model.md)
- [ ] T012 [P] [US1] Test de `src/fatigue/fatigue-screen.test.tsx` (escenarios 1.1 a 1.10) con fake timers: "Working", "5h 30m" y "of 12h shift limit"; el anillo expone horas y tono en su nombre accesible para no depender del color; 9 h ámbar y 11,5 h rojo; "Remaining", "Next break in" ("2h 12m") y "This week" ("28h / 72h"); "On break" sin cuenta regresiva; "Off duty" con 0 h; con 13 h el centro dice "13h 00m" y el anillo está completo; "Due now" con el break vencido; esqueleto mientras carga; error con "Try again" que vuelve a pedir; nuevo pedido al pasar 60 s, al enfocar la pestaña y al tirar hacia abajo; no hay flecha de volver; ningún texto de la pantalla baja de `fontSize.body`, incluidas las etiquetas que el mockup dibuja más chicas (FR-015)
- [ ] T013 [P] [US1] Agregar a `tests/ui.spec.ts` `page.route("**/fatigue/**")` con las formas del contrato, la captura de Fatigue en los dos viewports, sin scroll horizontal, y axe

### Implementation for User Story 1

- [ ] T014 [US1] `src/fatigue/next-break.ts` (pasa T011)
- [ ] T015 [P] [US1] `src/fatigue/section-error.tsx`: mensaje y botón "Try again" de al menos `TOUCH_TARGET_MIN`, con `accessibilityLiveRegion`
- [ ] T016 [P] [US1] `src/fatigue/hours-ring.tsx`: anillo SVG de `react-native-svg` con progreso `min(hoursWorked / DAILY_LIMIT_HOURS, 1)`, etiqueta de estado, horas reales y "of 12h shift limit" en el centro, todo a 16 o más, tono de `fatigueTone` (research R7, R8)
- [ ] T017 [P] [US1] `src/fatigue/fatigue-stats.tsx`: las tres tarjetas del mockup 12, con las etiquetas a 16 o más y la jerarquía por peso y color (research R9); "Due now" en `semantic.danger`
- [ ] T018 [US1] `src/fatigue/fatigue-screen.tsx`: encabezado "Fatigue" con "Standard Hours · HVNL compliant", `ScrollView` con `RefreshControl`, `useFocusEffect` y esqueleto; `app/(tabs)/fatigue.tsx` lo compone en lugar de `TitleScreen` (pasa T012 y T013)

**Checkpoint**: la pestaña muestra el estado de fatiga real. Sin botones todavía.

---

## Phase 4: User Story 2 - Empezar el día, tomar un break y terminar el día (Priority: P1)

**Goal**: Start Day, Take Break, End Break y End Day con su confirmación; sin red avisa que no quedó registrado.

**Independent Test**: con msw, un conductor fuera de turno empieza el día, toma un break, lo termina y cierra el día; la pantalla muestra lo que devolvió el back después de cada toque.

### Tests for User Story 2 (MANDATORY, write first) ⚠️

- [ ] T019 [P] [US2] Test de `src/fatigue/fatigue-actions.test.ts`: `off_duty` → `start-day`; `working` → `start-break`, `end-day`; `on_break` → `end-break`, `end-day` (data-model.md)
- [ ] T020 [P] [US2] Test de `src/fatigue/action-error.test.ts`: un `fetch` que lanza da `offline`; 429 da `rate-limited`; 400 y 403 dan `rejected` con el `message` del back, uniendo las líneas cuando es un arreglo (research R4)
- [ ] T021 [P] [US2] Test de `src/fatigue/fatigue-action-bar.test.tsx` (escenarios 2.1 a 2.11) montando `FatigueScreen`: los botones de cada estado; Take Break pasa a "On break" con "End Break"; End Break vuelve a "Working"; End Day muestra "End your day?" y solo con confirmar llama a `POST /fatigue/end-day`; Start Day pasa a "Working"; el botón en curso está deshabilitado y un segundo toque no manda otro pedido; un 400 muestra el mensaje y vuelve a pedir el estado; un 429 muestra "Too many attempts, try again in a moment"; sin red muestra "No connection. Your break was not recorded." con "Try again" y el estado no cambia; después de cada acción se vuelven a pedir eventos y semana; el texto de los botones y del mensaje de error no baja de `fontSize.body` (FR-015)
- [ ] T022 [P] [US2] Agregar a `tests/ui.spec.ts` la ruta de `POST /fatigue/end-day` y la captura del diálogo "End your day?" con axe, en los dos viewports

### Implementation for User Story 2

- [ ] T023 [P] [US2] `src/fatigue/fatigue-actions.ts` (pasa T019)
- [ ] T024 [P] [US2] `src/fatigue/action-error.ts` con `FatigueActionError` como unión discriminada (pasa T020)
- [ ] T025 [US2] `src/fatigue/mutations.ts`: `useFatigueAction(action)` que escribe `FATIGUE_STATUS_KEY` con la respuesta e invalida eventos y semana; sin reintentos ni cola (research R3, FR-017)
- [ ] T026 [US2] `src/fatigue/fatigue-action-bar.tsx`: botones del mockup 12 (Take Break ámbar, End Day con borde rojo, Start Day y End Break con sus tonos), al menos `TOUCH_TARGET_MIN`, `ConfirmDialog` de `src/ui/confirm-dialog.tsx` para End Day, mensaje de error con `accessibilityLiveRegion`; montado en `src/fatigue/fatigue-screen.tsx` debajo de los datos (pasa T021 y T022)

**Checkpoint**: la jornada se registra entera desde la pestaña.

---

## Phase 5: User Story 3 - Ver los eventos de hoy (Priority: P2)

**Goal**: "Today's events" con cada evento del día de Melbourne, su hora y la duración de los breaks.

**Independent Test**: con msw devolviendo los eventos del día, la lista muestra nombre y hora de Melbourne en orden, con la duración de los breaks cerrados.

### Tests for User Story 3 (MANDATORY, write first) ⚠️

- [ ] T027 [P] [US3] Test de `src/fatigue/timeline.test.ts`: los cuatro tipos con "Day started", "Break started", "Back to work" y "Day ended"; ordena por `timestamp` aunque lleguen desordenados; `durationMs` solo en un `BREAK_START` con `BREAK_END` posterior; `isCurrent` en el último si el estado no es `off_duty`
- [ ] T028 [P] [US3] Test de `src/fatigue/today-events.test.tsx` (escenarios 3.1 a 3.7) montando `FatigueScreen`: "Today's events" y "5 events"; "9:48 AM · 15 min"; "current" en el último; horas en Melbourne; vacío con su mensaje; error de la sección con "Try again" mientras el anillo y los botones siguen visibles; ningún texto de la sección baja de `fontSize.body` (FR-015)

### Implementation for User Story 3

- [ ] T029 [US3] `src/fatigue/timeline.ts` (pasa T027)
- [ ] T030 [US3] `src/fatigue/today-events.tsx`: renglones con ícono y color del mockup 12, texto ≥16, renglones mapeados porque un día tiene pocos eventos y ya están dentro del `ScrollView`; montado en `src/fatigue/fatigue-screen.tsx` debajo de los botones (pasa T028)

**Checkpoint**: la jornada del día se puede revisar en la pantalla.

---

## Phase 6: User Story 4 - Ver mi semana (Priority: P2)

**Goal**: "This week" con un renglón por día y el total sobre 72 h.

**Independent Test**: con msw devolviendo el resumen semanal, un renglón por día con sus horas y el total.

### Tests for User Story 4 (MANDATORY, write first) ⚠️

- [ ] T031 [P] [US4] Test de `src/fatigue/week-summary.test.tsx` (escenarios 4.1 a 4.4) montando `FatigueScreen`: un renglón por día de `byDay` con "Mon" y "7h 48m"; el largo de cada barra proporcional a `DAILY_LIMIT_HOURS` y su tono de `fatigueTone`, expuesto también como texto; "Total worked" con las horas sobre 72 h; error de la sección con "Try again"; ningún texto de la sección baja de `fontSize.body` (FR-015)

### Implementation for User Story 4

- [ ] T032 [US4] `src/fatigue/week-summary.tsx` según el mockup 12, con el rango de la semana en el encabezado y texto ≥16; montado en `src/fatigue/fatigue-screen.tsx` al final (pasa T031)

**Checkpoint**: la pantalla del mockup 12 está completa.

---

## Phase 7: User Story 5 - Saber si puedo aceptar órdenes nuevas (Priority: P2)

**Goal**: la regla de "puede aceptar órdenes" para E2 y el aviso en Fatigue.

**Independent Test**: con msw devolviendo un conductor sin horas restantes, la pantalla muestra el aviso, y `evaluateOrderAcceptance` da `blocked` con su motivo.

### Tests for User Story 5 (MANDATORY, write first) ⚠️

- [ ] T033 [P] [US5] Test de `src/fatigue/order-acceptance.test.ts`: `allowed` dentro de horas; `daily-limit` con `hoursRemaining` 0 o negativo; `weekly-limit` con `remainingHours` 0 o negativo; `break-overdue` solo en `working` con `nextBreakDueAt <= now`; varios motivos juntos en el orden del contrato; `useOrderAcceptance` da `unknown` mientras carga o con error y `allowed` después de terminar un break vencido (contracts/order-acceptance.md)
- [ ] T034 [P] [US5] Test de `src/fatigue/acceptance-banner.test.tsx` (escenarios 5.1 y 5.2) montando `FatigueScreen`: "You can't accept new orders" con "Daily limit reached", "Weekly limit reached" o "Break overdue", y todos cuando son varios; sin aviso dentro de horas o sin datos; el texto del aviso no baja de `fontSize.body` (FR-015)

### Implementation for User Story 5

- [ ] T035 [US5] `src/fatigue/order-acceptance.ts`: `evaluateOrderAcceptance`, `useOrderAcceptance` y `ACCEPTANCE_BLOCK_MESSAGES` (pasa T033)
- [ ] T036 [US5] `src/fatigue/acceptance-banner.tsx` en `semantic.danger`, con `accessibilityLiveRegion` y texto ≥16; montado en `src/fatigue/fatigue-screen.tsx` debajo del anillo (pasa T034)

**Checkpoint**: E2 tiene la regla lista para el botón "Accept".

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: comprobar la épica entera.

- [ ] T037 Recorrer [quickstart.md](./quickstart.md): los cuatro checks del gate en verde y el paseo a mano en Expo web con la red cortada; anotar en el PR qué capturas de `tests/ui.spec.ts-snapshots/` cambian y por qué

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias.
- **Historias (Phase 3 a 7)**: dependen de Foundational, y en cadena entre ellas (abajo).
- **Polish (Phase 8)**: depende de todas las historias.

### User Story Dependencies

`src/fatigue/fatigue-screen.tsx` lo crea US1 y cada historia siguiente monta
ahí su sección. Dos historias en paralelo chocarían en ese archivo, así que
van en cadena, en el orden de prioridad:

```text
US1 → US2 → US3 → US4 → US5
```

- **US1 (P1)**: después de Foundational.
- **US2 (P1)**: depende de US1 (la pantalla) y agrega captura a `tests/ui.spec.ts`.
- **US3 (P2)**: depende de US2.
- **US4 (P2)**: depende de US3.
- **US5 (P2)**: depende de US4.

### Within Each User Story

- Los tests se escriben primero y fallan antes de implementar.
- Funciones puras antes que componentes; el montaje en la pantalla al final.

### Parallel Opportunities

- T001 y T002 en paralelo.
- En Foundational, los tests T003, T005, T007 y T009 en paralelo; cada implementación sigue a su test.
- Dentro de cada historia, los tests marcados [P] en paralelo, y los componentes que no tocan la pantalla también.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 juntos:
Task: "Test de src/fatigue/next-break.test.ts"
Task: "Test de src/fatigue/fatigue-screen.test.tsx"
Task: "Captura de Fatigue en tests/ui.spec.ts"

# Componentes que no tocan la pantalla, juntos:
Task: "src/fatigue/section-error.tsx"
Task: "src/fatigue/hours-ring.tsx"
Task: "src/fatigue/fatigue-stats.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup y Foundational.
2. US1: el conductor ve sus horas y su semáforo.
3. Validar US1 sola antes de seguir.

### Incremental Delivery

1. US1 → ver las horas.
2. US2 → registrar la jornada. Con US1 y US2 la pestaña ya reemplaza el papel.
3. US3 y US4 → revisar el día y la semana.
4. US5 → la regla para E2.

---

## Notes

- [P] = otro archivo, sin dependencias pendientes.
- Ninguna historia toca nada nativo: no hay flow de Maestro (research R11).
- Las capturas de Playwright cambian a propósito; una persona las acepta con `visual-baselines.yml`.
