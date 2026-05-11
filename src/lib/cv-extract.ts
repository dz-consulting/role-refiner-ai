// CV text extraction (PDF or DOCX) — runs in browser
import mammoth from "mammoth";

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractFromPdf(file);
  if (name.endsWith(".docx") || name.endsWith(".doc")) return extractFromDocx(file);
  throw new Error("Unsupported file type. Upload a PDF or Word document.");
}

async function extractFromDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Bundle worker with Vite to avoid CDN/version mismatch
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return text;
}
