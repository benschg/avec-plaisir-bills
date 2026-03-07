import { put, del, get } from "@vercel/blob";

export function sanitizeFileName(name: string): string {
  // Strip directory traversal and path separators
  return name.replace(/^.*[/\\]/, "").replace(/\.\./g, "");
}

export async function uploadFile(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const blob = await put(fileName, buffer, {
    access: "private",
    contentType: "application/pdf",
  });
  return blob.url;
}

export async function downloadFile(url: string): Promise<Buffer> {
  const result = await get(url, { access: "private" });
  if (!result?.stream) throw new Error("Blob not found");
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}
