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
    // pdf-parse's index.js tries to load ./test/data/05-versions-space.pdf
    // which doesn't exist on Vercel. Use require with the internal path
    // to bypass the package entry point entirely.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  throw new Error(`Unsupported file type: .${ext}. Only .docx and .pdf are supported.`);
}
