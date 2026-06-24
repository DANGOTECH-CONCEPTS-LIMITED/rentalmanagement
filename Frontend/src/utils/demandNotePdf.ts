import jsPDF from "jspdf";

export interface DemandNoteInvoice {
  reference: string;
  date: string;
  description: string;
  amount: number;
}

export interface DemandNoteParams {
  tenant: {
    id: number;
    fullName: string;
    phoneNumber: string;
    email?: string;
    dateMovedIn?: string;
    property: { name: string; address?: string; type: string; currency: string };
    unit?: { unitNumber?: string };
  };
  outstandingAmount: number;
  invoices?: DemandNoteInvoice[];
  branding?: { companyName?: string; logoDataUrl?: string };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (ds: string) =>
  new Date(ds).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

export const generateDemandNotePdf = (params: DemandNoteParams) => {
  const { tenant, outstandingAmount, invoices = [], branding = {} } = params;
  const companyName = branding.companyName || "Property Management";
  const currency = tenant.property.currency || "UGX";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mg = 14;
  const cW = pageW - mg * 2;
  let y = 0;

  const checkNewPage = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  };

  // ── Dark header band ──────────────────────────────────────────────────────
  doc.setFillColor(10, 18, 40);
  doc.rect(0, 0, pageW, 54, "F");
  // Gold accent stripe
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 50, pageW, 4, "F");

  // Logo / company initial
  const logoX = mg;
  const logoY = 12;
  if (branding.logoDataUrl) {
    try { doc.addImage(branding.logoDataUrl, "PNG", logoX, logoY, 26, 26); } catch { /* skip */ }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, logoX + 30, logoY + 9);
    doc.setTextColor(234, 179, 8);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Property Management", logoX + 30, logoY + 16);
  } else {
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(logoX, logoY, 26, 26, 4, 4, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(companyName.charAt(0).toUpperCase(), logoX + 13, logoY + 17, { align: "center" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(companyName, logoX + 30, logoY + 9);
    doc.setTextColor(234, 179, 8);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Property Management", logoX + 30, logoY + 16);
  }

  // Top-right: title + reference + date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DEMAND NOTE", pageW - mg, branding.companyName ? 20 : 22, { align: "right" });
  const ref = `DN-${String(tenant.id).padStart(6, "0")}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Ref:   ${ref}`, pageW - mg, 28, { align: "right" });
  doc.text(`Date:  ${fmtDate(new Date().toISOString())}`, pageW - mg, 34, { align: "right" });

  y = 62;

  // ── Section bar helper ─────────────────────────────────────────────────────
  const sectionBar = (title: string) => {
    checkNewPage(14);
    doc.setFillColor(10, 18, 40);
    doc.rect(mg, y, cW, 10, "F");
    doc.setFillColor(234, 179, 8);
    doc.rect(mg, y, 3, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(title, mg + 6, y + 7);
    y += 14;
  };

  const labelVal = (label: string, val: string, xOffset = 0) => {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), mg + 6 + xOffset, y);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(val, mg + 6 + xOffset, y + 6);
  };

  // ── Section 01: Addressed To ───────────────────────────────────────────────
  sectionBar("01  ADDRESSED TO");
  const halfW = cW / 2;
  labelVal("Tenant Name", tenant.fullName);
  labelVal("Phone", tenant.phoneNumber, halfW);
  y += 12;
  labelVal("Property", tenant.property.name);
  const unitStr = tenant.unit?.unitNumber ? `Unit ${tenant.unit.unitNumber}` : "—";
  labelVal("Unit / Room", unitStr, halfW);
  y += 12;
  if (tenant.dateMovedIn) {
    labelVal("Move-in Date", fmtDate(tenant.dateMovedIn));
    y += 12;
  }
  y += 4;

  // ── Section 02: Outstanding Balance ───────────────────────────────────────
  sectionBar("02  OUTSTANDING BALANCE");
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(mg, y, cW, 22, 4, 4, "F");
  doc.setFillColor(234, 179, 8);
  doc.roundedRect(mg, y, 3, 22, 2, 2, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT OUTSTANDING", mg + 8, y + 8);
  doc.setTextColor(120, 80, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${currency} ${fmt(outstandingAmount)}`, mg + 8, y + 18);

  // Payment deadline — 7 days
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT DUE BY", mg + halfW, y + 8);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(fmtDate(deadline.toISOString()), mg + halfW, y + 18);
  y += 28;

  // ── Section 03: Invoice Breakdown (if provided) ────────────────────────────
  if (invoices.length > 0) {
    sectionBar("03  INVOICE BREAKDOWN");
    const colW = [28, 26, cW - 28 - 26 - 32 - 28, 32, 28];
    const headers = ["DATE", "REFERENCE", "DESCRIPTION", "AMOUNT", "STATUS"];

    // Table header row
    doc.setFillColor(30, 41, 59);
    doc.rect(mg, y, cW, 8, "F");
    doc.setTextColor(226, 232, 240);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    let cx = mg + 3;
    headers.forEach((h, i) => {
      doc.text(h, i >= 3 ? cx + colW[i] - 3 : cx, y + 5.5, { align: i >= 3 ? "right" : "left" });
      cx += colW[i];
    });
    y += 8;

    invoices.forEach((inv, idx) => {
      checkNewPage(8);
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(255, 251, 235);
      }
      doc.rect(mg, y, cW, 7.5, "F");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      cx = mg + 3;
      const cells = [
        fmtDate(inv.date),
        inv.reference,
        inv.description.length > 28 ? inv.description.slice(0, 26) + "…" : inv.description,
        `${fmt(inv.amount)}`,
        "UNPAID",
      ];
      cells.forEach((cell, i) => {
        const isRight = i >= 3;
        if (i === 4) {
          doc.setTextColor(120, 80, 0);
          doc.setFont("helvetica", "bold");
        } else if (i === 3) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
        }
        doc.text(cell, isRight ? cx + colW[i] - 3 : cx, y + 5.2, { align: isRight ? "right" : "left" });
        cx += colW[i];
      });
      y += 7.5;
    });

    // Total row
    doc.setFillColor(30, 41, 59);
    doc.rect(mg, y, cW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", mg + 3, y + 5.5);
    doc.setTextColor(234, 179, 8);
    doc.text(`${currency} ${fmt(outstandingAmount)}`, pageW - mg - 3, y + 5.5, { align: "right" });
    y += 14;
  } else {
    y += 4;
  }

  // ── Number to words ────────────────────────────────────────────────────────
  const numToWords = (n: number): string => {
    if (n === 0) return "Zero";
    const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
                  "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
                  "Seventeen","Eighteen","Nineteen"];
    const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
    const conv = (num: number): string => {
      if (num === 0) return "";
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
      if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + conv(num % 100) : "");
      if (num < 1_000_000) return conv(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + conv(num % 1000) : "");
      if (num < 1_000_000_000) return conv(Math.floor(num / 1_000_000)) + " Million" + (num % 1_000_000 ? " " + conv(num % 1_000_000) : "");
      return conv(Math.floor(num / 1_000_000_000)) + " Billion" + (num % 1_000_000_000 ? " " + conv(num % 1_000_000_000) : "");
    };
    return conv(Math.floor(n)) + " Shillings Only";
  };

  // ── Justified paragraph renderer ──────────────────────────────────────────
  const drawJustified = (paragraph: string) => {
    const maxW = cW - 10;
    const lines: string[] = doc.splitTextToSize(paragraph, maxW);
    lines.forEach((line: string, idx: number) => {
      checkNewPage(6);
      const isLast = idx === lines.length - 1;
      if (isLast) {
        doc.text(line, mg + 5, y);
      } else {
        const words: string[] = line.trim().split(/\s+/);
        if (words.length <= 1) {
          doc.text(line, mg + 5, y);
        } else {
          const textW = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
          const gap = (maxW - textW) / (words.length - 1);
          let cx = mg + 5;
          words.forEach((w) => { doc.text(w, cx, y); cx += doc.getTextWidth(w) + gap; });
        }
      }
      y += 5.5;
    });
  };

  // ── Section 04 / 03: Notice ─────────────────────────────────────────────────
  const noticeNum = invoices.length > 0 ? "04" : "03";
  sectionBar(`${noticeNum}  NOTICE TO TENANT`);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Opening salutation (left-aligned)
  checkNewPage(6);
  doc.text(`Dear ${tenant.fullName},`, mg + 5, y);
  y += 8;

  // Paragraph 1
  drawJustified(
    `This is a formal demand notice regarding your outstanding rental obligations for the premises at ${tenant.property.name}${tenant.unit?.unitNumber ? `, Unit ${tenant.unit.unitNumber}` : ""}.`
  );
  y += 3;

  // Paragraph 2 — amount reference
  drawJustified(
    `As of ${fmtDate(new Date().toISOString())}, the total outstanding balance on your account is as stated below.`
  );
  y += 3;

  // ── Bold amount box (figure + words) ──────────────────────────────────────
  checkNewPage(22);
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(mg + 5, y, cW - 10, 20, 2, 2, "F");
  doc.setFillColor(234, 179, 8);
  doc.roundedRect(mg + 5, y, 3, 20, 1, 1, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${currency} ${fmt(outstandingAmount)}`, mg + 12, y + 8);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 80, 0);
  doc.text(`(${numToWords(outstandingAmount)})`, mg + 12, y + 16);
  y += 26;

  // Paragraph 3
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  drawJustified(
    "You are hereby required to settle the full outstanding amount within SEVEN (7) DAYS of the date of this notice. Payment should be made to the property management office or via the agreed payment channels."
  );
  y += 3;

  // Paragraph 4
  drawJustified(
    "Failure to remit the outstanding amount within the stipulated period may result in further action, including but not limited to formal eviction proceedings in accordance with the tenancy agreement and applicable laws, and recovery of all associated legal costs."
  );
  y += 3;

  // Paragraph 5
  drawJustified(
    "Should you have any queries or wish to make payment arrangements, please contact our office immediately."
  );

  y += 8;

  // ── Signature block ────────────────────────────────────────────────────────
  checkNewPage(32);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Issued by
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("ISSUED BY", mg + 5, y);
  y += 5;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, mg + 5, y);
  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDate(new Date().toISOString())}`, mg + 5, y);
  y += 12;

  // Signature line
  doc.line(mg + 5, y, mg + 65, y);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Authorised Signature", mg + 5, y + 4);

  doc.line(pageW - mg - 60, y, pageW - mg, y);
  doc.text("Designation / Title", pageW - mg - 60, y + 4);

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(10, 18, 40);
  doc.rect(0, pageH - 11, pageW, 11, "F");
  doc.setFillColor(234, 179, 8);
  doc.rect(0, pageH - 11, 3, 11, "F");
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${ref}  ·  ${companyName}  ·  Generated ${new Date().toLocaleDateString("en-GB")}`, mg, pageH - 4);
  doc.text("OFFICIAL DOCUMENT", pageW - mg, pageH - 4, { align: "right" });

  doc.save(`DemandNote_${tenant.fullName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
