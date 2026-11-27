export type ReadFile = { body: Blob; sizeBytes: number };

export async function readFile(uri: string): Promise<ReadFile> {
  const response = await fetch(uri);
  const body = await response.blob();
  return { body, sizeBytes: body.size };
}
