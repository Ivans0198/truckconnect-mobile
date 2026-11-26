# Feature Specification: Fatiga HVNL

**Feature Branch**: `spec-26`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "E4 Fatiga HVNL, del plan maestro. Ya decidí el orden: primero las épicas que no necesitan cambios en el back (E4 y E5); E2 y las que dependen de ella van al final." (épica E4 de `docs/plan-maestro.md`: "Fatigue" de `docs/PROMPT_MOBILE.md`, mockup `12_driver_fatigue`)

## Clarifications

### Session 2026-11-27

- Q: Si el conductor está fuera de turno, ¿la pantalla de fatiga le muestra un botón "Start Day"? → A: Sí. Fuera de turno, Fatigue muestra un "Start Day" grande en lugar de "Take Break" / "End Day". Home suma el suyo en E2, contra el mismo endpoint.
- Q: Sin conexión, ¿la app guarda la acción de fatiga para mandarla después o avisa que no se pudo y deja reintentar? → A: No se encola. Sin red, la app avisa que la acción no quedó registrada, ofrece "Try again" y el estado no cambia.
- Q: ¿Qué cuenta como "exceder las horas" para que la app diga que el conductor no puede aceptar órdenes nuevas? → A: Sin horas restantes en el día (12 h), sin horas restantes en la semana (72 h) o con el break vencido (pasó la hora del próximo break requerido).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver cuánto llevo trabajado hoy (Priority: P1)

El conductor abre la pestaña Fatigue y ve, de un vistazo y sin leer, si está
dentro de sus horas. Un anillo grande muestra las horas trabajadas del día
sobre el límite de 12 h, con el color del semáforo. Debajo, tres datos: lo que
le queda del día, cuánto falta para el próximo break y cuántas horas lleva en
la semana sobre 72 h. Arriba del número dice si está trabajando, en break o
fuera de turno.

**Why this priority**: es la razón legal de la pantalla. Sin este dato el
conductor no sabe si está cumpliendo la HVNL, y nada de lo demás tiene
contexto.

**Independent Test**: con un back simulado que devuelve un estado de fatiga y
un resumen semanal, la pestaña muestra las horas, el color y los tres datos
que corresponden, sin tocar nada.

**Acceptance Scenarios**:

1. **Given** el conductor está trabajando con 5 h 30 min en el día, **When** abre la pestaña Fatigue, **Then** ve "Working", "5h 30m", "of 12h shift limit", el anillo lleno en la proporción 5,5/12 y en verde.
2. **Given** lleva entre 9 h y 11 h trabajadas, **When** ve la pantalla, **Then** el anillo y la etiqueta de estado están en ámbar.
3. **Given** lleva más de 11 h trabajadas, **When** ve la pantalla, **Then** el anillo y la etiqueta de estado están en rojo.
4. **Given** el estado trae horas restantes del día, próximo break y el resumen semanal, **When** ve la pantalla, **Then** "Remaining" muestra las horas restantes, "Next break in" el tiempo hasta el próximo break y "This week" las horas de la semana sobre 72 h (por ejemplo "28h / 72h").
5. **Given** el conductor está en break, **When** ve la pantalla, **Then** la etiqueta dice "On break" y "Next break in" no muestra una cuenta regresiva.
6. **Given** el conductor está fuera de turno, **When** ve la pantalla, **Then** la etiqueta dice "Off duty" y el anillo muestra las horas que trabajó hoy, o 0 si no empezó.
7. **Given** el break ya está vencido (la hora del próximo break pasó), **When** ve la pantalla, **Then** "Next break in" dice "Due now" en rojo.
8. **Given** los datos todavía no llegaron, **When** abre la pestaña, **Then** ve un esqueleto de carga en lugar de números en cero.
9. **Given** no hay conexión o el servidor falla, **When** abre la pestaña, **Then** ve un mensaje de error con "Try again", y la app no se cierra.
10. **Given** la pantalla está abierta, **When** pasa un minuto, vuelve a la pestaña o tira la lista hacia abajo, **Then** los datos se actualizan solos.

---

### User Story 2 - Empezar el día, tomar un break y terminar el día (Priority: P1)

Al llegar al camión, el conductor toca "Start Day". Con el camión detenido, toca "Take Break" y la app registra el
inicio del break. Al volver, toca "End Break". Al final de la jornada toca
"End Day", confirma, y su día queda cerrado. Los botones son grandes y no
piden más de un toque, salvo la confirmación de terminar el día.

**Why this priority**: registrar breaks y el fin del día es lo que vuelve
legal la jornada. Ver las horas sin poder registrar los breaks deja al
conductor con el registro en papel.

**Independent Test**: con un back simulado, un conductor trabajando toma un
break, lo termina y cierra el día; después de cada toque la pantalla muestra
el estado que devolvió el back.

**Acceptance Scenarios**:

1. **Given** el conductor está trabajando, **When** ve la pantalla, **Then** ve "Take Break" y "End Day".
2. **Given** el conductor está trabajando, **When** toca "Take Break", **Then** la app registra el inicio del break y la pantalla pasa a "On break" con el botón "End Break" en lugar de "Take Break".
3. **Given** el conductor está en break, **When** toca "End Break", **Then** la app registra el fin del break y la pantalla vuelve a "Working".
4. **Given** el conductor está trabajando o en break, **When** toca "End Day", **Then** ve una confirmación ("End your day?") antes de registrar nada.
5. **Given** la confirmación de fin de día, **When** confirma, **Then** la app registra el fin del día y la pantalla pasa a "Off duty"; **When** cancela, **Then** no se registra nada.
6. **Given** el conductor tocó un botón, **When** la respuesta todavía no llegó, **Then** el botón muestra que está trabajando y no acepta un segundo toque.
7. **Given** el servicio rechaza la acción (por ejemplo, el estado cambió desde otro lugar), **When** llega el rechazo, **Then** el conductor ve el motivo y la pantalla se actualiza con el estado real.
8. **Given** el servicio responde que hubo demasiados intentos, **When** llega la respuesta, **Then** ve "Too many attempts, try again in a moment".
9. **Given** el conductor está fuera de turno, **When** ve la pantalla, **Then** ve un botón grande "Start Day" en lugar de "Take Break" y "End Day".
10. **Given** el conductor está fuera de turno, **When** toca "Start Day", **Then** la app registra el inicio del día y la pantalla pasa a "Working" con "Take Break" y "End Day".
11. **Given** no hay conexión, **When** toca una de las acciones, **Then** la acción no se guarda para después: ve "No connection. Your break was not recorded" (o el equivalente de la acción: day start, break end, day end) con "Try again", y la pantalla sigue en el estado anterior.

---

### User Story 3 - Ver los eventos de hoy (Priority: P2)

Debajo de los botones, el conductor ve la lista de lo que registró hoy: a qué
hora empezó el día, cada break con su duración, cada regreso al trabajo y el
fin del día. Le sirve para revisar su jornada y para responder si un
inspector le pregunta.

**Why this priority**: la HVNL pide poder mostrar la jornada, pero el anillo y
los botones ya cubren la operación diaria.

**Independent Test**: con un back simulado que devuelve los eventos del día,
la lista muestra cada evento con su nombre y su hora en hora de Melbourne, en
orden.

**Acceptance Scenarios**:

1. **Given** el conductor registró eventos hoy, **When** ve la pantalla, **Then** ve "Today's events" con la cantidad ("5 events") y un renglón por evento, del más viejo al más nuevo.
2. **Given** un inicio de día, un inicio de break, un fin de break y un fin de día, **When** se muestran, **Then** dicen "Day started", "Break started", "Back to work" y "Day ended", cada uno con su ícono y color del mockup.
3. **Given** un break que ya terminó, **When** se muestra su inicio, **Then** el renglón agrega la duración ("9:48 AM · 15 min").
4. **Given** el último evento es el estado actual y el día no terminó, **When** se muestra, **Then** lleva "current" y su hora resaltada en verde.
5. **Given** las horas del back vienen en UTC, **When** se muestran, **Then** están en hora de Melbourne.
6. **Given** el conductor no registró nada hoy, **When** ve la pantalla, **Then** la sección dice que todavía no hay eventos.
7. **Given** la lista no se pudo cargar, **When** ve la pantalla, **Then** la sección muestra su propio error con "Try again", sin tapar el anillo ni los botones.

---

### User Story 4 - Ver mi semana (Priority: P2)

Al final de la pantalla, el conductor ve las horas de cada día de la semana
con una barra, y el total sobre 72 h. Así sabe si le conviene tomar menos
horas los últimos días.

**Why this priority**: el límite semanal pesa menos día a día que el diario,
y "This week" en los datos del anillo ya da el total.

**Independent Test**: con un back simulado que devuelve el resumen semanal,
la sección muestra un renglón por día con sus horas y el total.

**Acceptance Scenarios**:

1. **Given** el resumen semanal trae horas por día, **When** ve la pantalla, **Then** ve "This week" con un renglón por día (nombre corto del día, barra y horas en formato "7h 48m").
2. **Given** un día con horas, **When** se dibuja su barra, **Then** el largo es proporcional a las 12 h del día y el color sigue el semáforo de ese día.
3. **Given** el resumen, **When** ve el pie de la sección, **Then** dice "Total worked" con las horas de la semana sobre 72 h.
4. **Given** el resumen no se pudo cargar, **When** ve la pantalla, **Then** la sección muestra su propio error con "Try again".

---

### User Story 5 - Saber si puedo aceptar órdenes nuevas (Priority: P2)

Cuando el conductor llega a su límite, la pantalla de fatiga se lo dice con un
aviso claro: no puede aceptar órdenes nuevas. La app deja ese dato
disponible para que el botón "Accept" del detalle de orden se bloquee cuando
llegue con E2.

**Why this priority**: es la regla de seguridad de la HVNL, pero el botón que
bloquea todavía no existe. Esta épica deja la regla lista y probada; E2 la
usa.

**Independent Test**: con un back simulado que devuelve un conductor sin horas
restantes, la pantalla muestra el aviso, y la regla de "puede aceptar" da
"no" con su motivo.

**Acceptance Scenarios**:

1. **Given** el conductor excede sus horas, **When** ve la pantalla de fatiga, **Then** ve un aviso en rojo: "You can't accept new orders" con el motivo ("Daily limit reached", "Weekly limit reached" o "Break overdue").
2. **Given** el conductor está dentro de sus horas, **When** ve la pantalla, **Then** no ve el aviso.
3. **Given** cualquier estado de fatiga, **When** otra pantalla de la app pregunta si el conductor puede aceptar órdenes, **Then** recibe sí o no, y el motivo cuando es no.
4. **Given** el conductor no tiene horas restantes en el día, **When** se consulta la regla, **Then** da "no" con el motivo "Daily limit reached".
5. **Given** el conductor no tiene horas restantes en la semana, **When** se consulta la regla, **Then** da "no" con el motivo "Weekly limit reached".
6. **Given** la hora del próximo break requerido ya pasó, **When** se consulta la regla, **Then** da "no" con el motivo "Break overdue".
7. **Given** el break estaba vencido, **When** el conductor toma el break y lo termina, **Then** la regla vuelve a dar "sí" (si no hay otro límite alcanzado) y el aviso desaparece.
8. **Given** se cumplen varios motivos a la vez, **When** se consulta la regla, **Then** da "no" y el aviso los muestra todos.

---

### Edge Cases

- **Datos de fatiga que no cargan pero el resto sí**: cada sección (anillo y
  datos, eventos, semana) muestra su propio error; una falla no vacía la
  pantalla entera.
- **El estado cambia desde otro lado** (el despachante o el día que el
  servidor cierra solo): al volver a la pestaña o al minuto, la pantalla
  muestra el estado nuevo.
- **Más de 12 h**: el anillo se ve completo y en rojo; el número muestra las
  horas reales, aunque pasen de 12.
- **Medianoche en Melbourne**: "Today's events" usa el día de Melbourne, no el
  día UTC.
- **Break sin fin** (el día terminó sin "End Break"): el inicio del break se
  muestra sin duración.
- **Sesión vencida durante una acción**: la sesión se renueva como en el resto
  de la app (E1) y la acción sigue; si no se puede renovar, el conductor vuelve
  al login.
- **Doble toque**: un segundo toque mientras una acción está en curso no
  manda otra.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La pestaña Fatigue MUST mostrar las horas trabajadas del día en un anillo sobre el límite de 12 h, con el estado (Working, On break, Off duty), siguiendo el mockup 12.
- **FR-002**: El color del anillo y del estado MUST seguir el semáforo: verde por debajo de 9 h, ámbar de 9 h a 11 h, rojo por encima de 11 h.
- **FR-003**: La pantalla MUST mostrar "Remaining", "Next break in" y "This week" (horas de la semana sobre 72 h) con los datos del back, sin recalcular los límites en la app.
- **FR-004**: Con el conductor trabajando, la pantalla MUST ofrecer "Take Break" y "End Day"; en break, "End Break" y "End Day"; fuera de turno, "Start Day".
- **FR-005**: "End Day" MUST pedir confirmación antes de registrar el fin del día.
- **FR-006**: Después de cada acción, la pantalla MUST mostrar el estado que devolvió el back y actualizar los eventos y la semana.
- **FR-007**: Una acción en curso MUST impedir un segundo envío de la misma acción.
- **FR-008**: La pantalla MUST listar los eventos de fatiga del día de Melbourne, en orden, con nombre, hora local y la duración de los breaks terminados.
- **FR-009**: La pantalla MUST mostrar el resumen semanal: un renglón por día con barra y horas, y el total sobre 72 h.
- **FR-010**: La app MUST exponer una regla única de "puede aceptar órdenes nuevas", con los motivos cuando no puede (límite diario alcanzado, límite semanal alcanzado, break vencido), derivada del estado de fatiga y del resumen semanal, para que la use el detalle de orden de E2.
- **FR-011**: Cuando el conductor no puede aceptar órdenes, la pantalla de fatiga MUST mostrar el aviso "You can't accept new orders" con el motivo.
- **FR-012**: Cada sección MUST tener estado de carga, de error con reintento y, para los eventos, vacío.
- **FR-013**: Los datos MUST refrescarse al volver a la pestaña, al tirar hacia abajo y cada minuto mientras la pantalla está visible.
- **FR-014**: Las horas MUST mostrarse en `Australia/Melbourne` y las duraciones en formato "5h 30m".
- **FR-015**: Los botones de acción MUST medir al menos 60 px de alto y todo el texto MUST ser de 16 pt o más, también las etiquetas que el mockup dibuja más chicas. La regla del conductor de `docs/CLAUDE_MOBILE.md` manda sobre el mockup, como en la tab bar de E1.
- **FR-016**: La pantalla MUST usar solo los endpoints y campos de fatiga que existen en `docs/openapi.json`.
- **FR-017**: Las acciones de fatiga MUST NOT encolarse sin conexión: el servidor registra la hora en que recibe el pedido, y mandar tarde un evento dejaría una hora falsa en el registro HVNL. Sin red, la app avisa que la acción no quedó registrada y ofrece reintentar.

### Key Entities _(include if feature involves data)_

- **Estado de fatiga**: lo que el back deriva del día del conductor. Estado (trabajando, en break, fuera de turno), horas trabajadas, minutos de break, inicio del día, fin del último break, hora del próximo break requerido y horas restantes del día.
- **Evento de fatiga**: un registro con tipo (inicio de día, inicio de break, fin de break, fin de día) y hora.
- **Resumen semanal**: horas totales de la semana, horas restantes de la semana y horas por día.
- **Habilitación para aceptar**: sí o no, con los motivos (límite diario, límite semanal, break vencido), derivado de los dos anteriores.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El conductor sabe si está dentro de sus horas en menos de 3 segundos desde que abre la pestaña, por el color del anillo, sin leer números.
- **SC-002**: Tomar un break o terminarlo cuesta un toque; terminar el día, dos (el toque y la confirmación).
- **SC-003**: Lo que muestra la pantalla coincide con el estado del back en el 100 % de los casos probados, sin cálculos propios de los límites.
- **SC-004**: La regla de "puede aceptar" da la respuesta correcta en todos los casos de prueba: dentro de horas, límite diario, límite semanal, break vencido y varios motivos a la vez.
- **SC-005**: Ninguna falla de red o del servidor cierra la app ni deja la pantalla en blanco: siempre hay un mensaje con reintento.

## Assumptions

- **Límites del Standard Hours**: 12 h por día, 72 h por semana y un break cada 5 h 30 min. El back hace las cuentas y la app las muestra.
- **Lo que el mockup tiene y el contrato no**: el lugar del evento ("Home base") no existe en el contrato y no se muestra. Tampoco hay tipos de break, así que todo break se llama "Break started" (no "Lunch break").
- **Sin flecha de volver**: Fatigue es una pestaña, así que el encabezado no lleva la flecha del mockup. El subtítulo "Standard Hours · HVNL compliant" se mantiene.
- **La semana** es la que devuelve el back en `byDay`; la app no decide qué día empieza.
- **El bloqueo de "Accept"** se aplica en el detalle de orden de E2. Esta épica no construye ese botón.
- **Depende de E1**: la sesión, el cliente de la API y la pestaña Fatigue de la tab bar ya existen.
- **Sin cola offline para fatiga**: la cola que nace en E2 no se usa para estos eventos mientras el contrato no acepte la hora del evento. Si el back la agrega, se revisa en una spec nueva.
