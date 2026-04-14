import type { StatementEntryBase, StatementRow } from "@/lib/wallet-statement";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const escapeCsvCell = (value: string | number) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const sanitizeFileNameSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "wallet-statement";

const downloadCsv = (fileName: string, csvRows: string[]) => {
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export const exportWalletStatementCsv = <TEntry extends StatementEntryBase>(
  rows: StatementRow<TEntry>[],
  options: {
    fileNamePrefix: string;
    accountName?: string | null;
    includeFlow?: boolean;
  }
) => {
  const headers = ["Date", "Description"];

  if (options.includeFlow) {
    headers.push("Flow");
  }

  headers.push("Amount", "Running Balance");

  const csvRows = [headers.map(escapeCsvCell).join(",")];

  rows.forEach((row) => {
    const values: Array<string | number> = [
      new Date(row.transactionDate).toLocaleString(),
      row.description || "Wallet transaction",
    ];

    if (options.includeFlow) {
      values.push(row.amount > 0 ? "Credit" : row.amount < 0 ? "Debit" : "Neutral");
    }

    values.push(row.amount, row.runningBalance ?? "");
    csvRows.push(values.map(escapeCsvCell).join(","));
  });

  const fileNameParts = [options.fileNamePrefix];
  if (options.accountName) {
    fileNameParts.push(sanitizeFileNameSegment(options.accountName));
  }
  fileNameParts.push(new Date().toISOString().slice(0, 10));

  downloadCsv(`${fileNameParts.join("-")}.csv`, csvRows);
};

export const exportWalletStatementPdf = <TEntry extends StatementEntryBase>(
  rows: StatementRow<TEntry>[],
  options: {
    title: string;
    fileNamePrefix: string;
    accountName?: string | null;
    includeFlow?: boolean;
    formatAmount?: (value: number) => string;
  }
) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const formatAmount = options.formatAmount ?? ((value: number) => String(value));

  doc.setFontSize(16);
  doc.text(options.title, 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

  if (options.accountName) {
    doc.text(`Account: ${options.accountName}`, 14, 32);
  }

  const headers = ["Date", "Description"];
  if (options.includeFlow) {
    headers.push("Flow");
  }
  headers.push("Amount", "Running Balance");

  autoTable(doc, {
    startY: options.accountName ? 38 : 32,
    head: [headers],
    body: rows.map((row) => {
      const values: string[] = [
        new Date(row.transactionDate).toLocaleString(),
        row.description || "Wallet transaction",
      ];

      if (options.includeFlow) {
        values.push(row.amount > 0 ? "Credit" : row.amount < 0 ? "Debit" : "Neutral");
      }

      values.push(
        formatAmount(row.amount),
        row.runningBalance !== null ? formatAmount(row.runningBalance) : "--"
      );

      return values;
    }),
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 120 },
    },
  });

  const fileNameParts = [options.fileNamePrefix];
  if (options.accountName) {
    fileNameParts.push(sanitizeFileNameSegment(options.accountName));
  }
  fileNameParts.push(new Date().toISOString().slice(0, 10));

  doc.save(`${fileNameParts.join("-")}.pdf`);
};