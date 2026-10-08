import jsPDF from "jspdf";
import { Batch } from "../types";
import { formatDate, getDaysSince } from "./dateUtils";
import {
  batchCode,
  batchSeedGrams,
  batchYieldGrams,
  formatGrams,
  lostTrays,
} from "./batches";
import { saveFile } from "./saveFile";

export const exportBatchToPDF = async (batch: Batch): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Batch Report: ${batch.cropType}`, margin, yPosition);
  yPosition += 15;

  // Basic Info
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Batch: ${batchCode(batch.batchNumber)}`, margin, yPosition);
  yPosition += 8;
  pdf.text(
    `Trays: ${batch.trays.map((t) => t.code + (t.status === "lost" ? " (lost)" : "")).join(", ")}`,
    margin,
    yPosition,
  );
  yPosition += 8;
  pdf.text(`Sowing Date: ${formatDate(batch.sowingDate)}`, margin, yPosition);
  yPosition += 8;
  pdf.text(
    `Expected Harvest: ${formatDate(batch.expectedHarvestDate)}`,
    margin,
    yPosition,
  );
  yPosition += 8;
  pdf.text(
    `Current Stage: ${batch.stage.charAt(0).toUpperCase() + batch.stage.slice(1)}`,
    margin,
    yPosition,
  );
  yPosition += 8;
  pdf.text(
    `Days Since Sowing: ${getDaysSince(batch.sowingDate)}`,
    margin,
    yPosition,
  );
  yPosition += 15;

  // Yield Info
  if (batchYieldGrams(batch) > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Yield Information:", margin, yPosition);
    yPosition += 8;
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Harvested: ${formatGrams(batchYieldGrams(batch))}`,
      margin,
      yPosition,
    );
    yPosition += 8;
    for (const t of batch.trays.filter((t) => t.harvestWeight != null)) {
      pdf.text(
        `  ${t.code}: ${formatGrams(t.harvestWeight ?? 0)}`,
        margin,
        yPosition,
      );
      yPosition += 6;
    }
    yPosition += 9;
  }

  // Notes
  if (batch.notes.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes:", margin, yPosition);
    yPosition += 8;
    pdf.setFont("helvetica", "normal");

    batch.notes.forEach((note) => {
      const noteText = `${formatDate(note.timestamp)} - ${note.content}`;
      const lines = pdf.splitTextToSize(noteText, pageWidth - 2 * margin);
      pdf.text(lines, margin, yPosition);
      yPosition += lines.length * 6;
    });
  }

  await saveFile(
    `${batch.cropType}_${batchCode(batch.batchNumber)}_report.pdf`,
    pdf.output("blob"),
    "application/pdf",
  );
};

export const exportAllBatchesToCSV = (batches: Batch[]): Promise<void> => {
  const headers = [
    "Batch",
    "Trays",
    "Trays Lost",
    "Crop Type",
    "Sowing Date",
    "Expected Harvest",
    "Actual Harvest",
    "Stage",
    "Days Since Sowing",
    "Seed (g)",
    "Harvested (g)",
    "Notes Count",
    "Photos Count",
  ];

  // Quote delimiters/newlines and neutralize spreadsheet formula prefixes in user labels.
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csvContent = [
    headers.join(","),
    ...batches.map((batch) =>
      [
        batchCode(batch.batchNumber),
        batch.trays.map((t) => t.code).join(" "),
        lostTrays(batch).length,
        batch.cropType,
        batch.sowingDate,
        batch.expectedHarvestDate,
        batch.actualHarvestDate || "",
        batch.stage,
        getDaysSince(batch.sowingDate),
        batchSeedGrams(batch) || "",
        Math.round(batchYieldGrams(batch)) || "",
        batch.notes.length,
        batch.photos.length,
      ]
        .map(cell)
        .join(","),
    ),
  ].join("\n");

  return saveFile(
    `thulir_microgreen_batches_${new Date().toISOString().split("T")[0]}.csv`,
    csvContent,
    "text/csv",
  );
};
