import mammoth from "mammoth";

/**
 * Extract plain text from a .docx or .pdf file buffer.
 */
export async function extractCvText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (ext === "pdf") {
    // Import the internal module directly to avoid pdf-parse's index.js
    // which tries to load a test PDF file (./test/data/05-versions-space.pdf)
    // that doesn't exist in serverless environments like Vercel
    // @ts-expect-error -- no declaration file for deep import
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  throw new Error(`Unsupported file type: .${ext}. Only .docx and .pdf are supported.`);
}
