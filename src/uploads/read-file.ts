import { File } from "expo-file-system";

export type ReadFile = { body: Blob; sizeBytes: number };

// `File` es un Blob y siempre sabe su tamaño; el selector de imágenes no
// siempre lo trae (research R5).
export async function readFile(uri: string): Promise<ReadFile> {
  const file = new File(uri);
  if (!file.exists) throw new Error(`The file ${uri} does not exist`);
  return { body: file, sizeBytes: file.size };
}
