import mammoth from "mammoth";

export async function extractPlainTextFromDocxBuffer(buffer: ArrayBuffer): Promise<{ text: string; messages: string[] }> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const messages = (result.messages ?? []).map((m) => String(m.message ?? m));
  return { text: result.value ?? "", messages };
}
