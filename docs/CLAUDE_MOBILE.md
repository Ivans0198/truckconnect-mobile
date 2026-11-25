# TruckConnect Driver App — CLAUDE.md

App móvil para los conductores de TruckConnect (transporte boutique, Melbourne metro). La usan 5 conductores contratistas durante toda su jornada: ver órdenes del día, navegar, registrar fatiga (HVNL), capturar POD, y mantener su compliance al día. Repo: `truckconnect-driver-app`.

> El backend YA existe. Su contrato está en `docs/openapi.json` (OpenAPI 3.0, 71 paths, 92 schemas). **Es la fuente de verdad.** Si un endpoint o campo no está ahí, no existe.

## Stack (no negociable)

| Capa | Tecnología |
|---|---|
| Framework | **Expo SDK 54+** (managed) + React Native + TypeScript strict |
| Navegación | Expo Router (file-based) |
| Estado servidor | TanStack Query v5 |
| Estado local | Zustand |
| Cliente API | **Generado del OpenAPI** (`openapi-typescript` + `openapi-fetch`) |
| Mocks | MSW (desarrollo sin backend) |
| GPS | `expo-location` + `expo-task-manager` (background) |
| Cámara / firma | `expo-camera`, `react-native-signature-canvas` |
| Storage seguro | `expo-secure-store` (tokens) |
| Push | `expo-notifications` |
| Build | EAS Build (**development build**, NO Expo Go) |

## ⚠️ Reglas críticas de esta app

1. **Expo Go NO sirve.** El background location y las notificaciones requieren un **development build** de EAS. Testear en Expo Go da falsos negativos y hace perder días. `eas build --profile development` desde el inicio.
2. **El conductor maneja.** Toda decisión de UX prioriza: targets grandes (≥60px), tipografía ≥16pt, alto contraste (sol directo), mínimos taps. Nada de flujos que requieran atención sostenida.
3. **Offline-first en el flujo de orden.** El conductor entra a zonas sin señal (docks, sótanos). Las acciones (cambio de estado, POD) se encolan y sincronizan al recuperar conexión. Nunca perder un POD por falta de señal.
4. **El GPS en background llega batcheado.** Android puede entregar 5 posiciones juntas cada 2 min en vez de 1 cada 15s. Es comportamiento de plataforma, no bug. El código debe tolerarlo (enviar lotes, no asumir intervalos exactos).
5. **Batería.** El tracking corre toda la jornada. Usar `Accuracy.Balanced` en tránsito, bajar frecuencia cuando está detenido, y detener el tracking al terminar la orden.

## Endpoints que consume el driver

Ver `docs/openapi.json`. Los relevantes (todos filtran al conductor autenticado):
- **auth:** `POST /auth/login`, `/refresh`, `/logout`, `GET /auth/me`
- **orders:** `GET /orders` (solo las propias), `GET /orders/{id}`, `POST /orders/{id}/accept`, `/reject`, `/status` (avanza el lifecycle un paso), `/pod`, `/pod/upload-url`
- **fatigue:** `POST /fatigue/start-day`, `/start-break`, `/end-break`, `/end-day`; `GET /fatigue/status`, `/events`, `/week-summary`
- **compliance:** `GET /compliance/documents` (propios), `POST /compliance/documents`, `/documents/upload-url`
- **tracking:** `POST /tracking/location` (GPS en vivo)
- **drivers:** `GET /drivers/{id}/stats`, `/fatigue/status` (self permitido)
- **users:** `GET /users/me`, `PATCH /users/{id}` (self limitado)
- **notifications:** `GET /notifications`, `PATCH /notifications/{id}/read`, `/read-all`

## Cómo se consume la API

**El cliente se genera, no se escribe:**
```bash
pnpm gen:api   # openapi-typescript docs/openapi.json -o src/api/schema.d.ts
```
Todo request usa el cliente tipado. Si el back cambia, se reemplaza `openapi.json`, se regenera, y TypeScript marca los desajustes en compile-time.

**Desarrollo contra MSW**, no contra el back. Handlers en `src/mocks/handlers/`, uno por dominio.

**Uploads (POD y compliance):** flujo de dos pasos — pedir presigned URL al back, subir el archivo directo a R2 con esa URL, después registrar en el back. El archivo nunca pasa por el servidor.

## Pantallas y su mockup

| Pantalla | Mockup |
|---|---|
| Login | `09_driver_login.html` |
| Home / Today | `10_driver_home.html` |
| Order detail (pre-pickup) | `11_driver_order_detail.html` |
| Active order (en curso) | `03_driver_active_order.html` |
| POD paso 1 — foto | `15_driver_pod_photo.html` |
| POD paso 2 — firma | `04_driver_pod_capture.html` |
| POD paso 3 — confirmar | `16_driver_pod_confirm.html` |
| Fatigue | `12_driver_fatigue.html` |
| Compliance | `13_driver_compliance.html` |
| Profile | `14_driver_profile.html` |

**Los mockups son la referencia autoritativa de diseño.** Abrí el HTML antes de construir la pantalla. Reproducí layout, colores semánticos y tipografía (Inter). Los mockups son estáticos: agregá estados (loading skeleton, empty, error) y feedback táctil.

## Colores semánticos (consistentes con el admin)

- **Verde:** completado, válido, OK (DELIVERED, APPROVED, fatiga <9h)
- **Ámbar:** atención próxima (doc por vencer, fatiga 9–11h, PENDING)
- **Rojo:** bloqueante (EXPIRED, SUSPENDED, fatiga >11h, CANCELLED)
- **Azul:** en progreso (EN_ROUTE, AT_PICKUP, LOADING, IN_TRANSIT, AT_DELIVERY)

## Convenciones de código

- TypeScript strict. Nada de `any`.
- Expo Router: rutas en `app/`, agrupadas `(auth)` y `(tabs)`.
- Tokens en `expo-secure-store`, **nunca** en AsyncStorage.
- Dinero: el back manda centavos (`*Cents`). Formatear a AUD solo en presentación.
- Fechas: back en UTC → mostrar en `Australia/Melbourne`.
- Permisos: pedirlos **en contexto** (explicar por qué antes del prompt del SO), no todos al inicio.
- Errores de red: nunca un crash. Siempre estado de error con retry.

## Comandos

```bash
pnpm start              # Expo dev server
pnpm gen:api            # regenerar cliente del OpenAPI
pnpm typecheck          # tsc --noEmit
pnpm lint
pnpm test
eas build --profile development --platform android   # dev build (necesario para GPS background)
```

## Herramientas del repo

- Subagent `mobile-api-auditor` — verifica que la app consuma solo endpoints/campos del contrato real.
- Plugins oficiales: `feature-dev`, `code-review`, `security-guidance`.
