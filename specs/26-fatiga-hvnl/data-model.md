# Data Model: Fatiga HVNL

Los datos del servidor vienen de `src/api/schema.d.ts` (generado de
`docs/openapi.json`) y no se redefinen. Lo que sigue son los tipos que la app
deriva de ellos y las reglas que los ligan.

## Del contrato (sin cambios)

| Tipo de la app     | Schema del contrato                                                    | Endpoint                                                      |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `FatigueStatus`    | `FatigueStatusResponseDto`                                             | `GET /fatigue/status` y las cuatro acciones `POST /fatigue/*` |
| `FatigueEvent`     | `FatigueEventResponseDto`                                              | `GET /fatigue/events?from&to`                                 |
| `WeekSummary`      | `WeekSummaryResponseDto` (`byDay[]`: `WeekDaySummaryDto`)              | `GET /fatigue/week-summary`                                   |
| `FatigueState`     | `FatigueState`: `working`, `on_break`, `off_duty`                      | parte de `FatigueStatus`                                      |
| `FatigueEventType` | `FatigueEventType`: `DAY_START`, `BREAK_START`, `BREAK_END`, `DAY_END` | parte de `FatigueEvent`                                       |

Cada uno es un alias de `components["schemas"][...]`, en
`src/fatigue/types.ts`.

## Constantes de Standard Hours

| Nombre               | Valor | Uso                                                |
| -------------------- | ----- | -------------------------------------------------- |
| `DAILY_LIMIT_HOURS`  | 12    | "of 12h shift limit", progreso del anillo y barras |
| `WEEKLY_LIMIT_HOURS` | 72    | "28h / 72h" y "Total worked … / 72h"               |
| `AMBER_FROM_HOURS`   | 9     | semáforo: ámbar desde 9 h                          |
| `RED_ABOVE_HOURS`    | 11    | semáforo: rojo por encima de 11 h                  |

Los límites solo se muestran. Las horas restantes y la hora del próximo break
las calcula el back (FR-003).

## Derivados de la app

### `FatigueTone`

`"success" | "warning" | "danger"`, de `fatigueTone(hours)`:

- `hours < 9` → `success`
- `9 <= hours <= 11` → `warning`
- `hours > 11` → `danger`

### `FatigueAction`

`"start-day" | "start-break" | "end-break" | "end-day"`. Qué botones ve el
conductor sale de `fatigueActionsFor(state)`:

| `state`    | Botones                  |
| ---------- | ------------------------ |
| `off_duty` | `start-day`              |
| `working`  | `start-break`, `end-day` |
| `on_break` | `end-break`, `end-day`   |

Transiciones que espera el back (las valida él; la app muestra lo que
devuelve):

```text
off_duty --start-day--> working --start-break--> on_break
                        working <--end-break---- on_break
working | on_break --end-day--> off_duty
```

### `NextBreak`

Lo que muestra "Next break in", de `nextBreakFor(status, now)`:

- `{ kind: "in", ms }` si el estado es `working` y `nextBreakDueAt > now`
- `{ kind: "due" }` si es `working` y `nextBreakDueAt <= now` ("Due now", en rojo)
- `{ kind: "none" }` en `on_break`, `off_duty` o con `nextBreakDueAt` nulo

### `TimelineEntry`

Un renglón de "Today's events", de `buildTimeline(events, status)`:

| Campo        | Origen                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`         | `FatigueEvent.id`                                                                                           |
| `label`      | `DAY_START` "Day started", `BREAK_START` "Break started", `BREAK_END` "Back to work", `DAY_END` "Day ended" |
| `at`         | `FatigueEvent.timestamp` (se muestra en Melbourne)                                                          |
| `durationMs` | solo en `BREAK_START` con un `BREAK_END` posterior: la diferencia                                           |
| `isCurrent`  | el último evento, si el estado no es `off_duty`                                                             |

Orden: por `timestamp` ascendente, aunque el back los mande en otro orden.

### `OrderAcceptance`

Ver [contracts/order-acceptance.md](./contracts/order-acceptance.md).

```ts
type AcceptanceBlockReason = "daily-limit" | "weekly-limit" | "break-overdue";

type OrderAcceptance =
  | { kind: "allowed" }
  | { kind: "blocked"; reasons: AcceptanceBlockReason[] }
  | { kind: "unknown" };
```

- `daily-limit`: `status.hoursRemaining <= 0`
- `weekly-limit`: `week.remainingHours <= 0`
- `break-overdue`: `status.state === "working"`, `nextBreakDueAt` no nulo y `<= now`
- `unknown`: solo desde el hook, mientras el estado o la semana cargan o fallaron

### `FatigueActionError`

De `classifyFatigueActionError(error | response)`:

```ts
type FatigueActionError =
  | { kind: "offline" }
  | { kind: "rate-limited" }
  | { kind: "rejected"; message: string };
```

`message` sale de `ApiErrorDto.message`; si es un arreglo, se unen sus
líneas.

## Query keys

```ts
const FATIGUE_KEY = ["fatigue"] as const;
const FATIGUE_STATUS_KEY = ["fatigue", "status"] as const;
const FATIGUE_EVENTS_KEY = ["fatigue", "events", "today"] as const;
const FATIGUE_WEEK_KEY = ["fatigue", "week"] as const;
```

Una acción exitosa escribe `FATIGUE_STATUS_KEY` con la respuesta e invalida
`FATIGUE_EVENTS_KEY` y `FATIGUE_WEEK_KEY`. El logout de E1 ya vacía toda la
caché.
