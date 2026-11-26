# Research: Fatiga HVNL

Decisiones técnicas del plan de [spec.md](./spec.md). Cada una dice qué se
eligió, por qué y qué se descartó.

## R1. Tres queries, una por endpoint de lectura

- **Decision**: `GET /fatigue/status`, `GET /fatigue/events` y
  `GET /fatigue/week-summary` son tres queries de TanStack Query separadas, en
  `src/fatigue/`, con sus keys como `const` arrays bajo el prefijo
  `["fatigue"]`.
- **Rationale**: la spec pide que cada sección tenga su propio error y su
  propio reintento (FR-012, edge case "datos que no cargan"). Con tres queries,
  una falla de eventos no tapa el anillo. El prefijo común deja invalidar las
  tres juntas después de una acción.
- **Alternatives considered**: una sola query que pida los tres endpoints en
  paralelo. Se descartó porque un solo error vaciaría la pantalla entera.

## R2. Refresco: foco de la pestaña, vuelta de la app, pull-to-refresh y cada minuto

- **Decision**: `refetchInterval: 60_000` solo mientras la pestaña está
  enfocada (`useIsFocused` de Expo Router decide `enabled` del intervalo);
  `useFocusEffect` dispara `refetch` al volver a la pestaña; `RefreshControl`
  en el `ScrollView` de la pantalla para tirar hacia abajo. Para la vuelta de
  la app desde segundo plano, `focusManager` de TanStack se conecta a
  `AppState` una vez, en `src/api/app-focus.ts`, y se llama desde
  `app/_layout.tsx`.
- **Rationale**: FR-013. En React Native `refetchOnWindowFocus` no hace nada
  sin conectar `AppState`; es la receta oficial de TanStack para RN.
- **Alternatives considered**: un `setInterval` propio. Se descartó porque
  duplica lo que TanStack ya hace y no se pausa solo.

## R3. Las acciones son mutaciones que escriben el estado devuelto

- **Decision**: `start-day`, `start-break`, `end-break` y `end-day` son
  `useMutation`. Las cuatro devuelven `FatigueStatusResponseDto`, así que
  `onSuccess` escribe esa respuesta en la query de estado
  (`setQueryData`) e invalida eventos y semana. `isPending` deshabilita el
  botón.
- **Rationale**: FR-006 y FR-007. Pintar lo que devolvió el back evita un
  segundo viaje para el anillo y nunca muestra un estado que el back no
  confirmó.
- **Alternatives considered**: actualización optimista. Se descartó: con
  FR-017 una acción sin red no debe parecer registrada ni un instante.

## R4. Sin cola offline; tres tipos de falla

- **Decision**: una función pura `classifyFatigueActionError` separa la falla
  en `offline` (el `fetch` lanzó, no hubo respuesta), `rate-limited` (429) y
  `rejected` (cualquier otro no-2xx, con el `message` de `ApiErrorDto`).
  `offline` muestra "No connection. <acción> was not recorded." con "Try
  again"; `rate-limited`, "Too many attempts, try again in a moment";
  `rejected`, el mensaje del back e invalida la query de estado para mostrar
  el estado real.
- **Rationale**: aclaración 2 de la spec y FR-017. El perfil del stack pide
  encolar cambios de estado de orden, POD e incidentes; los eventos de fatiga
  no están en esa lista, y encolarlos dejaría horas falsas porque el contrato
  no acepta la hora del evento.
- **Alternatives considered**: reintentar solo en segundo plano. Se descartó
  por la misma razón que la cola.

## R5. La regla "puede aceptar órdenes" es una función pura más un hook

- **Decision**: `evaluateOrderAcceptance({ status, week, now })` devuelve una
  unión discriminada: `{ kind: "allowed" }` o
  `{ kind: "blocked", reasons: AcceptanceBlockReason[] }`, con los motivos
  `daily-limit` (`hoursRemaining <= 0`), `weekly-limit`
  (`remainingHours <= 0`) y `break-overdue` (estado `working`,
  `nextBreakDueAt` no nulo y anterior o igual a `now`). El hook
  `useOrderAcceptance()` la combina con las dos queries y suma
  `{ kind: "unknown" }` mientras alguna carga o falló.
- **Rationale**: FR-010 y la aclaración 3. La función pura se prueba con
  todos los casos de SC-004 sin render. `unknown` obliga a E2 a decidir qué
  hace sin datos en lugar de tratar "sin datos" como "permitido". La interfaz
  queda en [contracts/order-acceptance.md](./contracts/order-acceptance.md).
- **Alternatives considered**: un booleano `canAccept`. Se descartó porque
  pierde los motivos que el aviso muestra y esconde el caso sin datos.

## R6. Fechas y duraciones sin dependencia nueva

- **Decision**: `src/format/time.ts` concentra el formato: horas de Melbourne
  con `Intl.DateTimeFormat` y `timeZone: "Australia/Melbourne"`, duraciones
  ("5h 30m") desde horas decimales o milisegundos, y
  `startOfMelbourneDay(now)` (el instante UTC de la medianoche de Melbourne,
  sacado del desfase que da `Intl`) para el `from` de `GET /fatigue/events`.
  El nombre corto del día de `byDay[].date` (`YYYY-MM-DD`) se formatea como
  fecha de calendario, sin zona.
- **Rationale**: el perfil pide un formateador compartido para la hora de
  Melbourne. Hermes en Android y Node en jest traen `Intl` con zonas horarias,
  así que no hace falta una librería. Es el primer formateador de fechas de la
  app; E2 lo reusa.
- **Alternatives considered**: `date-fns-tz` o `dayjs` con su plugin de
  zonas. Se descartaron: una dependencia de runtime para tres funciones.

## R7. El anillo con `react-native-svg`

- **Decision**: un `Circle` de fondo y otro con `strokeDasharray` para el
  progreso, en `src/fatigue/hours-ring.tsx`. Progreso = `min(hoursWorked / 12,
1)`; el número del centro muestra las horas reales aunque pasen de 12.
- **Rationale**: `react-native-svg` ya está instalado (E1, íconos de la tab
  bar) y funciona en web, así que Playwright lo ve.
- **Alternatives considered**: un anillo hecho con bordes de `View`. No
  dibuja un arco parcial limpio.

## R8. Colores del semáforo en una sola función

- **Decision**: `fatigueTone(hours)` devuelve `success` por debajo de 9,
  `warning` de 9 a 11 inclusive y `danger` por encima de 11, y usa los tonos
  `semantic` de `src/theme/tokens.ts`. Los umbrales son constantes con nombre
  (`AMBER_FROM_HOURS = 9`, `RED_ABOVE_HOURS = 11`), junto a
  `DAILY_LIMIT_HOURS = 12` y `WEEKLY_LIMIT_HOURS = 72`.
- **Rationale**: FR-002, y la regla de magic values. El anillo y las barras
  de la semana usan la misma función. El color nunca va solo: el anillo lleva
  la etiqueta de estado y las barras el texto de horas.
- **Alternatives considered**: ninguna con peso.

## R9. Todo texto a 16 o más, aunque el mockup lo dibuje más chico

- **Decision**: ningún texto de la pantalla baja de `fontSize.body` (16): las
  etiquetas de los datos ("Remaining", "Next break in", "This week"), la
  etiqueta de estado del anillo, "of 12h shift limit", las horas y subtítulos
  de la línea de tiempo, los días y horas de la semana y el aviso de bloqueo.
  Donde el mockup usa dos tamaños para marcar jerarquía, la jerarquía pasa al
  peso (`fontFamily`) y al color, no a un tamaño menor. Los botones de acción
  miden `TOUCH_TARGET_MIN` (60) de alto o más.
- **Rationale**: FR-015 lo pide sin excepciones. Es la regla del conductor de
  `docs/CLAUDE_MOBILE.md` y la regla obligatoria de ergonomía del perfil, y E1
  tomó la misma decisión con las etiquetas de la tab bar.
- **Alternatives considered**: copiar los 10 a 12 px del mockup. Rompe FR-015
  y sería un hallazgo `Major` del code-reviewer.

## R10. "Start Day" y los botones según el estado

- **Decision**: `fatigueActionsFor(state)` devuelve qué botones mostrar:
  `off_duty` → Start Day; `working` → Take Break y End Day; `on_break` → End
  Break y End Day. "End Day" pasa por el `ConfirmDialog` de E1
  (`src/ui/confirm-dialog.tsx`) con "End your day?".
- **Rationale**: aclaración 1 y FR-004/FR-005. El diálogo ya existe, funciona
  en web y cumple los 60 px.
- **Alternatives considered**: `Alert.alert`. No hace nada en
  react-native-web (lo dice el propio `ConfirmDialog`).

## R11. Pruebas: msw en jest, `page.route` en Playwright, sin Maestro

- **Decision**: fixtures de fatiga en `src/test/fatigue-fixtures.ts` tipadas
  con `components["schemas"]`, y handlers felices en
  `src/test/server.ts` que cada test pisa con `server.use()`. En
  `tests/ui.spec.ts`, `page.route("**/fatigue/**")` responde con las mismas
  formas, y se agregan la captura de Fatigue en los dos viewports, el diálogo
  de End Day y axe. No hay flow de Maestro.
- **Rationale**: la épica no toca nada nativo (ni permisos, ni cámara, ni
  ubicación, ni la cola offline), así que el criterio de `CLAUDE.md` no pide
  Maestro. El tiempo de las pruebas se fija con los fake timers de jest para
  que "Next break in", "Due now" y el refresco por minuto sean
  deterministas.
- **Alternatives considered**: un flow de Maestro por la pantalla. No prueba
  nada que jest y Playwright no prueben ya.

## R12. Los mocks del dev build no suman fatiga

- **Decision**: `src/mocks` sigue respondiendo solo auth. En un dev build sin
  `EXPO_PUBLIC_API_URL`, Fatigue muestra su estado de error con "Try again".
- **Rationale**: `CLAUDE.md` define los mocks de desarrollo para que los flows
  de Maestro pasen el login; esta épica no agrega flows. Unos mocks de fatiga
  con estado serían código de producción sin un ticket que lo pida (YAGNI).
- **Alternatives considered**: handlers de fatiga en memoria. Quedan como
  sugerencia si una persona quiere probar la pantalla en el emulador sin back.
