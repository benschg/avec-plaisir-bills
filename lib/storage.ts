import { put, del } from "@vercel/blob";

export async function uploadFile(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: "application/pdf",
  });
  return blob.url;
}

export async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}
