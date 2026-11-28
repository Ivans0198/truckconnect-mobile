import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { ALLOWED_MIME_TYPES, type PickedFile } from "./draft";

export type PickResult =
  | { kind: "picked"; file: PickedFile }
  | { kind: "cancelled" }
  | { kind: "permission-denied" };

const PHOTO_QUALITY = 0.8;
const FALLBACK_PHOTO_NAME = "photo.jpg";
const FALLBACK_PHOTO_MIME_TYPE = "image/jpeg";
const FALLBACK_FILE_MIME_TYPE = "application/octet-stream";

// Pide el permiso de cámara y abre la cámara del sistema. Quien la llama ya
// explicó por qué (CameraRationale): este es el único lugar que lo pide.
export async function takePhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { kind: "permission-denied" };

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: PHOTO_QUALITY,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return { kind: "cancelled" };
  return {
    kind: "picked",
    file: {
      uri: asset.uri,
      name: asset.fileName ?? FALLBACK_PHOTO_NAME,
      mimeType: asset.mimeType ?? FALLBACK_PHOTO_MIME_TYPE,
    },
  };
}

export async function chooseFile(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...ALLOWED_MIME_TYPES],
    copyToCacheDirectory: true,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return { kind: "cancelled" };
  return {
    kind: "picked",
    file: {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? FALLBACK_FILE_MIME_TYPE,
    },
  };
}
