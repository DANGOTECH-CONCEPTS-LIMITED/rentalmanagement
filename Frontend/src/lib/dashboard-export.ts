import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type DashboardCell = string | number | boolean | null | undefined;

export interface DashboardSummaryMetric {
  label: string;
  value: DashboardCell;
}

export interface DashboardWorkbookSection {
  sheetName: string;
  columns: string[];
  rows: DashboardCell[][];
}

export interface DashboardWorkbookImage {
  title: string;
  element: HTMLElement;
  sheetName?: string;
  backgroundColor?: string;
  maxWidth?: number;
}

interface ExportDashboardPdfOptions {
  fileNamePrefix: string;
  backgroundColor?: string;
}

interface ExportDashboardWorkbookOptions {
  title: string;
  fileNamePrefix: string;
  summary?: DashboardSummaryMetric[];
  metadata?: DashboardSummaryMetric[];
  sections?: DashboardWorkbookSection[];
  images?: DashboardWorkbookImage[];
}

const sanitizeFileNameSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "dashboard-export";

const sanitizeSheetName = (value: string) => {
  const sanitized = value.replace(/[\\/?*\[\]:]/g, " ").trim();
  return (sanitized || "Sheet").slice(0, 31);
};

const buildDatedFileName = (prefix: string, extension: string) => {
  const safePrefix = sanitizeFileNameSegment(prefix);
  const dateSegment = new Date().toISOString().slice(0, 10);
  return `${safePrefix}-${dateSegment}.${extension}`;
};

const downloadFile = (fileName: string, blob: Blob) => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

const getColumnWidths = (rows: DashboardCell[][]) => {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const width = rows.reduce((maxWidth, row) => {
      const cellLength = String(row[columnIndex] ?? "").length;
      return Math.max(maxWidth, cellLength);
    }, 12);

    return { width: Math.min(Math.max(width + 2, 12), 40) };
  });
};

const captureElementImage = async (image: DashboardWorkbookImage) => {
  const canvas = await html2canvas(image.element, {
    backgroundColor: image.backgroundColor ?? "#ffffff",
    scale: Math.max(window.devicePixelRatio, 2),
    useCORS: true,
    logging: false,
    ignoreElements: (node) => node.hasAttribute("data-dashboard-export-ignore"),
  });

  return {
    title: image.title,
    sheetName: image.sheetName ?? "Graphs",
    maxWidth: image.maxWidth ?? 960,
    base64: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
};

export const exportDashboardPdf = async (
  element: HTMLElement,
  options: ExportDashboardPdfOptions
) => {
  const canvas = await html2canvas(element, {
    backgroundColor: options.backgroundColor ?? "#ffffff",
    scale: Math.max(window.devicePixelRatio, 2),
    useCORS: true,
    logging: false,
    ignoreElements: (node) => node.hasAttribute("data-dashboard-export-ignore"),
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const imageData = canvas.toDataURL("image/png");
  const printablePageHeight = pageHeight - margin * 2;

  let remainingHeight = imageHeight;
  let offsetY = margin;

  pdf.addImage(imageData, "PNG", margin, offsetY, imageWidth, imageHeight, undefined, "FAST");
  remainingHeight -= printablePageHeight;

  while (remainingHeight > 0) {
    pdf.addPage();
    offsetY = margin - (imageHeight - remainingHeight);
    pdf.addImage(imageData, "PNG", margin, offsetY, imageWidth, imageHeight, undefined, "FAST");
    remainingHeight -= printablePageHeight;
  }

  pdf.save(buildDatedFileName(options.fileNamePrefix, "pdf"));
};

export const exportDashboardWorkbook = async ({
  title,
  fileNamePrefix,
  summary = [],
  metadata = [],
  sections = [],
  images = [],
}: ExportDashboardWorkbookOptions) => {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GitHub Copilot";
  workbook.created = new Date();

  const overviewRows: DashboardCell[][] = [[title], [], ["Generated", new Date().toLocaleString()]];

  if (metadata.length > 0) {
    overviewRows.push([], ["Metadata"]);
    metadata.forEach((item) => {
      overviewRows.push([item.label, item.value]);
    });
  }

  if (summary.length > 0) {
    overviewRows.push([], ["Summary"]);
    summary.forEach((item) => {
      overviewRows.push([item.label, item.value]);
    });
  }

  const overviewSheet = workbook.addWorksheet("Overview");
  overviewRows.forEach((row) => {
    overviewSheet.addRow(row.map((cell) => cell ?? ""));
  });
  overviewSheet.columns = getColumnWidths(overviewRows);
  overviewSheet.getRow(1).font = { bold: true, size: 16 };

  sections.forEach((section, index) => {
    const sheetRows: DashboardCell[][] = [section.columns, ...section.rows];
    const worksheet = workbook.addWorksheet(
      sanitizeSheetName(section.sheetName || `Sheet ${index + 1}`)
    );

    sheetRows.forEach((row) => {
      worksheet.addRow(row.map((cell) => cell ?? ""));
    });

    worksheet.columns = getColumnWidths(sheetRows);
    worksheet.getRow(1).font = { bold: true };
  });

  if (images.length > 0) {
    const imageGroups = new Map<string, Awaited<ReturnType<typeof captureElementImage>>[]>();

    for (const image of images) {
      const capturedImage = await captureElementImage(image);
      const sheetName = sanitizeSheetName(capturedImage.sheetName);
      const group = imageGroups.get(sheetName) ?? [];
      group.push(capturedImage);
      imageGroups.set(sheetName, group);
    }

    imageGroups.forEach((group, sheetName) => {
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.getColumn(1).width = 28;
      worksheet.getColumn(2).width = 28;
      let currentRow = 1;

      group.forEach((image) => {
        worksheet.getCell(`A${currentRow}`).value = image.title;
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 13 };
        currentRow += 1;

        const imageId = workbook.addImage({
          base64: image.base64,
          extension: "png",
        });

        const targetWidth = Math.min(image.maxWidth, image.width);
        const scale = targetWidth / image.width;
        const targetHeight = Math.round(image.height * scale);

        worksheet.addImage(imageId, {
          tl: { col: 0, row: currentRow - 1 },
          ext: { width: targetWidth, height: targetHeight },
        });

        currentRow += Math.ceil(targetHeight / 20) + 3;
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(
    buildDatedFileName(fileNamePrefix, "xlsx"),
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
};