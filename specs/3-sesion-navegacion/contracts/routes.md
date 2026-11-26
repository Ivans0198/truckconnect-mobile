# Rutas de la app

Lo que el resto de las épicas encuentra montado al terminar esta.

| Ruta       | Archivo                  | Visible cuando | Contenido en E1                |
| ---------- | ------------------------ | -------------- | ------------------------------ |
| `/sign-in` | `app/(auth)/sign-in.tsx` | sin sesión     | login del mockup 09            |
| `/`        | `app/(tabs)/index.tsx`   | con sesión     | título "Home" (E2 lo llena)    |
| `/fatigue` | `app/(tabs)/fatigue.tsx` | con sesión     | título "Fatigue" (E4)          |
| `/docs`    | `app/(tabs)/docs.tsx`    | con sesión     | título "Docs" (E5)             |
| `/profile` | `app/(tabs)/profile.tsx` | con sesión     | "Log out" (E5 agrega el resto) |

- Cualquier ruta con sesión que se abra sin sesión lleva a `/sign-in`.
- Después del login, siempre `/`.
- Las épicas que siguen agregan sus rutas dentro de `(tabs)` o como stacks
  hijos de una pestaña; quedan protegidas sin hacer nada extra.
- Las pestañas, en este orden: Home, Fatigue, Docs, Profile. Cada una tiene
  `accessibilityRole="tab"`, su nombre visible y su estado seleccionado.
