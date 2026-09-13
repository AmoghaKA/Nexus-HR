// Minimal typings for pdf-parse, which ships no type declarations.
// Only the fields consumed by lib/hiring/resume-parse.ts are typed.

declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string | null;
  }

  interface PdfParseOptions {
    pagerender?: unknown;
    max?: number;
    version?: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>;
}

declare module "pdf-parse" {
  export { default } from "pdf-parse/lib/pdf-parse.js";
}