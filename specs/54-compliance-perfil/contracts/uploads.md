# Helper de subidas (para E3 y E6)

Vive en `src/uploads/`. E5 lo crea y lo usa para compliance; POD (E3) e
incidentes (E6) lo reusan pasándole su propio pedido de URL.

```ts
type UploadTarget = {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
};

type FileToUpload = { uri: string; mimeType: string };

export async function uploadWithPresignedUrl(input: {
  file: FileToUpload;
  // Pide la URL al endpoint del dominio. Recibe el tamaño ya leído.
  requestUrl: (fileSizeBytes: number) => Promise<UploadTarget>;
  now?: () => number; // para las pruebas
}): Promise<{ fileKey: string; fileSizeBytes: number }>;
// Lanza UploadError (data-model.md) con stage "request-url" o "put".

export function isUploadError(error: unknown): error is UploadError;
```

## Garantías

- Lee el archivo una vez (`read-file.ts` / `read-file.web.ts`) y usa ese
  tamaño para pedir la URL y para registrar.
- El `PUT` no lleva `Authorization` ni pasa por el middleware de sesión.
- Si la URL venció antes del `PUT`, o el `PUT` responde 403, pide una URL
  nueva y reintenta una sola vez. Un segundo 403 es `rejected`.
- Sin red, falla con `kind: "offline"`. No encola: la cola de E2 decide si
  encola un POD o un incidente, no el helper.
- Registrar en el back (el tercer paso) es del dominio: el helper devuelve
  `fileKey` y `fileSizeBytes` para eso.
