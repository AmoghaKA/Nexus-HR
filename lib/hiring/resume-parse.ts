// ---------------------------------------------------------------------------
// Resume text extraction (server-side only).
// Converts an uploaded resume file into plain text so the Qwen engine can
// build a structured candidate profile. Supports PDF, DOCX and plain text.
// ---------------------------------------------------------------------------

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export interface ExtractedResume {
  text: string;
  fileType: string | null;
}

/**
 * Extracts plain text from an uploaded resume. Throws a friendly error when
 * the file type is unsupported or the content cannot be read.
 */
export async function extractResumeText(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType?: string | null
): Promise<ExtractedResume> {
  const name = fileName.toLowerCase();
  const type = (mimeType ?? "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return { text: await extractPdf(buffer), fileType: "pdf" };
  }
  if (type.includes("wordprocessingml") || name.endsWith(".docx")) {
    return { text: await extractDocx(buffer), fileType: "docx" };
  }
  if (type.includes("msword") || name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc (Word 97-2003) files aren't supported. Please save the resume as .docx or .pdf and upload again."
    );
  }
  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    return { text: bufferToUtf8(buffer), fileType: "text" };
  }

  throw new Error(`Unsupported file type "${mimeType ?? fileName}". Upload a .pdf, .docx or .txt resume.`);
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const source = Buffer.from(buffer);
  // pdf-parse's top-level entry runs a module-level debug-mode parse; the
  // documented, reliable entry point is lib/pdf-parse.js.
  let parse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  if (typeof parse !== "function") {
    const mod = await import("pdf-parse");
    parse = mod.default;
  }
  const result = await parse(source, {
    max: 0, // parse all pages
  });
  if (!result || typeof result.text !== "string") {
    throw new Error("The PDF could not be read as text. Try a .docx or .txt resume instead.");
  }
  return normalizeText(result.text);
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await loadDocxZip(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("This .docx file has no readable document body. Try re-saving it from Word.");
  }
  const xml = await documentFile.async("string");
  const text = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return normalizeText(text);
}

// Minimal shapes for the dynamic jszip import so ESM/CJS interop stays fully
// typed (jszip ships its own types, but the load path differs by bundler).
interface DocxZipFile {
  async(type: "string"): Promise<string>;
}

interface DocxZip {
  file(path: string): DocxZipFile | null;
}

async function loadDocxZip(buffer: ArrayBuffer): Promise<DocxZip> {
  // jszip ships as a UMD class constructor; some bundlers emit a CJS wrapper
  // whose exported value is already a loaded instance. Handle both shapes with
  // a duck-type check (the runtime interop differs across module loaders).
  const mod = (await import("jszip")) as unknown as { default?: unknown };
  const exported = mod.default ?? mod;

  if (typeof (exported as { loadAsync?: unknown }).loadAsync === "function") {
    return exported as unknown as DocxZip;
  }

  const JsZipCtor = exported as unknown as {
    new (): { loadAsync(data: ArrayBuffer | Uint8Array): Promise<DocxZip> };
  };
  return new JsZipCtor().loadAsync(buffer);
}

function bufferToUtf8(buffer: ArrayBuffer): string {
  return normalizeText(Buffer.from(buffer).toString("utf8"));
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}