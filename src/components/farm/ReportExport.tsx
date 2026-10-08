import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Batch } from '../../types';
import { batchCode, batchYieldGrams, isBatchLost } from '../../utils/batches';
import { saveFile } from '../../utils/saveFile';
import { exportAllBatchesToCSV } from '../../utils/exportUtils';
export default function ReportExport({ batches }: { batches: Batch[] }) {
  const [crop, setCrop] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const selected = batches.filter(
    (b) => (!crop || b.cropType === crop) && (!from || b.sowingDate >= from) && (!to || b.sowingDate <= to)
  );
  const download = async (type: 'pdf' | 'csv') => {
    setError('');
    if (from && to && from > to) {
      setError('The end date must be on or after the start date.');
      return;
    }
    setBusy(true);
    try {
      if (type === 'csv') await exportAllBatchesToCSV(selected);
      else {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF();
        let y = 22;
        pdf.setFontSize(20);
        pdf.text('Thulir - Production Report', 14, y);
        y += 12;
        pdf.setFontSize(10);
        pdf.text(`Sowing dates: ${from || 'All'} to ${to || 'All'} | ${selected.length} batches`, 14, y);
        y += 12;
        for (const b of selected) {
          const lines = pdf.splitTextToSize(
            `${batchCode(b.batchNumber)} | ${b.cropType} | ${isBatchLost(b) ? 'lost' : b.stage}\nSown ${
              b.sowingDate
            } | ${b.trays.length} trays | ${b.trays.filter((t) => t.status === 'lost').length} lost | ${Math.round(
              batchYieldGrams(b)
            )} g harvested`,
            180
          );
          if (y + lines.length * 5 > 278) {
            pdf.addPage();
            y = 18;
          }
          pdf.text(lines, 14, y);
          y += lines.length * 5 + 8;
        }
        await saveFile('thulir-production-report.pdf', pdf.output('blob'), 'application/pdf');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export the report.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="farm-surface report-export">
      <div className="section-heading">
        <h2>
          <FileText size={18} /> Generate report
        </h2>
        <span>{selected.length} batches</span>
      </div>
      <label>
        Crop variety
        <select value={crop} onChange={(e) => setCrop(e.target.value)}>
          <option value="">All varieties</option>
          {[...new Set(batches.map((b) => b.cropType))].sort().map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="date-filters">
        <label>
          Sown from
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Sown until
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <p className="farm-help">
        Production summary for batches sown in this period. Includes tray counts, losses and recorded harvest weights.
      </p>
      <div className="export-actions">
        <button className="farm-primary" disabled={busy || !selected.length} onClick={() => download('pdf')}>
          <Download size={16} />
          {busy ? 'Preparing…' : 'PDF report'}
        </button>
        <button className="farm-secondary" disabled={busy || !selected.length} onClick={() => download('csv')}>
          Export CSV
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
