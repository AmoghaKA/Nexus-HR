import JSZip from "jszip";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const POLICY_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function mimeTypeOf(fileName: string, declared?: string): string {
  if (declared && POLICY_MIME_TYPES.includes(declared)) return declared;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".md")) return "text/markdown";
  return "text/plain";
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("This .docx does not contain word/document.xml.");
  const xml = await doc.async("string");
  const paragraphs = xml
    .split("</w:p>")
    .map((block) => {
      const runs: string[] = [];
      const token = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let match: RegExpExecArray | null;
      while ((match = token.exec(block)) !== null) runs.push(match[1]);
      return decodeXmlEntities(runs.join(""));
    })
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return paragraphs.join("\n\n");
}

/**
 * Extracts plain text from an uploaded policy document. Supported: PDF, TXT,
 * Markdown and DOCX. Returns the raw text (paragraphs preserved where the
 * source format allows).
 */
export async function extractPolicyText(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const parsed = await pdfParse(bytes);
    return (parsed.text ?? "").trim();
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (await extractDocx(bytes)).trim();
  }
  return new TextDecoder("utf-8").decode(bytes).trim();
}

/**
 * Splits policy text into overlapping chunks that stay within `maxChars`.
 * Paragraph boundaries are respected; only unusually long paragraphs are
 * hard-split (with a small overlap so cross-boundary context is retained).
 */
export function chunkPolicyText(
  text: string,
  maxChars = 1200,
  overlap = 160
): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let current = "";

  const pushChunk = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const rawPara of clean.split(/\n\s*\n/)) {
    const para = rawPara.replace(/\s+/g, " ").trim();
    if (!para) continue;

    if (para.length > maxChars) {
      pushChunk(current);
      current = "";
      let rest = para;
      while (rest.length > maxChars) {
        let cut = rest.lastIndexOf(" ", maxChars);
        if (cut <= Math.floor(maxChars * 0.4)) cut = maxChars;
        pushChunk(rest.slice(0, cut));
        rest = rest.slice(Math.max(0, cut - overlap)).trim();
      }
      current = rest;
      continue;
    }

    if (current && current.length + para.length + 2 > maxChars) {
      pushChunk(current);
      const tail = current.slice(-overlap);
      current = tail.length + para.length + 2 <= maxChars ? tail : "";
    }
    current = current ? `${current}\n\n${para}` : para;
  }

  pushChunk(current);
  return chunks;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function fileExtensionOf(fileName: string, mimeType: string): string {
  const fromName = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  if (fromName) return fromName.startsWith(".") ? fromName.slice(1) : fromName;
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/markdown": "md",
  };
  return map[mimeType] ?? "txt";
}