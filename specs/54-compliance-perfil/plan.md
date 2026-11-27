# Implementation Plan: Compliance, perfil y notificaciones

**Branch**: `spec-54` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

**Generated with**: fabrica 0.5.29, Spec Kit 1.2.2

**Input**: Feature specification from `/specs/54-compliance-perfil/spec.md`

## Summary

Las pestañas Docs y Profile dejan de ser títulos. Docs pasa a ser la pantalla
del mockup 13: una tarjeta por tipo de documento con su semáforo (ámbar a 60
días, rojo a 7), el aviso del más urgente y la subida de la renovación con
foto o archivo. Profile pasa a ser el mockup 14 de solo lectura, sin
Preferences. Home suma la campana de notificaciones y el aviso de compliance,
y la barra un punto en Docs. La regla "puede aceptar órdenes" de E4 suma
motivos de compliance.

Técnicamente:

- Una función pura (`summarizeDocuments`) deriva la atención de cada
  documento. La leen Docs, Home, la barra y la regla de aceptar.
- Nace el helper de subidas de tres pasos en `src/uploads/`, que van a reusar
  E3 y E6.
- Las notificaciones son una lista infinita con lectura optimista.
- Entran cuatro dependencias nativas, con un dev build nuevo y un flow de
  Maestro ([research.md](./research.md)).

## Technical Context

**Language/Version**: TypeScript strict (~6.0), React 19.3, React Native 0.88

**Primary Dependencies**: Expo SDK 58 (dev build), Expo Router, TanStack Query v5, `openapi-fetch` con tipos de `pnpm gen:api`, `expo-constants` (ya instalado). Nuevas, con `pnpm exec expo install`: `expo-image-picker` (R6), `expo-document-picker` (R6), `expo-file-system` (R5) y `@react-native-community/datetimepicker` (R7)

**Storage**: ninguno propio; caché de TanStack Query. Nada se encola (FR-011)

**Testing**: jest-expo + Testing Library v14 + msw (`src/test/server.ts`) con fake timers; Playwright + axe sobre Expo web; Maestro en el emulador para la cámara y el permiso (R14)

**Target Platform**: Android (dev build) como plataforma real; Expo web como aproximación para Playwright y el ui-reviewer

**Project Type**: mobile-app

**Performance Goals**: el aviso de compliance en Home visible en menos de 3 s (SC-001); subir una renovación en menos de 2 min (SC-002)

**Constraints**: sin cola offline para compliance; fechas en `Australia/Melbourne`; áreas táctiles ≥60 y texto ≥16; UI en inglés; solo los endpoints de [contracts/api-usage.md](./contracts/api-usage.md); el `PUT` de subida sin token

**Scale/Scope**: 5 conductores; 3 pantallas nuevas (Docs, formulario de documento, Notifications), 2 completadas (Home y Profile), 1 helper compartido y un cambio a la interfaz de E4 para E2

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio / regla                       | Cómo lo cumple el plan                                                                                                                                                                       | Estado |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Test-first                           | Cada historia arranca con sus tests desde los escenarios. En Foundational, `summarizeDocuments` y los formateadores tienen su test antes que su código                                       | OK     |
| II. Historias independientes            | US1, US3, US4 y US5 dependen solo de Foundational. US2 depende de US1 (sube desde su tarjeta) y lo declara                                                                                   | OK     |
| III. Spec fija                          | El plan no cambia la spec. Reusar `/auth/me` en vez de `/users/me` es un detalle de implementación con el mismo DTO (R1)                                                                     | OK     |
| Types (mandatory)                       | `Attention`, `AcceptanceBlockReason`, `UploadError` y `DraftError` como uniones discriminadas ([data-model.md](./data-model.md))                                                             | OK     |
| Magic values (mandatory)                | `ATTENTION_FROM_DAYS`, `URGENT_FROM_DAYS`, `DOCUMENTS_PAGE_LIMIT`, `NOTIFICATIONS_PAGE_SIZE`, `UNREAD_REFRESH_MS` con nombre                                                                 | OK     |
| Errors (mandatory)                      | Las queries lanzan ante un no-2xx; `UploadError` dice en qué paso y por qué falló; una lista con más de una página lanza en vez de cortar (R1)                                               | OK     |
| State & purity (mandatory)              | Atención, regla de aceptar, validación del formulario, iniciales, licencia y "With us" son funciones puras con `now` como parámetro                                                          | OK     |
| Dependencies (mandatory)                | Cuatro nuevas, cada una con su justificación en research (R5, R6, R7). El PR de la historia que la instala la repite en una línea                                                            | OK     |
| Packages (mandatory)                    | Todas con `pnpm exec expo install`                                                                                                                                                           | OK     |
| Native projects / dev build (mandatory) | El permiso de cámara va en el config plugin de `expo-image-picker` en `app.json`; nada a mano en `android/`. El PR de US2 avisa que hace falta un dev build nuevo                            | OK     |
| Routing                                 | `app/` solo compone: `ComplianceScreen`, `DocumentForm`, `ProfileScreen`, `NotificationsScreen` y los componentes de Home viven en `src/` ([contracts/routes.md](./contracts/routes.md))     | OK     |
| Styles (mandatory)                      | Colores, tamaños y fuentes de `src/theme/tokens.ts`; los estados usan `semantic`                                                                                                             | OK     |
| Driver ergonomics (mandatory)           | Botones, filas y campos de fecha ≥60; todo texto ≥16 aunque el mockup dibuje etiquetas de 11 a 13 px (FR-029)                                                                                | OK     |
| Accessibility (mandatory)               | La campana y el "+" con `accessibilityLabel`; el punto de Docs en el nombre de la pestaña; el estado de cada tarjeta en texto, no solo en color; el progreso de la subida en una región viva | OK     |
| Components                              | `FlatList` para notificaciones (paginada). Docs usa `ScrollView`: como mucho cinco tarjetas. Los selectores nativos se eligieron después de mirar `@expo/ui` (R7)                            | OK     |
| Platform code                           | `read-file.ts` / `read-file.web.ts` y `date-field.tsx` / `date-field.web.tsx` por archivo, sin `Platform.OS` sueltos                                                                         | OK     |
| The contract (mandatory)                | Solo los endpoints de [contracts/api-usage.md](./contracts/api-usage.md) con el cliente tipado; tipos de `schema.d.ts`                                                                       | OK     |
| Server state (mandatory)                | Todo en Query con keys `const`; la lectura optimista se hace sobre la caché, no en un store                                                                                                  | OK     |
| Errors / 429 (mandatory)                | Cada sección con error y "Try again"; 429 dice "try again shortly" y conserva el formulario                                                                                                  | OK     |
| Money and time (mandatory)              | Fechas, tiempo restante y hora de notificación en el formateador compartido de `src/format/time.ts` (R13). No se muestra dinero                                                              | OK     |
| Offline (mandatory where it applies)    | No aplica: el perfil lo pide para cambios de estado, POD e incidentes. La spec decide no encolar compliance (FR-011) y avisarlo                                                              | OK     |
| Uploads                                 | URL presignada, `PUT` sin Bearer, registrar; URL vencida se vuelve a pedir ([contracts/uploads.md](./contracts/uploads.md))                                                                  | OK     |
| Permissions (mandatory)                 | La cámara se pide después de una explicación propia; negada, "Choose file" sigue disponible                                                                                                  | OK     |
| Tests: jest (mandatory)                 | Consultas por rol y texto; HTTP con msw en los paths del contrato, incluido el `PUT`; sin mockear el cliente. Solo se reemplazan los selectores nativos (`pick-file`, el diálogo de fecha)   | OK     |
| Maestro (mandatory when native)         | `.maestro/compliance-upload.yaml` para el permiso y la cámara (R14), con los mocks del dev build (R15)                                                                                       | OK     |

Re-check después de la Fase 1: sin cambios. Sin violaciones, así que no hay
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/54-compliance-perfil/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-usage.md
│   ├── order-acceptance.md      # el cambio a la interfaz de E4 que consume E2
│   ├── routes.md
│   └── uploads.md               # el helper que reusan E3 y E6
├── checklists/requirements.md
└── tasks.md                     # /fabrica:tasks
```

### Source Code (repository root)

```text
app/
├── _layout.tsx                  # suma documents/new (modal) y notifications al Stack protegido
├── documents/
│   └── new.tsx                  # compone DocumentForm
├── notifications.tsx            # compone NotificationsScreen
└── (tabs)/
    ├── _layout.tsx              # tabBarBadge de Docs
    ├── index.tsx                # HomeHeader + ComplianceBanner
    ├── docs.tsx                 # compone ComplianceScreen
    └── profile.tsx              # compone ProfileScreen

src/
├── compliance/
│   ├── types.ts                 # alias de components["schemas"], nombres de DocType, umbrales
│   ├── attention.ts             # summarizeDocuments, Attention, DocumentCard
│   ├── queries.ts               # key y hook de documentos, useComplianceAttention
│   ├── compliance-screen.tsx    # aviso, tarjetas, "How alerts work", vacío, error
│   ├── document-card.tsx
│   ├── attention-banner.tsx     # el aviso de arriba de Docs
│   ├── compliance-banner.tsx    # el aviso de Home
│   ├── draft.ts                 # DocumentDraft, validateDraft
│   ├── pick-file.ts             # expo-image-picker / expo-document-picker → PickedFile
│   ├── camera-rationale.tsx     # la explicación antes del permiso
│   ├── document-form.tsx
│   ├── submit-document.ts       # mutación: helper de subidas + POST /compliance/documents
│   └── *.test.ts(x)
├── uploads/
│   ├── presigned-upload.ts      # uploadWithPresignedUrl, UploadError
│   ├── read-file.ts             # File de expo-file-system
│   ├── read-file.web.ts
│   └── *.test.ts
├── profile/
│   ├── profile-format.ts        # iniciales, licencia, contacto de emergencia
│   ├── queries.ts               # stats del mes, vehículos
│   ├── profile-screen.tsx
│   ├── profile-header.tsx       # avatar, nombre, licencia, ABN, stats
│   ├── personal-info.tsx
│   ├── vehicle-card.tsx
│   └── *.test.ts(x)
├── notifications/
│   ├── queries.ts               # lista infinita, contador de no leídas
│   ├── mutations.ts             # leer una (optimista), leer todas
│   ├── notifications-screen.tsx
│   ├── notification-row.tsx
│   ├── notification-bell.tsx    # campana con punto, para Home
│   └── *.test.ts(x)
├── home/
│   └── home-header.tsx          # título y campana
├── fatigue/
│   ├── order-acceptance.ts      # motivos como unión, compliance, describeBlockReason
│   └── acceptance-banner.tsx    # usa describeBlockReason
├── format/
│   └── time.ts                  # formatMelbourneDate, formatTimeLeft, formatTenure, formatNotificationTime
├── navigation/
│   └── tab-bar.tsx              # respeta tabBarBadge
├── ui/
│   ├── date-field.tsx           # diálogo de Android
│   └── date-field.web.tsx
├── mocks/                       # handlers de E5 para el dev build (R15)
└── test/
    ├── compliance-fixtures.ts
    ├── profile-fixtures.ts
    ├── notification-fixtures.ts
    └── server.ts                # handlers felices de las nuevas lecturas

tests/ui.spec.ts                 # Docs, formulario, Profile, Notifications y Home en los dos viewports, axe
.maestro/compliance-upload.yaml  # permiso de cámara y cámara del sistema
app.json                         # config plugin de expo-image-picker con el texto del permiso
```

**Structure Decision**: una sola app Expo, como en E1 y E4. Cada dominio
tiene su carpeta en `src/`: `compliance/`, `profile/`, `notifications/` y
`uploads/`, este último compartido con E3 y E6. La regla de aceptar se queda
en `src/fatigue/` para no romper los imports de E4. `home/` nace chica a
propósito: E2 la completa.

## Complexity Tracking

Sin violaciones de la constitución.
