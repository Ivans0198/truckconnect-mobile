# Interfaz para E2: ¿puede el conductor aceptar órdenes? (cambios de E5)

La interfaz nació en E4 (`specs/26-fatiga-hvnl/contracts/order-acceptance.md`)
y sigue en `src/fatigue/order-acceptance.ts`. E5 le suma los motivos de
compliance (FR-032). E2 la consume en el botón "Accept".

```ts
export type AcceptanceBlockReason =
  | { kind: "daily-limit" }
  | { kind: "weekly-limit" }
  | { kind: "break-overdue" }
  | {
      kind: "compliance";
      docType: DocType;
      state: "expiring" | "expired" | "under-review";
      days: number | null; // solo con "expiring"
    };

export type OrderAcceptance =
  | { kind: "allowed" }
  | { kind: "blocked"; reasons: AcceptanceBlockReason[] }
  | { kind: "unknown" };

export function evaluateOrderAcceptance(input: {
  status: FatigueStatus;
  week: WeekSummary;
  compliance: DocumentCard[] | undefined; // undefined: no cargó
  now: Date;
}): Exclude<OrderAcceptance, { kind: "unknown" }>;

// Misma firma que en E4. Lee también la query de documentos.
export function useOrderAcceptance(): OrderAcceptance;

// Reemplaza a ACCEPTANCE_BLOCK_MESSAGES.
export function describeBlockReason(reason: AcceptanceBlockReason): string;
// daily-limit                → "Daily limit reached"
// weekly-limit               → "Weekly limit reached"
// break-overdue              → "Break overdue"
// compliance, expiring, 5    → "Public Liability expires in 5 days"
// compliance, expiring, 0    → "Public Liability expires today"
// compliance, expired        → "Driver Licence expired"
// compliance, under-review   → "Public Liability under review"
```

## Garantías

- Lo que E4 garantizaba sigue igual para los motivos de fatiga.
- Los motivos de compliance van después de los de fatiga, en el orden de
  `DocType` del contrato.
- `unknown` sigue dependiendo solo de la fatiga: si los documentos no
  cargaron, la regla responde con la fatiga sola (FR-032).
- Una renovación en revisión no quita el bloqueo: cambia el motivo a
  `under-review` hasta que el back la apruebe.
