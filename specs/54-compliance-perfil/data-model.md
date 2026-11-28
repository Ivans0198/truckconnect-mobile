# Data model: Compliance, perfil y notificaciones

Los tipos del back salen de `src/api/schema.d.ts` (`components["schemas"]`) y
no se escriben a mano. Este documento describe esos tipos tal como la app los
usa, y los tipos que la app deriva de ellos.

## Del contrato

### ComplianceDocument (`ComplianceDocumentResponseDto`)

| Campo             | Uso en la app                                       |
| ----------------- | --------------------------------------------------- |
| `id`              | key de la tarjeta                                   |
| `docType`         | agrupa las tarjetas; `DocType` (5 valores)          |
| `status`          | `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `EXPIRED` |
| `expiryDate`      | días restantes, fecha mostrada                      |
| `issueDate`       | no se muestra                                       |
| `rejectionReason` | texto bajo "Rejected"                               |
| `createdAt`       | decide cuál es el más reciente de cada tipo         |
| `downloadUrl`     | no se usa en E5 (ver el archivo no está en la spec) |

Request: `GET /compliance/documents?page=1&limit=100`. El back filtra al
conductor autenticado.

### Upload (`RequestUploadUrlDto` → `UploadUrlResponseDto` → `CreateComplianceDocumentDto`)

1. `POST /compliance/documents/upload-url` con `docType`, `mimeType`
   (`application/pdf`, `image/jpeg`, `image/png`) y `fileSizeBytes`.
   Devuelve `uploadUrl`, `fileKey` y `expiresInSeconds` (900).
2. `PUT uploadUrl` con los bytes, sin `Authorization`.
3. `POST /compliance/documents` con `docType`, `issueDate`, `expiryDate`
   (`YYYY-MM-DD`), `fileKey`, `fileMimeType` y `fileSizeBytes`. Sin
   `driverId` (el back usa al conductor autenticado). `vehicleId` va solo
   en `VEHICLE_REGO` y `TRAILER_REGO`, donde el back lo exige ("vehicleId
   is required for VEHICLE_REGO", aunque el `openapi.json` lo marca
   opcional): es el vehículo activo del conductor, o el que elija si tiene
   varios. Los demás tipos van sin `vehicleId`.

### Account (`UserResponseDto`, de E1)

`fullName`, `email`, `phone`, `abn` (nullable), `licenceClass` (nullable),
`emergencyContact` (objeto libre, nullable), `createdAt`, `id`.

### DriverStats (`DriverStatsResponseDto`)

`period` (`month`), `totalOrders` → "Deliveries". `hoursWorked`,
`totalEarningsCents` y `avgMargin` no se muestran.

### Vehicle (`VehicleResponseDto`)

`type` (`RIGID`, `SEMI_TRAILER`), `registrationNumber`, `make`, `model`,
`year` (los tres nullable), `palletCapacity`, `gvmKg`, `cargoHeightM`,
`isActive`. Solo se muestran los activos.

### Notification (`NotificationResponseDto`)

`id`, `title`, `body`, `read`, `createdAt`, `sentAt` (nullable), `type`,
`channel`, `metadata`. La hora que se muestra es `sentAt ?? createdAt`.

## Derivados en la app

### Attention (`src/compliance/attention.ts`)

```ts
type Attention =
  | { kind: "valid"; days: number }
  | { kind: "expiring"; days: number } // 8..60
  | { kind: "urgent"; days: number } // 0..7
  | { kind: "expired" }
  | { kind: "under-review"; current: Attention | null }
  | { kind: "rejected"; reason: string | null; current: Attention | null };
```

- `days` = días de calendario de Melbourne entre hoy y `expiryDate`.
- `current` es la atención del aprobado vigente que la renovación reemplaza
  (o `null` si no hay ninguno). La tarjeta lo usa para seguir mostrando el
  vencimiento en rojo (escenario 4 de la historia 1).
- Un `APPROVED` cuyo `expiryDate` ya pasó es `expired`, aunque el back
  todavía no lo haya marcado.

Tabla de transiciones (por tipo de documento, con el más reciente como
`latest` y el aprobado vigente como `current`):

| `latest.status`  | `current`            | Attention                               |
| ---------------- | -------------------- | --------------------------------------- |
| `APPROVED`       | (es el mismo)        | por días: valid/expiring/urgent/expired |
| `EXPIRED`        | (es el mismo)        | `expired`                               |
| `PENDING_REVIEW` | cualquiera o ninguno | `under-review` con `current`            |
| `REJECTED`       | cualquiera o ninguno | `rejected` con `current`                |

### DocumentCard

```ts
type DocumentCard = {
  docType: DocType;
  latest: ComplianceDocument;
  attention: Attention;
  needsAttention: boolean; // FR-003
  blocksAcceptance: AcceptanceBlockReason | null; // FR-032
};
```

`needsAttention` es `true` para `expiring`, `urgent`, `expired`, `rejected`,
y para `under-review` cuando `current` es `urgent` o `expired`.

`blocksAcceptance`:

| Attention                                     | Motivo                                  |
| --------------------------------------------- | --------------------------------------- |
| `urgent`                                      | `compliance`, `state: "expiring"`, days |
| `expired`                                     | `compliance`, `state: "expired"`        |
| `under-review` con `current` urgent o expired | `compliance`, `state: "under-review"`   |
| `rejected` con `current` urgent o expired     | el de `current` (expiring o expired)    |
| el resto                                      | `null`                                  |

### ComplianceSummary

```ts
type ComplianceSummary = {
  cards: DocumentCard[]; // orden fijo por DocType del contrato
  attentionCount: number;
  mostUrgent: DocumentCard | null; // menos días; vencidos primero
};
```

### AcceptanceBlockReason (cambia el de E4)

```ts
type AcceptanceBlockReason =
  | { kind: "daily-limit" }
  | { kind: "weekly-limit" }
  | { kind: "break-overdue" }
  | {
      kind: "compliance";
      docType: DocType;
      state: "expiring" | "expired" | "under-review";
      days: number | null;
    };
```

### DocumentDraft (formulario)

```ts
type DocumentDraft = {
  docType: DocType | null;
  issueDate: string | null; // YYYY-MM-DD
  expiryDate: string | null;
  file: PickedFile | null;
};

type PickedFile = { uri: string; name: string; mimeType: AllowedMimeType };

type DraftError =
  | "missing-type"
  | "missing-file"
  | "missing-issue-date"
  | "missing-expiry-date"
  | "expiry-not-after-issue"
  | "unsupported-file";
```

`validateDraft(draft)` devuelve los errores por campo; vacío = se puede
enviar.

### UploadError (`src/uploads/`)

```ts
type UploadError = {
  stage: "request-url" | "put" | "register";
  kind: "offline" | "rejected" | "server" | "rate-limited";
  message: string | null; // el del back si lo trae
};
```

### Profile (`src/profile/`)

- `initialsOf(fullName)`: "David Chen" → "DC"; un solo nombre → una letra.
- `licenceLabel(licenceClass)`: `HR`, `HC`, `MC` → nombre largo con la sigla;
  otro valor → la sigla; `null` → no se muestra.
- `emergencyContactOf(value)`: `{ name, phone }` si son strings; si no,
  `null` ("Not set").
- `formatTenure(createdAt, now)`: "New", "3mo", "1y 2mo".
