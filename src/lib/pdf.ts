import jsPDF from "jspdf";

export type TailoredCV = {
  name: string;
  title: string;
  contact: string;
  summary: string;
  experience: { role: string; company: string; duration: string; bullets: string[] }[];
  skills: string[];
  education: { degree: string; institution: string; year: string }[];
};

export function downloadTailoredCvPdf(cv: TailoredCV) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const writeWrapped = (text: string, size: number, weight: "normal" | "bold" = "normal", lineGap = 4) => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      checkPage(size + lineGap);
      doc.text(line, margin, y);
      y += size + lineGap;
    }
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(cv.name || "", margin, y);
  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text(cv.title || "", margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.text(cv.contact || "", margin, y);
  y += 18;
  doc.setTextColor(0);
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  const section = (label: string) => {
    checkPage(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(label.toUpperCase(), margin, y);
    doc.setTextColor(0);
    y += 14;
  };

  if (cv.summary) {
    section("Summary");
    writeWrapped(cv.summary, 11);
    y += 8;
  }

  if (cv.experience?.length) {
    section("Experience");
    for (const exp of cv.experience) {
      checkPage(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${exp.role} — ${exp.company}`, margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(exp.duration || "", margin, y);
      doc.setTextColor(0);
      y += 14;
      for (const b of exp.bullets || []) {
        const lines = doc.splitTextToSize(`• ${b}`, contentW - 12);
        for (const line of lines) {
          checkPage(14);
          doc.setFontSize(11);
          doc.text(line, margin + 12, y);
          y += 13;
        }
      }
      y += 8;
    }
  }

  if (cv.skills?.length) {
    section("Skills");
    writeWrapped(cv.skills.join(" · "), 11);
    y += 8;
  }

  if (cv.education?.length) {
    section("Education");
    for (const e of cv.education) {
      checkPage(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(e.degree, margin, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110);
      doc.text(`${e.institution}${e.year ? " — " + e.year : ""}`, margin, y);
      doc.setTextColor(0);
      y += 16;
    }
  }

  const safe = (cv.name || "cv").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safe}_tailored.pdf`);
}
