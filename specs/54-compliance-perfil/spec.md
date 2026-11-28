# Feature Specification: Compliance, perfil y notificaciones

**Feature Branch**: `spec-54`

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: "E5: Compliance, perfil y notificaciones (la fila E5 de docs/plan-maestro.md)" (épica E5: "Compliance", "Profile" y "Notifications" de `docs/PROMPT_MOBILE.md`, mockups `13_driver_compliance` y `14_driver_profile`; Notifications no tiene mockup)

## Clarifications

### Session 2026-11-28

- Q: ¿Cuántos días antes del vencimiento un documento aprobado pasa a ámbar y pide atención? → A: 60 días. De 60 a 8 días es ámbar; con 7 días o menos, o vencido, es rojo.
- Q: ¿En E5 el conductor puede editar datos desde el perfil, o es solo lectura? → A: Solo lectura. Las filas no llevan flecha ni "Edit"; editar datos personales o el vehículo queda para una spec futura, cuando el contrato diga qué campos puede cambiar el conductor.
- Q: ¿Qué hace la sección "Preferences" del mockup si todavía no hay push ni GPS en background? → A: Se omite en E5. E2 agrega la fila "Background location" cuando exista el tracking, y la épica que traiga push agrega "Push notifications" (anotado en `docs/plan-maestro.md`).
- Q: ¿Un documento vencido o a 7 días o menos de vencer impide aceptar órdenes nuevas, como dato de la regla de E4? → A: Sí. La regla "puede aceptar órdenes" de E4 suma un motivo de compliance por cada documento en rojo, con su tipo. E5 no construye el botón "Accept"; E2 consume la regla.
- Q: Si el conductor sube la renovación de un documento en rojo y queda "Under review", ¿puede volver a aceptar órdenes antes de que la aprueben? → A: No. Sigue bloqueado hasta la aprobación; el motivo pasa a "<Tipo> under review" y el aviso de Home deja de pedir que suba el documento y solo informa la revisión.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver mis documentos y cuál pide atención (Priority: P1)

El conductor abre la pestaña Docs y ve todos sus documentos de compliance:
licencia, registro del vehículo, seguro de responsabilidad civil, registro del
tráiler y mercancías peligrosas, los que tenga. Cada tarjeta dice el tipo, la
fecha de vencimiento, cuánto falta y un estado con el color del semáforo. Los
que vencen pronto se destacan en ámbar con "Action needed", y arriba de la
lista un aviso dice cuántos documentos piden atención y hasta cuándo puede
renovar el más urgente sin quedar bloqueado.

**Why this priority**: un documento vencido deja al conductor sin poder tomar
órdenes nuevas. Ver a tiempo qué vence es lo que evita perder trabajo, y es la
base de las otras historias de compliance.

**Independent Test**: con un back simulado que devuelve documentos en
distintos estados y fechas, la pestaña Docs muestra una tarjeta por documento
con el estado, el color y el aviso que corresponden, sin tocar nada.

**Acceptance Scenarios**:

1. **Given** el conductor tiene documentos aprobados que vencen lejos, **When** abre la pestaña Docs, **Then** ve una tarjeta por documento con su nombre ("Driver Licence", "Vehicle Registration", "Public Liability", "Trailer Registration", "Dangerous Goods"), "Expires" con la fecha en Melbourne, el tiempo restante ("in 1y 10m", "in 6m") y la etiqueta "Valid" en verde.
2. **Given** un documento aprobado vence en 60 días o menos (y más de 7), **When** ve la lista, **Then** su tarjeta tiene borde ámbar, la etiqueta muestra los días que faltan ("32 days"), dice "Action needed" y ofrece "Upload renewed document".
3. **Given** un documento vence en 7 días o menos, o ya venció, **When** ve la lista, **Then** su tarjeta y su etiqueta están en rojo ("7 days", "Expired") y ofrece "Upload renewed document".
4. **Given** el último documento de un tipo está en revisión, **When** ve la lista, **Then** su tarjeta dice "Under review" en azul y no ofrece subir otro. Si el documento aprobado que reemplaza está en rojo, la tarjeta sigue mostrando su vencimiento ("Expired" o "<N> days") en rojo.
5. **Given** el último documento de un tipo fue rechazado, **When** ve la lista, **Then** su tarjeta dice "Rejected" en rojo, muestra el motivo del rechazo y ofrece "Upload again".
6. **Given** uno o más documentos piden atención, **When** abre la pestaña, **Then** arriba ve "N document(s) need(s) attention" con el más urgente: si está en ámbar, "<Tipo> expires in N days. Renew before <fecha> to avoid being blocked from new orders."; si está en rojo, "<Tipo> expires in N days. You can't accept new orders until it's renewed." (o "<Tipo> expired. ..."), porque en rojo el bloqueo ya rige.
7. **Given** ningún documento pide atención, **When** abre la pestaña, **Then** no hay aviso arriba.
8. **Given** la lista está abierta, **When** baja hasta el final, **Then** ve la tarjeta "How alerts work" que explica los avisos a 90, 60, 30, 14 y 7 días y que a 7 días no se aceptan órdenes nuevas.
9. **Given** el conductor no tiene ningún documento cargado, **When** abre la pestaña, **Then** ve un estado vacío que lo invita a agregar el primero.
10. **Given** los datos todavía no llegaron, **When** abre la pestaña, **Then** ve un esqueleto de carga; **Given** no hay red o el servidor falla, **Then** ve un error con "Try again" y la app no se cierra.
11. **Given** la pantalla está abierta, **When** vuelve a la pestaña o tira la lista hacia abajo, **Then** los documentos se actualizan.

---

### User Story 2 - Subir la renovación de un documento (Priority: P1)

Desde la tarjeta que pide atención, el conductor toca "Upload renewed
document". Elige sacar una foto del documento o tomar un archivo del teléfono
(PDF o imagen), escribe la fecha de emisión y la de vencimiento, y envía. El
documento nuevo aparece "Under review" hasta que el despachante lo aprueba.
Con el "+" de arriba puede agregar un documento de cualquier tipo, no solo
renovar.

**Why this priority**: ver que algo vence sin poder resolverlo desde la app
obliga a llamar a la oficina. Subir la renovación en el momento es lo que
cierra el problema.

**Independent Test**: con un back y un almacenamiento simulados, se elige un
archivo, se completan las fechas y se envía; la app pide la URL de subida,
sube el archivo, registra el documento y la lista lo muestra "Under review".

**Acceptance Scenarios**:

1. **Given** una tarjeta que pide atención, **When** el conductor toca "Upload renewed document", **Then** se abre el formulario con el tipo de ese documento ya elegido.
2. **Given** el formulario abierto, **When** elige "Take photo", **Then** la app explica por qué necesita la cámara antes de pedir el permiso, y al sacar la foto la muestra como vista previa.
3. **Given** el formulario abierto, **When** elige "Choose file", **Then** puede elegir un PDF, JPEG o PNG del teléfono, y la app muestra el nombre del archivo.
4. **Given** falta el archivo, la fecha de emisión o la de vencimiento, o el vencimiento no es posterior a la emisión, **When** toca "Submit", **Then** la app marca el campo con el problema y no envía nada.
5. **Given** el formulario completo, **When** toca "Submit", **Then** la app pide la URL de subida, sube el archivo directo al almacenamiento, registra el documento con el tipo, las fechas y el archivo, y vuelve a la lista con el documento "Under review".
6. **Given** el envío está en curso, **When** el conductor toca "Submit" otra vez, **Then** no se manda un segundo documento, y ve que la subida avanza.
7. **Given** la URL de subida venció antes de subir el archivo, **When** la app sube, **Then** pide una URL nueva y sigue, sin mostrar un error.
8. **Given** no hay red o falla algún paso, **When** se envía, **Then** la app dice que el documento no se subió, conserva lo cargado en el formulario y ofrece "Try again".
9. **Given** el conductor toca "+" arriba de la lista, **When** se abre el formulario, **Then** primero elige el tipo de documento entre los cinco del contrato.
10. **Given** el conductor negó el permiso de cámara, **When** elige "Take photo", **Then** la app explica cómo habilitarlo en los ajustes y le deja elegir un archivo en su lugar.

---

### User Story 3 - Enterarme desde Home de que algo vence, y no aceptar órdenes con un documento en rojo (Priority: P2)

Sin entrar a Docs, el conductor ve en Home un aviso cuando un documento pide
atención, y un punto en la pestaña Docs. Tocar el aviso lo lleva a Docs. Si un
documento está en rojo (7 días o menos, o vencido), la app sabe que no puede
aceptar órdenes nuevas hasta que la renovación esté aprobada, y lo dice.

**Why this priority**: el conductor pasa el día en Home. Si el aviso vive solo
en Docs, se entera tarde. Depende de la historia 1 para tener a dónde llevarlo.

**Independent Test**: con un back simulado que devuelve un documento por
vencer, Home muestra el aviso y la pestaña Docs el punto; con todos vigentes,
ninguno de los dos aparece. Con un documento vencido, la regla de "puede
aceptar" da "no" con su motivo.

**Acceptance Scenarios**:

1. **Given** un documento pide atención, **When** el conductor abre Home, **Then** ve un aviso ámbar "<Tipo> expires in N days. Renew now to avoid being blocked from new orders.". Si faltan 7 días o menos o ya venció, el aviso es rojo y dice "<Tipo> expires in N days. You can't accept new orders until it's renewed." (o "<Tipo> expired. ..."), porque en rojo el bloqueo ya rige.
2. **Given** varios documentos piden atención, **When** ve Home, **Then** el aviso nombra el más urgente y dice cuántos más hay.
3. **Given** el aviso en Home, **When** lo toca, **Then** va a la pestaña Docs.
4. **Given** algún documento pide atención, **When** ve la barra de pestañas, **Then** Docs tiene un punto ámbar, anunciado para lectores de pantalla.
5. **Given** ningún documento pide atención, o la lista de documentos no se pudo cargar, **When** ve Home, **Then** no hay aviso ni punto, y Home funciona igual.
6. **Given** el conductor subió la renovación de un documento ámbar y quedó "Under review", **When** vuelve a Home, **Then** ese documento ya no cuenta para el aviso. Si el documento estaba en rojo, el aviso deja de pedir que lo suba y dice "<Tipo> renewal under review. You can't accept new orders until it's approved."
7. **Given** un documento aprobado vence en 7 días o menos, o ya venció, **When** otra pantalla pregunta si el conductor puede aceptar órdenes, **Then** la regla de E4 da "no" con el motivo "<Tipo> expires in N days" o "<Tipo> expired".
8. **Given** el documento en rojo se renovó y la renovación quedó "Under review", **When** se consulta la regla, **Then** sigue dando "no", con el motivo "<Tipo> under review" en lugar del vencimiento.
9. **Given** la renovación se aprobó y el documento vigente tiene más de 7 días por delante, **When** se consulta la regla, **Then** el motivo de compliance desaparece (los de fatiga siguen igual).
10. **Given** la lista de documentos no se pudo cargar, **When** se consulta la regla, **Then** compliance no agrega motivos y la regla responde solo con la fatiga, como en E4.
11. **Given** la regla da "no" por compliance, **When** el conductor ve la pestaña Fatigue, **Then** el aviso "You can't accept new orders" de E4 incluye ese motivo junto a los de fatiga.

---

### User Story 4 - Ver mi perfil y cerrar sesión (Priority: P2)

El conductor abre la pestaña Profile y ve sus datos: nombre, clase de
licencia, ABN, cuántas entregas hizo en el último mes, desde cuándo trabaja
con TruckConnect, su email, teléfono y contacto de emergencia, y los datos de
su camión. Al final está "Log out".

**Why this priority**: es consulta, no operación diaria. Le sirve al
conductor para confirmar que la oficina tiene sus datos bien, y ya existe el
logout de E1.

**Independent Test**: con un back simulado que devuelve el usuario, las
estadísticas y el vehículo, la pestaña Profile muestra cada dato en su lugar;
"Log out" cierra la sesión como en E1.

**Acceptance Scenarios**:

1. **Given** el conductor abre Profile, **When** cargan los datos, **Then** ve un avatar con sus iniciales, su nombre, la clase de licencia ("Heavy Combination (HC)") y "ABN <número>" si lo tiene.
2. **Given** los datos cargados, **When** ve la fila de estadísticas, **Then** ve "Deliveries" con las órdenes del último mes, "Rating" con el marcador vacío del mockup (dos rayas largas) y "With us" con el tiempo desde que se creó su cuenta ("8mo", "1y 2mo").
3. **Given** los datos cargados, **When** ve "Personal info", **Then** ve Email, Phone y Emergency contact; si no hay contacto de emergencia, dice "Not set".
4. **Given** el conductor tiene un vehículo activo, **When** ve "Your vehicle", **Then** ve marca, modelo y año, la patente, el tipo ("Rigid" o "Semi-trailer"), la capacidad en pallets, el GVM en kg y la altura de carga en metros.
5. **Given** el conductor no tiene vehículo cargado, **When** ve la sección, **Then** dice "No vehicle on file".
6. **Given** falla alguna de las tres fuentes (usuario, estadísticas, vehículo), **When** ve la pantalla, **Then** solo esa sección muestra el error con "Try again"; el resto y "Log out" siguen disponibles.
7. **Given** la pantalla, **When** toca "Log out", **Then** se cierra la sesión como en E1 y vuelve al login.
8. **Given** la pantalla, **When** llega al final, **Then** ve "TruckConnect Driver · v<versión>" con la versión instalada.
9. **Given** la pantalla, **When** el conductor ve los datos personales y el vehículo, **Then** son solo de lectura: las filas no llevan flecha ni el botón "Edit" del mockup.

---

### User Story 5 - Leer mis notificaciones (Priority: P2)

En Home hay una campana con un punto rojo cuando hay notificaciones sin leer.
Al tocarla, el conductor ve la lista de notificaciones in-app, de la más nueva
a la más vieja, con las no leídas destacadas. Al tocar una queda leída, y con
"Mark all read" las marca todas.

**Why this priority**: el despachante y el sistema (avisos de vencimiento,
cambios de orden) le hablan al conductor por aquí. Sin push todavía (hueco 2
del plan maestro), la lista in-app es el único canal dentro de la app.

**Independent Test**: con un back simulado que devuelve notificaciones leídas
y no leídas, la campana muestra el punto, la lista las muestra en orden, y al
tocar una o "Mark all read" la app avisa al back y el punto desaparece cuando
no queda ninguna sin leer.

**Acceptance Scenarios**:

1. **Given** hay notificaciones sin leer, **When** el conductor ve Home, **Then** la campana tiene un punto rojo y su nombre accesible dice cuántas hay sin leer.
2. **Given** no hay notificaciones sin leer, **When** ve Home, **Then** la campana no tiene punto.
3. **Given** la campana, **When** la toca, **Then** abre "Notifications" con la lista de la más nueva a la más vieja: título, texto y hora en Melbourne ("9:41 AM" hoy, "Yesterday", o la fecha), con las no leídas destacadas.
4. **Given** una notificación sin leer, **When** la toca, **Then** queda marcada como leída en el back y deja de verse destacada.
5. **Given** hay notificaciones sin leer, **When** toca "Mark all read", **Then** todas quedan leídas y el punto de la campana desaparece.
6. **Given** hay más notificaciones de las que entran en una página, **When** llega al final de la lista, **Then** se cargan las siguientes.
7. **Given** no tiene ninguna notificación, **When** abre la lista, **Then** ve "You're all caught up".
8. **Given** marcar como leída falla, **When** pasa, **Then** la notificación vuelve a verse sin leer y la app avisa sin cerrarse.
9. **Given** la lista abierta, **When** tira hacia abajo, **Then** se actualiza; **Given** Home visible, **When** pasa un minuto o vuelve a la app, **Then** el punto de la campana se actualiza.

---

### Edge Cases

- **Varias versiones del mismo tipo**: el back puede devolver el documento
  vencido y su renovación. La lista muestra una tarjeta por tipo, con el
  documento más reciente; si ese está en revisión o rechazado, la tarjeta lo
  dice.
- **Medianoche y zona horaria**: los días que faltan y las fechas se cuentan
  en `Australia/Melbourne`, no en UTC. Un documento que vence hoy cuenta como
  0 días y rojo.
- **El documento vence mientras la app está abierta**: al volver a la
  pestaña o tirar hacia abajo, la tarjeta pasa a "Expired".
- **Archivo rechazado por el back** (tipo o tamaño): la app muestra el mensaje
  del back y conserva el formulario.
- **Sesión vencida durante la subida**: la sesión se renueva como en el resto
  de la app (E1) y la subida sigue; si no se puede renovar, el conductor vuelve
  al login.
- **Notificación con texto largo**: la lista no la corta a una línea; el texto
  se lee completo.
- **El back no devuelve campos opcionales** (ABN, clase de licencia, marca,
  año del vehículo): la fila se omite o dice "Not set"; nunca "null" ni
  "undefined".
- **Más de un vehículo activo**: "Your vehicle" muestra uno por tarjeta.

## Requirements _(mandatory)_

### Functional Requirements

**Compliance**

- **FR-001**: La pestaña Docs MUST listar los documentos de compliance del conductor, una tarjeta por tipo con el documento más reciente, siguiendo el mockup 13.
- **FR-002**: Cada tarjeta MUST mostrar el nombre del tipo en inglés, la fecha de vencimiento en Melbourne, el tiempo restante y un estado: "Valid" (verde), "<N> days" (ámbar, de 60 a 8 días), "<N> days" o "Expired" (rojo, 7 días o menos, o vencido), "Under review" (azul) o "Rejected" (rojo, con el motivo).
- **FR-003**: Un documento MUST "pedir atención" cuando está aprobado y le quedan 60 días o menos, cuando venció o cuando fue rechazado. Un documento en revisión no pide atención, salvo que el aprobado al que reemplaza esté en rojo: en ese caso el aviso solo informa la revisión.
- **FR-004**: Las tarjetas que piden atención MUST ofrecer subir el reemplazo ("Upload renewed document", o "Upload again" si fue rechazado).
- **FR-005**: Con al menos un documento que pide atención, la pantalla MUST mostrar arriba el aviso con la cantidad y el más urgente (el de menos días).
- **FR-006**: La pantalla MUST mostrar la tarjeta "How alerts work" con el esquema 90/60/30/14/7 días.
- **FR-007**: El "+" del encabezado MUST abrir el formulario de documento nuevo, con el tipo a elegir entre los cinco del contrato.
- **FR-008**: El formulario MUST pedir el tipo, la fecha de emisión, la fecha de vencimiento (posterior a la emisión) y un archivo PDF, JPEG o PNG, tomado con la cámara o elegido del teléfono.
- **FR-009**: La subida MUST seguir tres pasos: pedir la URL de subida, subir el archivo directo al almacenamiento sin el token de sesión, y registrar el documento en el back. Si la URL venció, MUST pedir otra en lugar de fallar.
- **FR-010**: Una subida en curso MUST impedir un segundo envío y mostrar que avanza.
- **FR-011**: Si la subida falla, la app MUST decir que el documento no se subió, conservar lo cargado y ofrecer reintentar. La subida MUST NOT encolarse sin conexión.
- **FR-012**: La cámara MUST pedirse en contexto, con una explicación antes del permiso del sistema; si se niega, la app MUST ofrecer elegir un archivo.
- **FR-013**: Home MUST mostrar un aviso cuando algún documento pide atención, con el más urgente y la cantidad de los demás; tocarlo MUST llevar a Docs.
- **FR-014**: La pestaña Docs de la barra MUST mostrar un punto ámbar cuando algún documento pide atención, con una etiqueta accesible que lo diga.
- **FR-015**: Si la lista de documentos no carga, Home y la barra MUST NOT mostrar aviso ni punto, y MUST NOT romperse.

**Perfil**

- **FR-016**: La pestaña Profile MUST mostrar las iniciales, el nombre, la clase de licencia con su nombre largo y el ABN del conductor, siguiendo el mockup 14.
- **FR-017**: La fila de estadísticas MUST mostrar "Deliveries" (órdenes del último mes según el back), "Rating" con el marcador vacío del mockup (dos rayas largas) y "With us" (tiempo desde la creación de la cuenta).
- **FR-018**: "Personal info" MUST mostrar Email, Phone y Emergency contact.
- **FR-019**: "Your vehicle" MUST mostrar los vehículos activos del conductor con marca, modelo, año, patente, tipo, capacidad en pallets, GVM y altura de carga.
- **FR-020**: El perfil MUST ser solo de lectura (ni los datos personales ni el vehículo se editan en E5) y MUST NOT mostrar la sección "Preferences" del mockup.
- **FR-021**: La pantalla MUST mantener "Log out" de E1 al final y mostrar la versión instalada.
- **FR-022**: Cada sección del perfil (usuario, estadísticas, vehículo) MUST tener su propio estado de carga y de error con reintento.

**Notificaciones**

- **FR-023**: Home MUST mostrar una campana que abre la lista de notificaciones, con un punto rojo cuando hay notificaciones sin leer.
- **FR-024**: La lista MUST mostrar las notificaciones del conductor de la más nueva a la más vieja, con título, texto y hora en Melbourne, destacando las no leídas, y cargar más páginas al llegar al final.
- **FR-025**: Tocar una notificación sin leer MUST marcarla como leída; "Mark all read" MUST marcarlas todas. Si falla, la notificación MUST volver a verse sin leer y la app MUST avisar.
- **FR-026**: La lista MUST tener estado de carga, vacío ("You're all caught up") y error con reintento.
- **FR-027**: El punto de la campana MUST actualizarse al volver a la app, al cerrar la lista y cada minuto mientras Home está visible.

**Comunes**

- **FR-028**: Las fechas MUST mostrarse en `Australia/Melbourne`.
- **FR-029**: Los botones y filas tocables MUST medir al menos 60 px de alto y todo el texto MUST ser de 16 pt o más, también donde el mockup lo dibuja más chico (como en E1 y E4).
- **FR-030**: Las pantallas MUST usar solo los endpoints y campos de `docs/openapi.json`. Lo que el mockup muestra y el contrato no tiene se omite.
- **FR-031**: Los datos MUST refrescarse al volver a la pestaña y al tirar hacia abajo.

**Habilitación para aceptar órdenes**

- **FR-032**: La regla "puede aceptar órdenes nuevas" de E4 MUST sumar un motivo por cada documento aprobado que vence en 7 días o menos, o que venció ("<Tipo> expires in N days", "<Tipo> expired"). Lo que cuenta es el documento aprobado vigente de cada tipo: una renovación en revisión no lo reemplaza, y el motivo pasa a "<Tipo> under review" hasta que la aprueben. Un documento rechazado no suma motivo propio. Si los documentos no cargan, la regla MUST responder solo con la fatiga.

### Key Entities _(include if feature involves data)_

- **Documento de compliance**: tipo (licencia, registro del vehículo, responsabilidad civil, registro del tráiler, mercancías peligrosas), estado en el back (en revisión, aprobado, rechazado, vencido), fecha de emisión, fecha de vencimiento, motivo de rechazo y archivo.
- **Estado de atención**: derivado en la app de cada documento: vigente, por vencer, urgente (7 días o menos), vencido, en revisión o rechazado, con los días que faltan.
- **Subida de documento**: tipo, fechas, archivo elegido (tipo y tamaño) y la URL de subida con su vencimiento de 15 minutos.
- **Perfil del conductor**: nombre, email, teléfono, ABN, clase y número de licencia, contacto de emergencia y fecha de alta.
- **Estadísticas**: órdenes y horas de un período (semana actual, semana anterior o mes).
- **Vehículo**: tipo (rígido o semi), patente, marca, modelo, año, capacidad en pallets, GVM y medidas de carga.
- **Habilitación para aceptar** (de E4): suma los motivos de compliance a los de fatiga.
- **Notificación**: título, texto, tipo, canal, leída o no, hora de envío y datos extra.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El conductor sabe si algún documento pide atención en menos de 3 segundos desde que abre Home, sin entrar a Docs.
- **SC-002**: Subir la renovación de un documento desde su tarjeta lleva menos de 2 minutos, contando la foto y las dos fechas.
- **SC-003**: El estado y el color de cada tarjeta son los correctos en el 100 % de los casos de prueba: vigente, por vencer, urgente, vencido, en revisión y rechazado.
- **SC-004**: Ningún documento se registra dos veces por un doble toque, y ninguna subida fallida se informa como exitosa.
- **SC-005**: Marcar una notificación como leída cuesta un toque, y marcarlas todas, otro.
- **SC-006**: Ninguna falla de red o del servidor cierra la app ni deja una pantalla en blanco: siempre hay un mensaje con reintento.

## Assumptions

- **Depende de E1**: la sesión, el cliente de la API, la barra de pestañas y "Log out" ya existen.
- **Home todavía es un lugar vacío**: E2 construye "Your day". E5 pone en Home la campana y el aviso de compliance; E2 arma el resto alrededor.
- **El helper de subidas nace acá**: el plan maestro dice que nace en la primera épica que sube un archivo, y E5 va antes que E2. POD (E3) e incidentes (E6) lo reusan.
- **Sin cola offline para compliance**: la cola nace en E2, y renovar un documento no es una tarea que se haga sin señal. Sin red, la subida falla con reintento.
- **Lo que el mockup 13 tiene y el contrato no**: los subtítulos de cada tarjeta ("Volvo FH · XYZ 847", "$20M coverage · Allianz") y la tarjeta "ABN Verification" no existen en el contrato y no se muestran. Docs es una pestaña, así que el encabezado no lleva la flecha de volver.
- **Lo que el mockup 14 tiene y el contrato no**: "Senior Driver" se reemplaza por la clase de licencia, "Home base" se omite, y el lápiz del avatar se omite porque no hay foto de perfil.
- **Sin edición en E5**: el contrato permite que el conductor edite parte de sus datos ("self limited") pero no dice qué campos. Editar queda para una spec futura.
- **Soporte**: "Help center" y "Contact dispatcher" se omiten hasta que haya un número o una URL donde apuntar; el contrato no los tiene.
- **Preferences fuera de E5**: la fila "Background location" la agrega E2 y "Push notifications" la épica que traiga push; las dos quedan anotadas en `docs/plan-maestro.md`.
- **Idioma**: el toggle de idioma queda fuera hasta que haya un segundo idioma (plan maestro).
- **"Deliveries"** usa el período "month" de las estadísticas del conductor, porque el contrato no tiene un total histórico.
- **El vehículo** sale de la lista de vehículos propios del conductor (solo los activos).
- **El contacto de emergencia** es un objeto libre en el contrato; la app muestra su nombre y teléfono si vienen con esas claves, y "Not set" si no hay.
- **Tamaño máximo del archivo**: el contrato no lo fija. La app manda el tamaño y muestra el error del back si lo rechaza.
- **Push fuera de alcance**: no hay endpoint para registrar el token (hueco 2 del plan maestro). E5 hace solo las notificaciones in-app.
- **El bloqueo de "Accept"** se aplica en el detalle de orden de E2, igual que el de fatiga. Si el back también rechaza la aceptación, la app solo avisa antes. Un documento rechazado no bloquea desde la app, porque el contrato no dice si el back lo hace.
- **Tocar una notificación de una orden** solo la marca como leída: el detalle de orden llega en E2, que suma la navegación.
- **Lo nativo** (cámara, selector de archivos) tiene un stub web para Playwright y su flujo en `.maestro/`; el PR avisa que una persona corre `pnpm e2e:android`.
