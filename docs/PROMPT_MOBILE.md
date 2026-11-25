# Driver App: pantallas y comportamiento

## Contexto

App móvil (Expo + React Native) para los 5 conductores de TruckConnect. La usan durante toda su jornada laboral, mientras manejan camiones por Melbourne metro. El **backend ya existe** (`docs/openapi.json`); se desarrolla contra mocks (MSW), sin levantar el back.

`docs/CLAUDE_MOBILE.md` tiene el stack, las 5 reglas críticas de esta app, los endpoints y el mapeo pantalla→mockup. Este documento describe qué hace cada pantalla.

## Base

### Scaffolding
Proyecto Expo SDK 54+ con TypeScript strict creado; Expo Router configurado con grupos `(auth)` y `(tabs)`; `pnpm gen:api` genera `src/api/schema.d.ts` desde `docs/openapi.json`; `openapi-fetch` configurado con interceptor de auth; MSW instalado con un handler de ejemplo; TanStack Query provider; Zustand store base; tema con los colores semánticos y tipografía Inter; `eas.json` con perfil `development`; `pnpm start`, `typecheck` y `lint` limpios.

**Crítico:** configurar desde ya en `app.json` los plugins de `expo-location` (permisos foreground + background, `UIBackgroundModes: ["location"]` en iOS, `ACCESS_BACKGROUND_LOCATION` en Android) y `expo-camera`. Y generar el **development build** (`eas build --profile development`) — sin él no se puede testear GPS background ni push.

### Auth + navegación
Mockup `09`. Login (`POST /auth/login`), tokens en `expo-secure-store`, refresh automático, guard de rutas (redirige a login si no hay sesión), `GET /auth/me`. Solo rol DRIVER entra. Tab bar con las 4 secciones (Home, Fatigue, Docs, Profile). Listo cuando: E2E login → sesión persistida tras reiniciar la app → logout, con MSW verde.

---

## Órdenes

### Home / Today
Mockup `10`. Saludo + fecha, botón grande "Start Day" (`POST /fatigue/start-day`), lista de órdenes del día (`GET /orders` filtrado a las propias), card de la próxima con badge "Next up", banner de compliance si hay doc por vencer. Estados: sin órdenes (empty), día ya iniciado (el CTA cambia a la orden activa).

### Order detail (pre-pickup)
Mockup `11`. Detalle completo: mapa preview con ruta, pickup/delivery con contactos y ventanas, cargo (pallets, spaces, peso, altura), tail-lift si aplica, cliente, earnings. Botones "Accept & Start" (`POST /orders/{id}/accept`) y "Reject" (`POST /orders/{id}/reject`, pide razón). Botón navegar (abre Google Maps/Waze externo).

### Active order + tracking GPS
Mockup `03`. La pantalla más crítica. Estado actual del viaje, botón grande de avance de estado (`POST /orders/{id}/status` — avanza un paso del lifecycle: EN_ROUTE_PICKUP → AT_PICKUP → LOADING → IN_TRANSIT → AT_DELIVERY), navegación, datos de contacto, y el CTA final que lleva al POD.

**GPS en background:** `expo-location` + `expo-task-manager`. Arranca al aceptar la orden, para al entregar. Envía a `POST /tracking/location`. **Tolerar batches**: acumular fixes y enviar en lote; no asumir intervalos exactos. Foreground service en Android con notificación que muestra la orden activa. Accuracy `Balanced` en tránsito, reducir frecuencia si está detenido >5 min.

**Offline:** los cambios de estado se encolan si no hay red y se sincronizan al volver. Nunca perder un cambio.

---

## POD & Compliance

### POD paso 1: foto
Mockup `15`. Cámara (`expo-camera`) con overlay de corner brackets, instrucción, y controles grandes. Tras capturar: preview con "Retake" / "Use photo". Foto con timestamp + geotag.

### POD paso 2: firma
Mockup `04`. Canvas de firma (`react-native-signature-canvas`), campos "signed by name" y rol, botón Clear. Validar que la firma no esté vacía.

### POD paso 3: confirmar + upload
Mockup `16`. Resumen (previews de foto y firma, receptor, tiempos, pallets, earnings), campo de notas opcional, botón "Submit & Mark Delivered".
**Flujo de upload:** `POST /orders/{id}/pod/upload-url` para cada asset → PUT directo a R2 → `POST /orders/{id}/pod` con las URLs. **Offline:** si no hay red, encolar el POD completo (con los archivos en disco) y reintentar; mostrar estado "pending sync". Un POD nunca se pierde.

### Compliance
Mockup `13`. Lista de documentos propios (`GET /compliance/documents`) con estado y expiry; borde ámbar y CTA inline en los que vencen pronto. Upload de renovación: `POST /compliance/documents/upload-url` → PUT a R2 → `POST /compliance/documents`. Card explicativo del esquema de alertas (90/60/30/14/7 días).

---

## Fatiga & Perfil

### Fatigue
Mockup `12`. Ring grande con horas trabajadas del día (`GET /fatigue/status`), stats (remaining, next break, week), botones grandes "Take Break" / "End Day" (`POST /fatigue/start-break`, `/end-break`, `/end-day`), timeline de eventos del día (`GET /fatigue/events`), resumen semanal por día (`GET /fatigue/week-summary`).
**HVNL Standard Hours:** 12h/día, 72h/semana, break requerido cada 5h30m. Los colores del ring siguen el semáforo (verde <9h, ámbar 9–11h, rojo >11h). Si el conductor excede, la app debe reflejar que no puede aceptar nuevas órdenes.

### Profile
Mockup `14`. Datos personales (`GET /users/me`), stats (`GET /drivers/{id}/stats`), info del vehículo, toggles de preferencias (push, background location, idioma) vía `PATCH /users/{id}`, soporte, logout. Rating como placeholder "— —" (Fase 2 del producto).

### Notifications
Sin mockup. Lista de notificaciones in-app (`GET /notifications`), marcar leída (`PATCH /notifications/{id}/read`) y todas (`/read-all`). Integración con `expo-notifications` para push: registrar token, manejar tap (deep link a la orden).

---

## Incidentes

Tres pantallas sin mockup: reportar, mis reportes y el detalle de uno. La especificación completa (campos, contrato, uploads, retención y preguntas abiertas) está en `docs/driver-incidents-mobile-requirement.md`.

---

## Integración y polish

Cuando todo lo anterior esté hecho.
- Estados de carga/error/vacío consistentes en todas las pantallas.
- Verificación de la cola offline end-to-end (modo avión → acciones → recuperar red → sync).
- Prueba real de background GPS en un **development build** en dispositivo físico, manejando (no en emulador).
- Consumo de batería medido en una jornada simulada.
- Revisión de todo el consumo de API contra `docs/openapi.json`: solo endpoints y campos que existen.
- Accesibilidad: contraste bajo sol, targets ≥60px, tipografía ≥16pt.
- Build de producción con EAS + distribución interna a los 5 conductores.
