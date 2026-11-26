# Interfaz para E2: ¿puede el conductor aceptar órdenes?

E4 entrega esta interfaz y E2 la consume en el botón "Accept" del detalle de
orden. Vive en `src/fatigue/order-acceptance.ts`.

```ts
export type AcceptanceBlockReason =
  "daily-limit" | "weekly-limit" | "break-overdue";

export type OrderAcceptance =
  | { kind: "allowed" }
  | { kind: "blocked"; reasons: AcceptanceBlockReason[] }
  | { kind: "unknown" };

// Pura: la usan los tests y el hook.
export function evaluateOrderAcceptance(input: {
  status: FatigueStatus;
  week: WeekSummary;
  now: Date;
}): Exclude<OrderAcceptance, { kind: "unknown" }>;

// Combina las queries de estado y semana. "unknown" mientras alguna carga
// o falló.
export function useOrderAcceptance(): OrderAcceptance;

// Texto en inglés de cada motivo, el mismo que usa el aviso de Fatigue.
export const ACCEPTANCE_BLOCK_MESSAGES: Record<AcceptanceBlockReason, string>;
// "daily-limit"   → "Daily limit reached"
// "weekly-limit"  → "Weekly limit reached"
// "break-overdue" → "Break overdue"
```

## Garantías

- Con varios motivos a la vez, `reasons` los trae todos, en el orden
  `daily-limit`, `weekly-limit`, `break-overdue`.
- `blocked` siempre trae al menos un motivo.
- El hook se actualiza con las mismas reglas de refresco de la pantalla de
  fatiga: tomar y terminar un break vencido devuelve `allowed`.

## Lo que decide E2

- Qué hace "Accept" con `unknown` (sin datos de fatiga). E4 no lo decide.
- Cómo muestra el bloqueo en el detalle de orden.
