# Feature Specification: Sesión y navegación

**Feature Branch**: `spec-3`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "usa docs/CLAUDE_MOBILE.md, docs/PROMPT_MOBILE.md y docs/driver-incidents-mobile-requirement.md" (épica E1 de `docs/plan-maestro.md`: "Auth + navegación" de `docs/PROMPT_MOBILE.md`, mockup `09_driver_login`)

## Clarifications

### Session 2026-11-26

- Q: ¿Qué hace el enlace "Forgot password?" del login, si el contrato no tiene endpoint para recuperar la contraseña? → A: Se muestra; al tocarlo, un mensaje dice "Contact your dispatcher to reset your password".
- Q: ¿Entra en esta épica el desbloqueo con huella o rostro del botón "Use Face ID"? → A: No. Se oculta el botón y se entra directo con la sesión guardada.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Entrar a la app con mi cuenta (Priority: P1)

El conductor abre la app por primera vez y ve la pantalla de login del mockup 09. Escribe su email y su contraseña, toca "Sign in" y entra a la app, que le
muestra la tab bar con Home, Fatigue, Docs y Profile. Solo una cuenta de
conductor entra: una cuenta de admin o de cliente recibe un mensaje claro y
se queda en el login.

**Why this priority**: sin login ninguna otra pantalla puede pedir datos al
back. Es la puerta de toda la app.

**Independent Test**: con un back simulado, un conductor activo entra con sus
credenciales y llega a la pestaña Home; una cuenta ADMIN con credenciales
válidas no entra.

**Acceptance Scenarios**:

1. **Given** el conductor no tiene sesión, **When** abre la app, **Then** ve la pantalla de login y ninguna pantalla interna.
2. **Given** el login, **When** escribe un email y una contraseña válidos de una cuenta DRIVER activa y toca "Sign in", **Then** entra a la app y ve la pestaña Home seleccionada.
3. **Given** el login, **When** deja el email o la contraseña vacíos, **Then** "Sign in" no envía nada y el campo vacío dice qué falta.
4. **Given** el login, **When** las credenciales son incorrectas o la cuenta no está activa, **Then** ve "Incorrect email or password, or the account is not active" y los campos conservan el email escrito.
5. **Given** el login, **When** las credenciales son válidas pero la cuenta es ADMIN o CLIENT, **Then** no entra, ve un mensaje que dice que la app es solo para conductores, y la app no guarda ninguna sesión.
6. **Given** el login, **When** el servicio responde que hubo demasiados intentos, **Then** ve "Too many attempts, try again in a moment" y puede volver a intentar después.
7. **Given** el login, **When** no hay conexión o el servidor no responde, **Then** ve un mensaje de sin conexión con la opción de reintentar, y la app no se cierra.
8. **Given** el login con un email escrito, **When** toca "Forgot password?", **Then** ve "Contact your dispatcher to reset your password" y sigue en el login con el email intacto.
9. **Given** el conductor tocó "Sign in", **When** la respuesta todavía no llegó, **Then** el botón muestra que está trabajando y no se puede tocar dos veces.

---

### User Story 2 - Seguir dentro sin volver a escribir la contraseña (Priority: P1)

El conductor ya entró una vez. Cierra la app, el teléfono se reinicia o pasan
horas entre una orden y otra: al abrirla vuelve directo a la app, sin login.
Cuando su acceso vence, la app lo renueva sola, sin que él lo note. Solo vuelve
a ver el login si su sesión ya no se puede renovar.

**Why this priority**: el conductor usa la app toda la jornada, a veces con
guantes y en la cabina. Pedirle la contraseña a mitad del día es la peor
interrupción posible.

**Independent Test**: entrar, reiniciar la app y llegar a Home sin login;
simular un acceso vencido y comprobar que la siguiente pantalla carga igual.

**Acceptance Scenarios**:

1. **Given** el conductor entró y cerró la app, **When** la vuelve a abrir, **Then** llega a Home sin pasar por el login.
2. **Given** el acceso del conductor venció pero su sesión sigue vigente, **When** la app pide datos al back, **Then** la sesión se renueva sola y el pedido se completa sin mostrar error ni login.
3. **Given** el acceso venció, **When** la app hace varios pedidos a la vez, **Then** la sesión se renueva una sola vez y todos los pedidos se completan.
4. **Given** la sesión ya no se puede renovar (vencida, revocada o usada en otro lado), **When** la app intenta renovarla, **Then** el conductor vuelve al login con el mensaje "Your session has expired. Please sign in again." y la sesión guardada se borra.
5. **Given** el conductor tiene sesión guardada, **When** abre la app sin conexión, **Then** entra igual a la app con los datos de su cuenta guardados; la falta de red no lo saca.
6. **Given** el conductor tiene sesión guardada, **When** abre la app y su cuenta fue suspendida o desactivada, **Then** vuelve al login con un mensaje que dice que su cuenta no está activa y que hable con la oficina.

---

### User Story 3 - Cerrar sesión (Priority: P2)

El conductor termina de usar el teléfono o se lo pasa a otra persona. En la
pestaña Profile toca "Log out", confirma, y la app vuelve al login sin dejar
rastro de su sesión en el teléfono.

**Why this priority**: es necesario para cerrar el ciclo y para teléfonos
compartidos, pero el conductor lo usa poco.

**Independent Test**: entrar, cerrar sesión, reiniciar la app y comprobar que
pide login.

**Acceptance Scenarios**:

1. **Given** el conductor está dentro, **When** toca "Log out" en Profile, **Then** la app le pide confirmar antes de cerrar la sesión.
2. **Given** confirmó, **When** la app cierra la sesión, **Then** avisa al back para que la sesión quede revocada, borra la sesión del teléfono y muestra el login.
3. **Given** confirmó sin conexión, **When** la app no puede avisar al back, **Then** igual borra la sesión del teléfono y muestra el login.
4. **Given** cerró sesión, **When** reinicia la app, **Then** ve el login.

---

### Edge Cases

- El conductor toca una notificación o un enlace a una pantalla interna sin sesión: ve el login, y después de entrar llega a Home.
- La renovación falla por falta de red, no porque la sesión haya vencido: el conductor no sale de la app; el pedido falla con el estado de error normal de esa pantalla.
- El email tiene espacios al principio o al final, o mayúsculas: se recortan los espacios antes de enviar.
- El conductor toca "Sign in" con el teclado abierto: el botón sigue visible en una pantalla de 360×800.
- El back responde algo que la app no espera (un 500): mensaje genérico de error con reintentar, nunca un cierre de la app.
- La app pierde el foco y vuelve después de horas: la sesión se renueva al primer pedido, como en la Story 2.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La app MUST mostrar el login a quien no tenga sesión, y MUST impedir el acceso a cualquier pantalla interna sin sesión.
- **FR-002**: El login MUST pedir email y contraseña, con la contraseña oculta y la opción de mostrarla.
- **FR-003**: La app MUST dejar entrar solo a cuentas con rol DRIVER; con otro rol MUST mostrar un mensaje y no guardar sesión.
- **FR-004**: La app MUST distinguir en el login, con mensajes distintos: credenciales incorrectas o cuenta inactiva, demasiados intentos, y sin conexión o error del servidor.
- **FR-005**: La app MUST guardar la sesión en el almacenamiento cifrado del teléfono, nunca en almacenamiento en texto plano.
- **FR-006**: La app MUST renovar la sesión sola cuando el acceso vence, una sola vez aunque haya varios pedidos en curso, y repetir los pedidos que fallaron por el vencimiento.
- **FR-007**: La app MUST devolver al login y borrar la sesión cuando la renovación es rechazada por el back, y MUST NOT hacerlo cuando falla por falta de red.
- **FR-008**: La app MUST guardar los datos de la cuenta del conductor (nombre, email, rol, estado) para poder entrar sin conexión con una sesión guardada.
- **FR-009**: Al abrir la app con sesión, MUST consultar la cuenta del conductor y, si su estado no es activo, cerrar la sesión y explicar por qué.
- **FR-010**: La app MUST mostrar una tab bar con cuatro pestañas, en este orden: Home, Fatigue, Docs y Profile. En esta épica cada pestaña muestra su título; su contenido llega con su propia épica.
- **FR-011**: La pestaña Profile MUST ofrecer "Log out" con confirmación. Cerrar sesión MUST revocar la sesión en el back cuando hay red y borrar la sesión local siempre.
- **FR-012**: El login, la tab bar y "Log out" MUST cumplir las reglas del conductor: áreas táctiles de al menos 60 px, texto de al menos 16 pt y contraste legible al sol (`design-system.md`).
- **FR-013**: El login MUST reproducir el mockup `09_driver_login` en layout, colores y tipografía, salvo lo que esta spec saca de alcance.
- **FR-014**: El login MUST mostrar "Forgot password?" como en el mockup; al tocarlo, MUST mostrar el mensaje "Contact your dispatcher to reset your password" sin salir del login ni borrar lo escrito. No hay recuperación de contraseña dentro de la app.
- **FR-015**: El login MUST NOT mostrar el botón "Use Face ID" del mockup. Con una sesión guardada, la app entra directo, sin pedir huella ni rostro.

### Key Entities

- **Sesión**: el par de credenciales que el back entrega al entrar (un acceso de vida corta y una credencial de renovación). Vive cifrada en el teléfono; se reemplaza en cada renovación y se borra al salir.
- **Cuenta del conductor**: lo que el back devuelve de la cuenta actual: id, nombre completo, email, rol (ADMIN, DRIVER, CLIENT) y estado (ACTIVE, SUSPENDED, PENDING_VERIFICATION, DEACTIVATED). La app guarda una copia para trabajar sin red.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un conductor con sus credenciales entra a la app en menos de 30 segundos desde que la abre.
- **SC-002**: Con una sesión vigente, el 100 % de las aperturas de la app llegan a Home sin pedir la contraseña, con o sin conexión.
- **SC-003**: Durante una jornada de 12 horas con la sesión vigente, el conductor no ve el login ni un error de sesión ni una sola vez.
- **SC-004**: Ninguna cuenta que no sea de conductor llega a una pantalla interna.
- **SC-005**: Ningún error del login (credenciales, límite, red, servidor) cierra la app; cada uno muestra un mensaje y una salida.
- **SC-006**: Todos los elementos tocables de las pantallas de esta épica miden al menos 60 px y su texto al menos 16 pt.

## Assumptions

- **Email, no teléfono.** El mockup dice "Email or phone", pero el contrato de login acepta solo email. El campo se llama "Email" y pide un email; entrar con teléfono necesitaría un cambio en el back.
- **Sin aviso de Terms y Privacy funcional.** La línea "By signing in, you agree to our Terms of Service and Privacy Policy" se muestra como texto; enlazar los documentos queda fuera porque no hay dónde apuntar todavía.
- **Sin biometría en esta épica.** El desbloqueo con huella o rostro puede llegar más adelante como una historia aparte; no cambia nada de lo que esta spec define.
- **Las cuentas las crea la oficina.** El conductor fue invitado por un admin y ya tiene contraseña; la app no registra cuentas nuevas.
- **Las pestañas Home, Fatigue y Docs muestran solo su título** hasta que E2, E4 y E5 traigan su contenido. Profile muestra solo "Log out" hasta E5.
- **El acceso sin red usa los últimos datos guardados** de la cuenta. Si la cuenta se suspendió mientras el teléfono estaba sin red, la app se entera al volver la conexión.
- **Después de entrar, siempre Home.** Un enlace interno abierto sin sesión no se recuerda después del login.
- **La UI está en inglés**, como dice `CLAUDE.md`; esta spec está en español.
