import jsPDF from "jspdf";

export type CoverLetter = {
  greeting: string;
  paragraphs: string[];
  closing: string;
  signature: string;
  subject_line?: string;
  rationale?: string;
};

export function coverLetterToText(cl: CoverLetter): string {
  return [
    cl.greeting,
    "",
    ...cl.paragraphs.flatMap((p) => [p, ""]),
    cl.closing,
    cl.signature,
  ].join("\n");
}

export function downloadCoverLetterPdf(cl: CoverLetter, filenameBase: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 64;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const write = (text: string, size: number, weight: "normal" | "bold" = "normal", gap = 4) => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      checkPage(size + gap);
      doc.text(line, margin, y);
      y += size + gap;
    }
  };

  write(cl.greeting, 12, "normal", 6);
  y += 8;
  for (const p of cl.paragraphs) {
    write(p, 11, "normal", 5);
    y += 10;
  }
  write(cl.closing, 11);
  y += 4;
  write(cl.signature, 12, "bold");

  const safe = (filenameBase || "cover_letter").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safe}_cover_letter.pdf`);
}
