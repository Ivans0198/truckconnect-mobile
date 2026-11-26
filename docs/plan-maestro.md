# Plan maestro: TruckConnect Driver (mobile)

Fuentes: `docs/CLAUDE_MOBILE.md` (producto y reglas), `docs/PROMPT_MOBILE.md`
(pantallas), `docs/driver-incidents-mobile-requirement.md` (incidentes) y
`docs/openapi.json` (el contrato). Cada épica tiene su spec en
`specs/<N>-<nombre>/`; la columna se llena cuando la spec existe.

## Punto de partida

El bootstrap ya dejó el esqueleto: Expo SDK 58 con dev build, Expo Router,
TanStack Query, `openapi-fetch` con tipos generados, tokens del tema, jest +
msw, Playwright sobre Expo web y Maestro. Del "Scaffolding" de
`PROMPT_MOBILE.md` falta lo nativo (plugins de `expo-location` y
`expo-camera` en `app.json`), Zustand y `expo-secure-store`. Cada pieza entra
con la primera épica que la usa, no como épica propia.

## Épicas

| #   | Épica                               | Alcance                                                                                                                                                              | Tamaño | Depende de | Spec                              |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | --------------------------------- |
| E1  | Sesión y navegación                 | Login (mockup 09), tokens en secure store, refresh automático, guard de rutas, solo rol DRIVER, `GET /auth/me`, tab bar (Home, Fatigue, Docs, Profile), logout       | M      | (ninguna)  | `specs/3-sesion-navegacion/` (#3) |
| E2  | Órdenes y run activo                | Home/Today (10) con Start Day, detalle de orden (11) con accept/reject y navegación externa, orden activa (03) con avance de estado, cola offline, GPS en background | L      | E1         |                                   |
| E3  | POD                                 | Foto (15), firma (04), confirmación y upload a R2 (16), POD encolado offline con archivos en disco y estado "pending sync"                                           | M      | E2         |                                   |
| E4  | Fatiga HVNL                         | Pantalla de fatiga (12): ring, stats, break y fin de día, timeline, resumen semanal; bloqueo de "Accept" cuando el conductor excede las horas                        | M      | E1         | `specs/26-fatiga-hvnl/` (#26)     |
| E5  | Compliance, perfil y notificaciones | Documentos (13) con renovación por upload y banner en Home, perfil (14) con stats y preferencias, logout, lista de notificaciones in-app                             | M      | E1         |                                   |
| E6  | Incidentes                          | Reportar, mis reportes y detalle (sin mockup), evidencia por upload, `reasonOther` condicional, registros redactados por retención                                   | M      | E1, E2     |                                   |
| E7  | Endurecimiento                      | Estados loading/empty/error parejos en todas las pantallas, auditoría del consumo contra `openapi.json`, accesibilidad (contraste, targets ≥60px, texto ≥16pt)       | S      | E2 a E6    |                                   |

Fuera de las épicas, porque no hay código que un worker escriba:

- **Verificación en dispositivo** (después de E3): GPS en background
  manejando de verdad, cola offline en modo avión de punta a punta y consumo de
  batería en una jornada simulada. La hace una persona con el dev build.
- **Distribución** (después de E7): build de producción con EAS y distribución
  interna a los 5 conductores.

## Carriles en paralelo

```
E1 ──┬── E2 ──┬── E3 ──┐
     │        └── E6 ──┤
     ├── E4 ───────────┼── E7
     └── E5 ───────────┘
```

Con E1 mergeada, E2, E4 y E5 podrían avanzar a la vez. El orden elegido
(2026-11-27) es E4 y E5 primero, y después E2, E3, E6 y E7. E3 y E6 esperan a
E2.

## Por qué este orden

- **E1 primero**: sin sesión ningún endpoint responde y sin tab bar no hay
  dónde montar las pantallas.
- **E2 antes que E3 y E6**: la orden activa es la pantalla más crítica y la
  que pone en pie la cola offline y el helper de uploads. POD e incidentes los
  reusan en vez de inventar los suyos.
- **E4 y E5 antes que E2** (decisión del 2026-11-27): solo dependen de la
  sesión y no necesitan cambios en el back. E2 pide decisiones de contrato
  (hueco 1) y arrastra a E3, E6 y E7, así que va después.
- **El bloqueo de "Accept" lo deja E4 como dato**: una regla de "puede
  aceptar órdenes" con sus motivos (límite diario, límite semanal, break
  vencido). La historia de E2 que construye el botón la consume.
- **E7 al final**: revisa lo que las otras dejaron, no construye pantallas.

## Decisiones técnicas transversales

- **El contrato manda.** Todo request usa el cliente generado; nada de tipos
  a mano. Si una pantalla pide algo que el contrato no tiene, la spec lo dice
  y no se inventa.
- **Una cola offline, persistida.** Cambios de estado, POD e incidentes pasan
  por la misma cola, guardada en disco y reintentada al volver la red. Los
  archivos encolados viven en el sistema de archivos de la app, no en memoria.
  Nace en E2.
- **Un helper de uploads de tres pasos.** Pedir la URL presignada, `PUT`
  directo a R2 sin Bearer, registrar en el back. Si la URL venció (900 s),
  pide otra en vez de fallar. Lo usan POD, compliance e incidentes. Nace en E2
  o en la primera épica que suba un archivo.
- **Tokens solo en `expo-secure-store`.** El estado no sensible (la cola,
  preferencias locales) puede ir en AsyncStorage.
- **Presentación**: fechas del back en UTC mostradas en `Australia/Melbourne`;
  dinero en centavos formateado a AUD solo al mostrar.
- **Permisos en contexto**: ubicación al aceptar la primera orden, cámara al
  abrir el POD o adjuntar evidencia, cada uno con su explicación previa.
- **Nativo y web**: cada pantalla con un módulo nativo (cámara, ubicación,
  firma) tiene un stub web para Playwright y el ui-reviewer, y su flujo en
  `.maestro/`. El PR avisa que una persona corre `pnpm e2e:android`.
- **El idioma de la UI es inglés** (`CLAUDE.md`). El toggle de idioma del
  perfil queda fuera hasta que haya un segundo idioma.

## Huecos del contrato (para decidir antes de la spec que los toca)

1. **`POST /tracking/location` recibe una sola posición**, sin `orderId` ni
   hora de captura (`CreateLocationDto`: lat, lng, accuracy, speed, heading,
   batteryLevel). La regla 4 pide enviar lotes. Con el contrato actual, un lote
   se manda como POSTs sucesivos y una posición atrasada queda con la hora del
   servidor. Afecta a E2.
2. **No hay endpoint para registrar el push token.** Sin él el back no puede
   mandar push. E5 hace solo las notificaciones in-app hasta que exista.
3. **`PATCH /users/{id}` no tiene preferencias** (`UpdateUserDto`: fullName,
   phone, abn, licenceClass, licenceNumber, emergencyContact). Los toggles de
   push y ubicación en background del perfil serían ajustes locales del
   teléfono. Afecta a E5.
4. **Incidentes**: offline sí o no, dónde vive "Report incident" en la
   navegación y cuántos adjuntos por reporte. Son las preguntas abiertas del
   requerimiento; se cierran en la spec de E6.
5. **Los eventos de fatiga no llevan hora** (`POST /fatigue/start-day`,
   `/start-break`, `/end-break`, `/end-day` no tienen body): el servidor usa la
   hora en que recibe el pedido. Por eso E4 no encola estas acciones sin red.
   Encolarlas exige que el back acepte la hora del evento.
