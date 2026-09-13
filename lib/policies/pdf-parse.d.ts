declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  }
  function parsePdf(
    dataBuffer: Uint8Array,
    options?: {
      pagerender?: unknown;
      max?: number;
      version?: string;
    }
  ): Promise<PdfParseResult>;
  export default parsePdf;
}