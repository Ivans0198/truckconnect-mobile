# Prompt Claude Code — Driver App (truckconnect-driver-app)

## Contexto

App móvil (Expo + React Native) para los 5 conductores de TruckConnect. La usan durante toda su jornada laboral, mientras manejan camiones por Melbourne metro. El **backend ya existe** (`docs/openapi.json`); se desarrolla contra mocks (MSW), sin levantar el back.

Leé `CLAUDE.md` completo antes de empezar — tiene el stack, las 5 reglas críticas de esta app, los endpoints y el mapeo pantalla→mockup.

## Equipo: 3 desarrolladores

El trabajo se divide en **3 tracks paralelos** para minimizar conflictos. Cada track es un área con pantallas y dominio propios.

| Track | Responsable | Alcance | Pantallas |
|---|---|---|---|
| **A — Órdenes** | Dev 1 | El flujo central del conductor: ver, aceptar y ejecutar órdenes, tracking GPS | Home, Order detail, Active order |
| **B — POD & Compliance** | Dev 2 | Captura de evidencia y documentación: cámara, firma, uploads a R2 | POD (3 pasos), Compliance |
| **C — Fatiga & Perfil** | Dev 3 | HVNL y datos del conductor | Fatigue, Profile, Notifications |

**Fases 0 y 1 son compartidas** (scaffolding y auth): las hace **una sola persona** (Dev 1) y las otras dos esperan. Recién con la base mergeada arrancan los tracks en paralelo. Intentar paralelizar el scaffolding garantiza conflictos.

### Reglas de coordinación

1. **Ramas por track:** `feature/a-<pantalla>`, `feature/b-<pantalla>`, `feature/c-<pantalla>`. Nunca dos devs en la misma rama.
2. **Código compartido = PR chico y avisado.** Si tu track necesita tocar `src/api/`, `src/components/ui/`, o la navegación, hacelo en un PR separado, mínimo, y avisá en el canal del equipo antes. Esos archivos son de todos.
3. **CODEOWNERS:** el archivo asigna revisor por área. Todo PR necesita 1 approval de otro dev del equipo, además del `/code-review`.
4. **Rebase antes del PR:** `git pull --rebase origin main` antes de abrir el PR, para resolver conflictos localmente y no en GitHub.
5. **Merge frecuente a main.** Ramas de más de 2 días son riesgo de conflicto. Si una pantalla es grande, partila en dos PRs.
6. **Daily de 10 min** entre los 3: qué toqué de código compartido, qué voy a tocar hoy. Es el único mecanismo que previene los choques de verdad.

## Ciclo de trabajo por fase (por cada dev)

```
1. git pull --rebase origin main
2. git checkout -b feature/<track>-<nombre>     ← RAMA POR FEATURE
3. /goal <condición de la fase>                 ← construir hasta verificar
4. git push -u origin <rama>
5. gh pr create                                 ← PR
6. /code-review                                 ← CODE REVIEW
7. corregir + 1 approval humano de otro dev
8. merge a main
9. /clear                                       ← LIMPIAR antes de la siguiente
```

**Reglas:** el `/clear` va **después del merge**, nunca antes de resolver el review. Una fase = una rama = un PR.

## Anti-trampa del loop

- Prohibido bajar el estándar para que el goal pase: no borrar tests, no `it.skip`, no `any`, no comentar validaciones ni permisos.
- Si el mismo error persiste tras 3 intentos, parar y consultar al equipo.
- Desvíos del mockup o del contrato: consultar, no improvisar.

---

## Fase -1 — Preparación (cada dev, una vez)

1. `/model` → **Opus** para Fases 0-1, **Sonnet** para las pantallas.
2. Plugins:
   ```
   /plugin install feature-dev@claude-plugins-official
   /plugin install code-review@claude-plugins-official
   /plugin install security-guidance@claude-plugins-official
   ```
3. Confirmar `docs/openapi.json` y los 10 mockups en el repo.
4. Auto-accept edits (Shift+Tab).
5. Cuenta de Expo (EAS) creada — se necesita para el development build.

---

## FASES COMPARTIDAS (las hace Dev 1; los demás esperan el merge)

### Fase 0 — Scaffolding
Rama `feature/scaffolding`. Goal: proyecto Expo SDK 54+ con TypeScript strict creado; Expo Router configurado con grupos `(auth)` y `(tabs)`; `pnpm gen:api` genera `src/api/schema.d.ts` desde `docs/openapi.json`; `openapi-fetch` configurado con interceptor de auth; MSW instalado con un handler de ejemplo; TanStack Query provider; Zustand store base; tema con los colores semánticos y tipografía Inter; `eas.json` con perfil `development`; `pnpm start`, `typecheck` y `lint` limpios.

**Crítico:** configurar desde ya en `app.json` los plugins de `expo-location` (permisos foreground + background, `UIBackgroundModes: ["location"]` en iOS, `ACCESS_BACKGROUND_LOCATION` en Android) y `expo-camera`. Y generar el **development build** (`eas build --profile development`) — sin él no se puede testear GPS background ni push.

### Fase 1 — Auth + navegación
Rama `feature/auth`. Mockup `09`. Login (`POST /auth/login`), tokens en `expo-secure-store`, refresh automático, guard de rutas (redirige a login si no hay sesión), `GET /auth/me`. Solo rol DRIVER entra. Tab bar con las 4 secciones (Home, Fatigue, Docs, Profile). Goal: E2E login → sesión persistida tras reiniciar la app → logout, con MSW verde.

---

## TRACK A — Órdenes (Dev 1)

### Fase A1 — Home / Today
Mockup `10`. Saludo + fecha, botón grande "Start Day" (`POST /fatigue/start-day`), lista de órdenes del día (`GET /orders` filtrado a las propias), card de la próxima con badge "Next up", banner de compliance si hay doc por vencer. Estados: sin órdenes (empty), día ya iniciado (el CTA cambia a la orden activa).

### Fase A2 — Order detail (pre-pickup)
Mockup `11`. Detalle completo: mapa preview con ruta, pickup/delivery con contactos y ventanas, cargo (pallets, spaces, peso, altura), tail-lift si aplica, cliente, earnings. Botones "Accept & Start" (`POST /orders/{id}/accept`) y "Reject" (`POST /orders/{id}/reject`, pide razón). Botón navegar (abre Google Maps/Waze externo).

### Fase A3 — Active order + tracking GPS
Mockup `03`. La pantalla más crítica. Estado actual del viaje, botón grande de avance de estado (`POST /orders/{id}/status` — avanza un paso del lifecycle: EN_ROUTE_PICKUP → AT_PICKUP → LOADING → IN_TRANSIT → AT_DELIVERY), navegación, datos de contacto, y el CTA final que lleva al POD.

**GPS en background:** `expo-location` + `expo-task-manager`. Arranca al aceptar la orden, para al entregar. Envía a `POST /tracking/location`. **Tolerar batches**: acumular fixes y enviar en lote; no asumir intervalos exactos. Foreground service en Android con notificación que muestra la orden activa. Accuracy `Balanced` en tránsito, reducir frecuencia si está detenido >5 min.

**Offline:** los cambios de estado se encolan si no hay red y se sincronizan al volver. Nunca perder un cambio.

---

## TRACK B — POD & Compliance (Dev 2)

### Fase B1 — POD paso 1: foto
Mockup `15`. Cámara (`expo-camera`) con overlay de corner brackets, instrucción, y controles grandes. Tras capturar: preview con "Retake" / "Use photo". Foto con timestamp + geotag.

### Fase B2 — POD paso 2: firma
Mockup `04`. Canvas de firma (`react-native-signature-canvas`), campos "signed by name" y rol, botón Clear. Validar que la firma no esté vacía.

### Fase B3 — POD paso 3: confirmar + upload
Mockup `16`. Resumen (previews de foto y firma, receptor, tiempos, pallets, earnings), campo de notas opcional, botón "Submit & Mark Delivered".
**Flujo de upload:** `POST /orders/{id}/pod/upload-url` para cada asset → PUT directo a R2 → `POST /orders/{id}/pod` con las URLs. **Offline:** si no hay red, encolar el POD completo (con los archivos en disco) y reintentar; mostrar estado "pending sync". Un POD nunca se pierde.

### Fase B4 — Compliance
Mockup `13`. Lista de documentos propios (`GET /compliance/documents`) con estado y expiry; borde ámbar y CTA inline en los que vencen pronto. Upload de renovación: `POST /compliance/documents/upload-url` → PUT a R2 → `POST /compliance/documents`. Card explicativo del esquema de alertas (90/60/30/14/7 días).

---

## TRACK C — Fatiga & Perfil (Dev 3)

### Fase C1 — Fatigue
Mockup `12`. Ring grande con horas trabajadas del día (`GET /fatigue/status`), stats (remaining, next break, week), botones grandes "Take Break" / "End Day" (`POST /fatigue/start-break`, `/end-break`, `/end-day`), timeline de eventos del día (`GET /fatigue/events`), resumen semanal por día (`GET /fatigue/week-summary`).
**HVNL Standard Hours:** 12h/día, 72h/semana, break requerido cada 5h30m. Los colores del ring siguen el semáforo (verde <9h, ámbar 9–11h, rojo >11h). Si el conductor excede, la app debe reflejar que no puede aceptar nuevas órdenes.

### Fase C2 — Profile
Mockup `14`. Datos personales (`GET /users/me`), stats (`GET /drivers/{id}/stats`), info del vehículo, toggles de preferencias (push, background location, idioma) vía `PATCH /users/{id}`, soporte, logout. Rating como placeholder "— —" (Fase 2 del producto).

### Fase C3 — Notifications
Sin mockup. Lista de notificaciones in-app (`GET /notifications`), marcar leída (`PATCH /notifications/{id}/read`) y todas (`/read-all`). Integración con `expo-notifications` para push: registrar token, manejar tap (deep link a la orden).

---

## FASE FINAL — Integración y polish (los 3 juntos)

Rama `feature/polish`. Requiere que los 3 tracks estén mergeados.
- Estados de carga/error/vacío consistentes en todas las pantallas.
- Verificación de la cola offline end-to-end (modo avión → acciones → recuperar red → sync).
- Prueba real de background GPS en un **development build** en dispositivo físico, manejando (no en emulador).
- Consumo de batería medido en una jornada simulada.
- Pasada del subagent `mobile-api-auditor` sobre todo el consumo de API.
- Accesibilidad: contraste bajo sol, targets ≥60px, tipografía ≥16pt.
- Build de producción con EAS + distribución interna a los 5 conductores.

---

## Primer paso (Dev 1, fases compartidas)

1. Confirmá que tenés `docs/openapi.json` y los 10 mockups.
2. Leé `CLAUDE.md` y el contrato, y confirmá en 5 bullets qué entendiste (endpoints del driver, las 5 reglas críticas, y por qué Expo Go no sirve).
3. Arrancá Fase 0 con el ciclo completo. No codees antes del OK.

Los Devs 2 y 3 esperan el merge de las Fases 0 y 1 antes de arrancar sus tracks.
