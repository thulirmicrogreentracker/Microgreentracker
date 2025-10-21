import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Batch } from '../types';
import { formatDate, getDaysSince } from './dateUtils';

export const exportBatchToPDF = async (batch: Batch): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Batch Report: ${batch.cropType}`, margin, yPosition);
  yPosition += 15;

  // Basic Info
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Tray ID: ${batch.trayId}`, margin, yPosition);
  yPosition += 8;
  pdf.text(`Sowing Date: ${formatDate(batch.sowingDate)}`, margin, yPosition);
  yPosition += 8;
  pdf.text(`Expected Harvest: ${formatDate(batch.expectedHarvestDate)}`, margin, yPosition);
  yPosition += 8;
  pdf.text(`Current Stage: ${batch.stage.charAt(0).toUpperCase() + batch.stage.slice(1)}`, margin, yPosition);
  yPosition += 8;
  pdf.text(`Days Since Sowing: ${getDaysSince(batch.sowingDate)}`, margin, yPosition);
  yPosition += 15;

  // Yield Info
  if (batch.yieldAmount) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Yield Information:', margin, yPosition);
    yPosition += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Amount: ${batch.yieldAmount} ${batch.yieldUnit || 'units'}`, margin, yPosition);
    yPosition += 15;
  }

  // Notes
  if (batch.notes.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', margin, yPosition);
    yPosition += 8;
    pdf.setFont('helvetica', 'normal');
    
    batch.notes.forEach(note => {
      const noteText = `${formatDate(note.timestamp)} - ${note.content}`;
      const lines = pdf.splitTextToSize(noteText, pageWidth - 2 * margin);
      pdf.text(lines, margin, yPosition);
      yPosition += lines.length * 6;
    });
  }

  pdf.save(`${batch.cropType}_${batch.trayId}_report.pdf`);
};

export const exportAllBatchesToCSV = (batches: Batch[]): void => {
  const headers = [
    'Tray ID',
    'Crop Type',
    'Sowing Date',
    'Expected Harvest',
    'Actual Harvest',
    'Stage',
    'Days Since Sowing',
    'Yield Amount',
    'Yield Unit',
    'Notes Count',
    'Photos Count'
  ];

  const csvContent = [
    headers.join(','),
    ...batches.map(batch => [
      batch.trayId,
      batch.cropType,
      batch.sowingDate,
      batch.expectedHarvestDate,
      batch.actualHarvestDate || '',
      batch.stage,
      getDaysSince(batch.sowingDate),
      batch.yieldAmount || '',
      batch.yieldUnit || '',
      batch.notes.length,
      batch.photos.length
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `microgreen_batches_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};