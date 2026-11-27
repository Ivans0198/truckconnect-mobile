# Quickstart: validar Compliance, perfil y notificaciones

Cómo comprobar que la épica funciona. Los datos están en
[data-model.md](./data-model.md), los endpoints en
[contracts/api-usage.md](./contracts/api-usage.md) y las rutas en
[contracts/routes.md](./contracts/routes.md).

## Requisitos

- `pnpm install --frozen-lockfile`
- E1 y E4 mergeadas (sesión, pestañas, regla de aceptar).
- Para el emulador: un dev build nuevo (`pnpm android`), porque E5 suma
  módulos nativos (`expo-image-picker`, `expo-document-picker`,
  `expo-file-system`, `@react-native-community/datetimepicker`).

## Checks automáticos (los mismos del Stop gate)

```bash
pnpm test        # jest + Testing Library + msw
pnpm lint        # cero warnings
pnpm typecheck
pnpm e2e         # Playwright + axe sobre Expo web, puerto 3741
```

Qué tienen que probar, por historia:

| Historia | Prueba                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1      | `summarizeDocuments` con tablas de casos: 61, 60, 8, 7, 0 días y vencido; aprobado vencido por fecha; en revisión con y sin aprobado en rojo; rechazado con motivo; varias versiones del mismo tipo; medianoche de Melbourne. La pantalla: tarjetas, aviso de arriba con el más urgente, "How alerts work", vacío, esqueleto, error con "Try again"                                             |
| US2      | `uploadWithPresignedUrl`: pide la URL con el tamaño, `PUT` sin `Authorization`, URL vencida por reloj y por 403 (reintenta una vez), sin red, 429. `validateDraft` con cada error. El formulario: tipo prellenado desde la tarjeta, "+" pide el tipo, archivo no soportado, doble toque, vuelve a Docs con "Under review", falla con el formulario intacto, permiso negado ofrece "Choose file" |
| US3      | el aviso de Home ámbar y rojo, con "and N more"; toca y va a Docs; el punto de la barra y su nombre accesible; sin aviso ni punto si la query falla; "renewal under review"; `evaluateOrderAcceptance` con motivos de compliance solos y junto a los de fatiga; el aviso de Fatigue con el motivo                                                                                               |
| US4      | iniciales, licencia con nombre largo, ABN, "Deliveries" del mes, "Rating" vacío, "With us"; contacto de emergencia y "Not set"; vehículo activo y "No vehicle on file"; error por sección; versión; sin flechas ni "Edit"; "Log out" sigue                                                                                                                                                      |
| US5      | punto de la campana y su nombre accesible; lista ordenada con la hora de Melbourne; tocar marca leída; "Mark all read"; falla revierte; segunda página al final; "You're all caught up"; refresco por minuto con fake timers                                                                                                                                                                    |

## A mano en Expo web

```bash
pnpm exec expo start --web --port 3741
```

Con un back real (`EXPO_PUBLIC_API_URL`) o las rutas mockeadas de
Playwright: abrir Docs, ver las tarjetas, tocar "Upload renewed document",
elegir un PDF con el selector del navegador, completar las dos fechas y
enviar. La tarjeta tiene que quedar "Under review". Cortar la red en las
devtools y enviar otra vez: el formulario sigue completo con "Try again".

## En el emulador Android

```bash
pnpm android        # dev build nuevo, sin EXPO_PUBLIC_API_URL: mocks de src/mocks
pnpm e2e:android    # corre .maestro/, incluido compliance-upload.yaml
```

Los mocks del dev build traen un documento por vencer (research R15). El flow
`compliance-upload.yaml` llega hasta la cámara del sistema después de
conceder el permiso. A mano, además: negar el permiso y confirmar que "Choose
file" sigue disponible, y elegir un PDF descargado en el emulador.

Lo corre una persona: el gate y el CI no tienen emulador. El PR de la
historia 2 lo pide y no da el flow por bueno sin esa corrida.
