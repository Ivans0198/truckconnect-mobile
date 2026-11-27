# Research: Compliance, perfil y notificaciones

Decisiones técnicas del plan de [spec.md](./spec.md). Cada una dice qué se
eligió, por qué y qué se descartó. Las que E4 ya tomó (refresco por foco con
`focusManager`, formateador de Melbourne sin librería, una query por sección)
se reusan y no se repiten acá.

## R1. Una query por fuente, con el prefijo de su dominio

- **Decision**: cada lectura es su propia query de TanStack Query, con la key
  como `const` array junto a su hook:
  - `["compliance", "documents"]`: `GET /compliance/documents` con
    `page: 1, limit: 100`.
  - El usuario: la cuenta de E1 (`useCurrentAccount`, key `["auth", "me"]`).
    `GET /auth/me` devuelve el mismo `UserResponseDto` que `GET /users/me`, y
    ya está en caché (y guardada para arrancar sin red). No se pide dos veces.
  - `["profile", "stats", "month"]`: `GET /drivers/{id}/stats` con
    `period: "month"`; el `id` sale de la cuenta de E1 (`useCurrentAccount`).
  - `["profile", "vehicles"]`: `GET /vehicles` con `page: 1, limit: 100`,
    filtrando `isActive` en la app.
  - `["notifications", "list"]`: `GET /notifications`, infinita (R9).
  - `["notifications", "unread-count"]`: `GET /notifications` con
    `unread: true, limit: 1`; se lee `total`.
- **Rationale**: la spec pide un error propio por sección del perfil (FR-022)
  y que Home y la barra sigan funcionando si los documentos no cargan
  (FR-015). Con una query por fuente, una falla no tapa a las otras. Cinco
  conductores tienen pocos documentos y uno o dos vehículos: 100 por página
  alcanza sin paginar. Si `totalPages` pasa de 1, la query lanza un error con
  nombre en lugar de mostrar una lista incompleta.
- **Alternatives considered**: `GET /drivers/{id}` trae vehículo, alertas de
  compliance y estadísticas de la semana en una respuesta. Se descartó porque
  el contrato no dice si el conductor puede pedirse a sí mismo (los otros
  `/drivers/{id}/*` dicen "admin/self"; este no), y porque sus alertas no
  distinguen una renovación en revisión.

## R2. El estado de atención es una función pura

- **Decision**: `src/compliance/attention.ts` exporta
  `summarizeDocuments(documents, now)`. Agrupa por `docType` y, por cada tipo,
  devuelve una `DocumentCard` ([data-model.md](./data-model.md)): el documento
  más reciente por `createdAt` (lo que muestra la tarjeta), el aprobado
  vigente (el `APPROVED` o `EXPIRED` más reciente, que es lo que cuenta para
  bloquear) y un `Attention` como unión discriminada: `valid`, `expiring`
  (ámbar), `urgent` (rojo, 7 días o menos), `expired`, `under-review` y
  `rejected`. Los días se cuentan entre fechas de calendario de Melbourne
  (`melbourneCalendarDate` de E4), así que vencer hoy es 0. Los umbrales son
  constantes con nombre: `ATTENTION_FROM_DAYS = 60`, `URGENT_FROM_DAYS = 7`.
  También devuelve el más urgente y la cantidad, para el aviso de arriba, el
  de Home y el punto de la barra.
- **Rationale**: tres pantallas (Docs, Home, la barra) y la regla de aceptar
  leen lo mismo. Una sola función pura con `now` como parámetro se prueba con
  tablas de casos (SC-003) y no se desincroniza.
- **Alternatives considered**: usar el `status` del back tal cual. No alcanza:
  el back no marca "por vencer", y un `EXPIRED` puede tener una renovación
  en revisión detrás.

## R3. La regla de aceptar suma motivos de compliance

- **Decision**: `AcceptanceBlockReason` de E4 pasa de una unión de strings a
  una unión discriminada: los tres motivos de fatiga quedan como
  `{ kind: "daily-limit" }` y similares, y se suma
  `{ kind: "compliance"; docType; state: "expiring" | "expired" | "under-review"; days }`.
  `evaluateOrderAcceptance` recibe además `compliance: DocumentCard[] | undefined`.
  Con `undefined` (no cargó) no agrega motivos. `ACCEPTANCE_BLOCK_MESSAGES`
  se reemplaza por `describeBlockReason(reason)`, que arma "Public Liability
  expires in 5 days", "Driver Licence expired" o "Public Liability under
  review". `useOrderAcceptance()` conserva su firma y lee también la query de
  documentos. El aviso de Fatigue (`acceptance-banner.tsx`) usa
  `describeBlockReason`.
- **Rationale**: FR-032 y la decisión de E4 de que E2 consuma una sola regla.
  Mover la regla de carpeta rompería los imports de E4 sin ganar nada; queda
  en `src/fatigue/order-acceptance.ts` y el contrato
  ([contracts/order-acceptance.md](./contracts/order-acceptance.md)) dice qué
  cambia.
- **Alternatives considered**: una segunda regla solo de compliance. Se
  descartó: E2 tendría que combinar dos respuestas y los motivos podrían
  mostrarse en dos avisos distintos.

## R4. El helper de subidas nace en `src/uploads/`

- **Decision**: `uploadWithPresignedUrl({ requestUrl, file })` hace los dos
  primeros pasos y devuelve el `fileKey`: pide la URL con la función que le
  pasan (cada dominio tiene su endpoint: compliance hoy, POD e incidentes
  después), hace `PUT` de los bytes sin `Authorization`, con
  `Content-Type` igual al `mimeType`. Si la URL venció antes del `PUT`
  (comparando contra `expiresInSeconds` desde que se pidió) o el `PUT`
  responde 403, pide otra y reintenta una vez. El tercer paso, registrar, lo
  hace el dominio. Las fallas salen como `UploadError` con `stage`
  (`request-url`, `put`, `register`) y `kind` (`offline`, `rejected`,
  `server`).
- **Rationale**: el plan maestro lo pide en la primera épica que suba un
  archivo, y E5 va antes que E2. Pasarle la función que pide la URL deja que
  POD e incidentes lo usen sin tocarlo.
- **Alternatives considered**: un helper solo para compliance. Se descartó: el
  plan maestro pide uno compartido, y la lógica de reintento es la parte que
  vale la pena no repetir.

## R5. Los bytes del archivo: `expo-file-system`

- **Decision**: en Android, el archivo elegido se abre con `File` de
  `expo-file-system` (API de SDK 54 en adelante). Ese objeto es un `Blob`, da
  el tamaño (`fileSizeBytes`) y se manda como `body` del `PUT` con
  `expo/fetch`. En web, `src/uploads/read-file.web.ts` hace `fetch(uri)` y
  `.blob()`. En jest se usa la versión web con un `Blob` de Node.
- **Rationale**: es la forma documentada en SDK 58 de subir un archivo local
  con `fetch` sin pasarlo a base64. El selector de imágenes no siempre trae el
  tamaño, y `File` lo da siempre.
- **Alternatives considered**: `FileSystem.uploadAsync` (API legacy, sin
  manejo uniforme de errores) y leer en base64 (duplica la memoria con fotos
  de varios MB).
- **Dependency**: `expo-file-system`, con `pnpm exec expo install`.

## R6. Foto y archivo: `expo-image-picker` y `expo-document-picker`

- **Decision**: "Take photo" usa `launchCameraAsync` de `expo-image-picker`
  (la cámara del sistema), después de una pantalla propia que explica el
  permiso y llama a `requestCameraPermissionsAsync`. "Choose file" usa
  `getDocumentAsync` de `expo-document-picker` con
  `type: ["application/pdf", "image/jpeg", "image/png"]`. Un archivo con otro
  tipo se rechaza en la app antes de pedir la URL. Los dos se envuelven en
  `src/compliance/pick-file.ts`, que devuelve un `PickedFile` (uri, nombre,
  `mimeType`) o `cancelled`, y ese módulo es el único que se reemplaza con
  `jest.mock` en las pruebas de pantalla.
- **Rationale**: un documento se fotografía con la cámara normal; no necesita
  el visor propio con guías que POD va a armar con `expo-camera`. Los dos
  paquetes funcionan en web (abren el selector del navegador), así que no
  hace falta un stub para Playwright.
- **Alternatives considered**: `expo-camera` con visor propio. Es más trabajo
  y la spec no pide guías para documentos; E3 lo trae para el POD.
- **Dependencies**: `expo-image-picker` (con su config plugin en `app.json`
  y el texto del permiso de cámara) y `expo-document-picker`, con
  `pnpm exec expo install`. Cambian el nativo: hace falta un dev build nuevo
  (`pnpm android`).

## R7. Las fechas del formulario: `@react-native-community/datetimepicker`

- **Decision**: `src/ui/date-field.tsx` es un botón de 60 px que muestra la
  fecha elegida ("17 Jun 2026") o "Select date", y al tocarlo abre el diálogo
  nativo de Android con `DateTimePickerAndroid.open`. En web,
  `date-field.web.tsx` usa un campo de texto con `type="date"`. El valor es
  una fecha de calendario `YYYY-MM-DD`, que es lo que el back recibe en
  `issueDate` y `expiryDate`.
- **Rationale**: escribir una fecha a mano con el teclado es lento y propenso
  a errores (formato día/mes). El diálogo de Android es grande y conocido.
- **Alternatives considered**: el `DateTimePicker` de `@expo/ui`. Se
  descartó porque no tiene web (Playwright y el ui-reviewer no verían el
  formulario) y su estilo Compose no sigue los tokens del proyecto.
- **Dependency**: `@react-native-community/datetimepicker`, con
  `pnpm exec expo install`.

## R8. Rutas: Docs, el formulario y Notifications

- **Decision**: `app/(tabs)/docs.tsx` compone `ComplianceScreen`.
  `app/documents/new.tsx` es el formulario, presentado como modal sobre las
  pestañas, con `type` opcional en la query (`/documents/new?type=PUBLIC_LIABILITY`):
  con tipo, viene elegido; sin tipo, se elige primero.
  `app/notifications.tsx` es una pantalla de stack con flecha de volver. Las
  dos van dentro del `Stack.Protected` de la sesión en `app/_layout.tsx`.
- **Rationale**: el formulario y las notificaciones no son pestañas; abrirlas
  sobre la barra deja volver con atrás. Las rutas tipadas de Expo Router
  validan el parámetro.
- **Alternatives considered**: un bottom sheet para el formulario. Con el
  teclado, el diálogo de fecha y el permiso de cámara, una pantalla completa
  es más simple y más estable.

## R9. Notificaciones: lista infinita y lectura optimista

- **Decision**: la lista es `useInfiniteQuery` con 20 por página, en una
  `FlatList` con `onEndReached`. Tocar una no leída llama a
  `PATCH /notifications/{id}/read` con actualización optimista; si falla, se
  restaura y aparece un aviso. "Mark all read" llama a
  `PATCH /notifications/read-all` y después invalida las dos keys de
  notificaciones. El contador de no leídas refresca al volver a la app, al
  cerrar la lista (invalidación) y cada minuto mientras Home está enfocada,
  con el mismo mecanismo de E4 (R2 de su research).
- **Rationale**: FR-024, FR-025 y FR-027. Lo optimista hace que el toque se
  sienta inmediato y la reversión cumple el escenario 8.
- **Alternatives considered**: guardar las leídas en un store local. El
  perfil prohíbe copiar estado del servidor fuera de Query.

## R10. Home: la campana y el aviso, nada más

- **Decision**: `app/(tabs)/index.tsx` compone `HomeHeader` (título y
  campana) y `ComplianceBanner`. El aviso usa `summarizeDocuments` y lleva a
  Docs con `router.navigate("/docs")`. Sin documentos que pidan atención, o
  si la query falla, no se dibuja nada.
- **Rationale**: Home es un lugar vacío hasta E2 (supuesto de la spec). Dejar
  la campana y el aviso como componentes sueltos le permite a E2 armar "Your
  day" alrededor sin moverlos.

## R11. El punto de la pestaña Docs

- **Decision**: `TabBar` de E1 lee `options.tabBarBadge` del descriptor. Si
  es `true`, dibuja un punto ámbar (`semantic.warning`) sobre el ícono y suma
  ", needs attention" al nombre accesible de la pestaña. `app/(tabs)/_layout.tsx`
  calcula el valor con `useComplianceAttention()` y lo pasa en las opciones
  de `docs`.
- **Rationale**: FR-014. Es la opción que Expo Router ya trae para la barra;
  la barra propia solo tiene que respetarla.

## R12. Perfil: datos derivados y versión

- **Decision**: `src/profile/` tiene funciones puras para las iniciales, el
  nombre largo de la licencia (`HR` → "Heavy Rigid", `HC` → "Heavy
  Combination", `MC` → "Multi Combination"), el contacto de emergencia (lee
  `name` y `phone` si son strings) y "With us" (`formatTenure(createdAt, now)`
  en `src/format/`: "3mo", "1y 2mo"; menos de un mes es "New"). La versión
  sale de `Constants.expoConfig?.version` de `expo-constants`, ya instalado.
- **Rationale**: todo lo derivado se prueba sin renderizar. `expo-constants`
  ya está y lee la versión de `app.json`.
- **Alternatives considered**: `expo-application` (versión nativa). Sería una
  dependencia nueva para el mismo número.

## R13. Fechas de documentos y tiempo restante

- **Decision**: `src/format/time.ts` suma `formatMelbourneDate` ("14 Mar
  2028", "17 Jun 2026"), `formatTimeLeft(days)` ("in 1y 10m", "in 6m", "in 32
  days") y `formatNotificationTime(createdAt, now)` ("9:41 AM", "Yesterday",
  "12 Nov"). Todo con `Intl` y la zona de Melbourne, como E4.
- **Rationale**: el perfil pide un solo formateador compartido para las
  horas.

## R14. Pruebas

- **Decision**:
  - **jest**: fixtures tipadas en `src/test/compliance-fixtures.ts`,
    `profile-fixtures.ts` y `notification-fixtures.ts`. `src/test/server.ts`
    suma handlers felices para las nuevas lecturas (documentos vacíos, cero
    no leídas) porque Home y la barra las piden y una request sin handler
    hace fallar el test. El `PUT` de subida va a `https://uploads.test/...`,
    también con msw. `pick-file.ts` y `pick-date` se reemplazan con
    `jest.mock`: son el borde con el sistema, no lógica propia. Fake timers
    para el refresco por minuto y para la URL vencida.
  - **Playwright**: `page.route` para `/compliance/**`,
    `/drivers/*/stats`, `/vehicles**` y `/notifications**`. Capturas nuevas
    de Docs (vigentes, con atención, vacío, error), el formulario, Profile,
    Notifications y Home con aviso y campana, en los dos viewports, y axe en
    cada una. Cambian las capturas existentes de `home` y `profile`: el PR
    de cada historia lo dice.
  - **Maestro**: `.maestro/compliance-upload.yaml`: entra con el conductor de
    prueba, abre Docs, toca "Upload renewed document", elige "Take photo",
    ve la explicación del permiso, lo concede y llega a la cámara del
    sistema. Lo corre una persona con `pnpm e2e:android`.
- **Rationale**: la cámara, el selector de archivos y el permiso son nativos;
  `CLAUDE.md` pide su flow.

## R15. Los mocks del dev build suman E5

- **Decision**: `src/mocks/` suma handlers sin msw para las lecturas y
  escrituras de E5: documentos en memoria (uno por vencer, para que el flow
  de Maestro tenga a qué renovar), perfil, estadísticas, un vehículo,
  notificaciones, y la URL de subida apuntando a
  `${baseUrl}/__dev-uploads/<fileKey>`, que el mismo fetch simulado acepta.
  Siguen cargándose solo en un dev build sin `EXPO_PUBLIC_API_URL`.
- **Rationale**: el flow de Maestro de R14 necesita una tarjeta que pida
  atención sin back. En E4 no se sumaron porque no había flow; acá sí.
- **Alternatives considered**: un flow que solo abra el formulario con "+".
  No probaría la tarjeta ámbar ni el camino desde ella.
