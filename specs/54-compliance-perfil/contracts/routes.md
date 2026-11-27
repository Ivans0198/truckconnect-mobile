# Rutas: Compliance, perfil y notificaciones

| Ruta                   | Archivo                  | Presentación                  | Qué compone                                    |
| ---------------------- | ------------------------ | ----------------------------- | ---------------------------------------------- |
| `/` (pestaña Home)     | `app/(tabs)/index.tsx`   | pestaña                       | `HomeHeader` (campana) y `ComplianceBanner`    |
| `/docs` (pestaña Docs) | `app/(tabs)/docs.tsx`    | pestaña, sin flecha de volver | `ComplianceScreen`                             |
| `/profile`             | `app/(tabs)/profile.tsx` | pestaña                       | `ProfileScreen` (con el `SignOutButton` de E1) |
| `/documents/new`       | `app/documents/new.tsx`  | modal sobre las pestañas      | `DocumentForm`; `?type=<DocType>` opcional     |
| `/notifications`       | `app/notifications.tsx`  | stack, con flecha de volver   | `NotificationsScreen`                          |

- `/documents/new` y `/notifications` se declaran en el `Stack` de
  `app/_layout.tsx`, dentro del `Stack.Protected` de la sesión: sin sesión
  llevan al login, como las pestañas.
- Un `type` que no es un `DocType` del contrato se ignora y el formulario
  pide elegir el tipo.
- Al registrar el documento, el formulario vuelve atrás (`router.back()`) a
  Docs, con la lista invalidada.
- La pestaña Docs recibe `tabBarBadge: true` cuando algún documento pide
  atención (R11).

## Lo que decide E2

- Dónde queda la campana cuando Home tenga "Your day": E5 la deja en el
  encabezado de Home como un componente suelto.
- Si tocar una notificación con una orden en `metadata` abre el detalle.
