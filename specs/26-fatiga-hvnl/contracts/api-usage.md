# Uso de la API: Fatiga HVNL

Todo pasa por `api` de `src/api/client.ts` (con el middleware de auth de E1).
Solo estos endpoints de `docs/openapi.json`; ninguno lleva body.

| Operación                   | Cuándo                                                   | Respuesta 200               | Qué hace la app con ella                              |
| --------------------------- | -------------------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `GET /fatigue/status`       | al entrar, al enfocar, cada minuto, al tirar hacia abajo | `FatigueStatusResponseDto`  | anillo, estado, "Remaining", "Next break in", botones |
| `GET /fatigue/events`       | igual que el estado, y tras cada acción                  | `FatigueEventResponseDto[]` | "Today's events"                                      |
| `GET /fatigue/week-summary` | igual que el estado, y tras cada acción                  | `WeekSummaryResponseDto`    | "This week" (dato y sección), regla de aceptar        |
| `POST /fatigue/start-day`   | "Start Day"                                              | `FatigueStatusResponseDto`  | escribe el estado; invalida eventos y semana          |
| `POST /fatigue/start-break` | "Take Break"                                             | `FatigueStatusResponseDto`  | igual                                                 |
| `POST /fatigue/end-break`   | "End Break"                                              | `FatigueStatusResponseDto`  | igual                                                 |
| `POST /fatigue/end-day`     | "End Day" confirmado                                     | `FatigueStatusResponseDto`  | igual                                                 |

## Parámetros de `GET /fatigue/events`

- `from`: la medianoche de hoy en `Australia/Melbourne`, como ISO 8601 en UTC.
- `to`: el momento del pedido, como ISO 8601 en UTC.

## Errores

| Respuesta           | Lecturas (GET)                      | Acciones (POST)                                                           |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| sin respuesta (red) | error de la sección con "Try again" | "No connection. <acción> was not recorded." con "Try again"; no se encola |
| `401`               | lo resuelve el middleware de E1     | igual                                                                     |
| `429`               | error de la sección con "Try again" | "Too many attempts, try again in a moment"                                |
| `400`, `403`, otro  | error de la sección con "Try again" | el `message` del back, y se vuelve a pedir el estado                      |

## Lo que no se usa

- `GET /drivers/{id}/fatigue` y `GET /drivers/{id}/fatigue/status`: dan lo
  mismo para el propio conductor y piden su id. Los de `/fatigue/*` ya filtran
  al conductor autenticado.
