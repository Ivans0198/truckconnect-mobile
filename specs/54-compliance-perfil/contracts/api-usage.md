# Uso del contrato: Compliance, perfil y notificaciones

Todo pasa por el cliente tipado de `src/api/client.ts` (con el middleware de
sesión de E1), salvo el `PUT` de subida, que va sin `Authorization` (R4).
Cualquier campo que no esté en esta tabla no se lee.

| Operación                               | Quién la usa                        | Parámetros                                                                       | Lo que se lee                                                                                                                 |
| --------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /compliance/documents`             | Docs, Home, barra, regla de aceptar | `page=1`, `limit=100`                                                            | `items[]`: `id`, `docType`, `status`, `expiryDate`, `rejectionReason`, `createdAt`; `totalPages`                              |
| `POST /compliance/documents/upload-url` | formulario de documento             | `docType`, `mimeType`, `fileSizeBytes`                                           | `uploadUrl`, `fileKey`, `expiresInSeconds`                                                                                    |
| `PUT <uploadUrl>`                       | helper de subidas                   | bytes, `Content-Type`                                                            | solo el código de estado                                                                                                      |
| `POST /compliance/documents`            | formulario de documento             | `docType`, `issueDate`, `expiryDate`, `fileKey`, `fileMimeType`, `fileSizeBytes` | el documento creado (se invalida la lista)                                                                                    |
| `GET /auth/me` (de E1)                  | Profile                             | (ninguno)                                                                        | `id`, `fullName`, `email`, `phone`, `abn`, `licenceClass`, `emergencyContact`, `createdAt`                                    |
| `GET /drivers/{id}/stats`               | Profile                             | `id` de la cuenta, `period=month`                                                | `totalOrders`                                                                                                                 |
| `GET /vehicles`                         | Profile                             | `page=1`, `limit=100`                                                            | `items[]`: `id`, `type`, `registrationNumber`, `make`, `model`, `year`, `palletCapacity`, `gvmKg`, `cargoHeightM`, `isActive` |
| `GET /notifications`                    | Notifications                       | `page`, `limit=20`                                                               | `items[]`: `id`, `title`, `body`, `read`, `sentAt`, `createdAt`; `page`, `totalPages`                                         |
| `GET /notifications`                    | campana de Home                     | `unread=true`, `page=1`, `limit=1`                                               | `total`                                                                                                                       |
| `PATCH /notifications/{id}/read`        | Notifications                       | `id`                                                                             | (la respuesta confirma; la lista ya cambió en forma optimista)                                                                |
| `PATCH /notifications/read-all`         | Notifications                       | (ninguno)                                                                        | (se invalidan las dos keys)                                                                                                   |

## Errores

- Toda query lanza ante un no-2xx; la sección muestra su error con "Try
  again".
- `429` dice "Too many requests. Try again shortly." y nunca borra el
  formulario.
- `400` en la subida o el registro: se muestra `message` del `ApiErrorDto` si
  viene; si no, "The document couldn't be uploaded."
- `401` lo maneja el middleware de E1 (renueva o vuelve al login).

## Lo que no se usa

- `GET /users/me`: mismo DTO que `/auth/me`, que ya está en caché.
- `PATCH /users/{id}` y `PATCH /vehicles/{id}`: el perfil es solo de lectura
  (FR-020).
- `GET /drivers/{id}`: el contrato no dice si el conductor puede pedirse a sí
  mismo (R1).
- `downloadUrl` de los documentos: ver el archivo no está en la spec.
