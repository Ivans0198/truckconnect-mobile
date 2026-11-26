# Quickstart: validar Fatiga HVNL

Cómo comprobar que la épica funciona. Los detalles de datos están en
[data-model.md](./data-model.md) y los endpoints en
[contracts/api-usage.md](./contracts/api-usage.md).

## Requisitos

- `pnpm install --frozen-lockfile`
- E1 mergeada (sesión, cliente de la API, pestañas).

## Checks automáticos (los mismos del Stop gate)

```bash
pnpm test        # jest + Testing Library + msw
pnpm lint        # cero warnings
pnpm typecheck
pnpm e2e         # Playwright + axe sobre Expo web, puerto 3741
```

Qué tienen que probar, por historia:

| Historia | Prueba                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1      | con estado `working` y 5,5 h, "Working", "5h 30m", tono verde; 9 h ámbar; 11,5 h rojo; "Due now" con el break vencido; esqueleto y error con "Try again"                                                |
| US2      | `working` → "Take Break" → `on_break` → "End Break" → `working`; "End Day" pide confirmación; `off_duty` → "Start Day"; sin red, el mensaje "was not recorded" y el estado sin cambio; 429; doble toque |
| US3      | los cuatro tipos de evento con su texto; duración de un break cerrado; "current"; hora de Melbourne; lista vacía; error de la sección                                                                   |
| US4      | un renglón por día con "7h 48m"; "Total worked … / 72h"; error de la sección                                                                                                                            |
| US5      | `evaluateOrderAcceptance` con cada motivo, con varios y con ninguno; el aviso en Fatigue; `unknown` en el hook sin datos                                                                                |

En jest el reloj se fija con fake timers, así "Next break in", "Due now" y
el refresco por minuto no dependen de la hora real.

## A mano en Expo web

```bash
pnpm exec expo start --web --port 3741
```

Entrar con un back real (`EXPO_PUBLIC_API_URL`) o con las rutas mockeadas de
Playwright, ir a la pestaña Fatigue y recorrer: Start Day, Take Break, End
Break, End Day con su confirmación. Cortar la red en las devtools y tocar una
acción: tiene que aparecer el aviso de que no se registró, sin cambiar el
estado.

## En el emulador Android

No hay flow de Maestro: la épica no toca nada nativo. Sin
`EXPO_PUBLIC_API_URL`, los mocks de desarrollo solo responden auth, así que
Fatigue muestra su error con "Try again" (research R12). Para verla con datos
hace falta un back: `EXPO_PUBLIC_API_URL=http://10.0.2.2:<puerto> pnpm android`.
