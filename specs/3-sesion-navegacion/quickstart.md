# Quickstart: validar Sesión y navegación

Cómo comprobar que la épica funciona, capa por capa. Los comandos son los de
`factory.json` → `commands`.

## jest (lógica y contrato)

```bash
pnpm test
```

Tiene que cubrir, contra handlers de msw:

- Story 1: los escenarios 1.1 a 1.9 del login, incluido el rol ajeno, el
  `429` y la red caída.
- Story 2: arranque con sesión, renovación transparente, una sola
  renovación con varios `401`, renovación rechazada, arranque sin red y
  cuenta suspendida.
- Story 3: confirmación, logout con red, logout sin red.

## Playwright sobre Expo web (layout y accesibilidad)

```bash
pnpm e2e
```

- Sin sesión, `/` muestra el login. Capturas del login a 393×852 y 360×800,
  sin scroll horizontal y sin violaciones de axe.
- Con un login simulado (`page.route` sobre `/auth/login` y `/auth/me`), se
  ve Home con la tab bar.
- Las capturas cambian respecto a la línea base actual (la pantalla de
  salud). Una persona acepta las nuevas desde el job visual del PR.

## Maestro en el emulador (nativo)

```bash
pnpm android        # dev build nuevo: expo-secure-store es código nativo
pnpm start          # Metro
pnpm e2e:android
```

Con el back corriendo en el host y `EXPO_PUBLIC_API_URL=http://10.0.2.2:<puerto>`:

1. La app arranca en el login ("Welcome back").
2. Entrar con un conductor de prueba lleva a Home.
3. Cerrar y reabrir la app (sin `clearState`) vuelve a Home sin login: la
   sesión quedó en secure store.
4. "Log out" y confirmar vuelve al login.

Fuera del gate: lo corre una persona antes del merge de cada historia nativa.

## A mano, en el teléfono

- Modo avión con sesión guardada: la app abre en Home.
- Suspender al conductor desde el admin: al reabrir con red, vuelve al login
  con "Your account is not active. Contact your dispatcher."
