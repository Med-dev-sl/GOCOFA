import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  key: string;
}

function normalizeRows(rows: Record<string, unknown>[], columns: ExportColumn[]) {
  return rows.map((row) => Object.fromEntries(columns.map((column) => [column.header, row[column.key] ?? ""])));
}

export function exportRowsToExcel(rows: Record<string, unknown>[], columns: ExportColumn[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(normalizeRows(rows, columns));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "GOCOFA Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportRowsToPdf(rows: Record<string, unknown>[], columns: ExportColumn[], filename: string, title: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFillColor(11, 107, 53);
  doc.rect(0, 0, 297, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("GOCOFA", 14, 10);
  doc.setFontSize(9);
  doc.text("Agricultural Cooperative & Traceability Platform", 14, 16);
  doc.setFontSize(16);
  doc.text(title, 14, 35);
  doc.setTextColor(90, 103, 96);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 41);

  autoTable(doc, {
    startY: 47,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => String(row[column.key] ?? ""))),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [11, 107, 53], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 248, 245] },
  });

  doc.save(`${filename}.pdf`);
}

export function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read Excel file"));
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
