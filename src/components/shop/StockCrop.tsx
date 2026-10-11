import { useState } from 'react';
import { Batch, CropType, StockLot, StockMove } from '../../types';
import { batchCode, formatGrams } from '../../utils/batches';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { isExpired, isUseSoon, newStockLot, shelfLife } from '../../utils/stock';

interface StockCropProps {
  crop: string;
  stock: StockLot[];
  batches: Batch[];
  onMove: (lotId: string, move: Omit<StockMove, 'id'>) => void;
}

const moveLabel: Record<StockMove['kind'], string> = { sold: 'Sold', waste: 'Wasted', adjust: 'Corrected' };

// One crop's stock: each harvest with its use-by date, and recording waste or correcting the amount.
export default function StockCrop({ crop, stock, batches, onMove }: StockCropProps) {
  const today = todayLocal();
  const lots = stock
    .filter(l => l.crop.toLowerCase() === crop.toLowerCase())
    .sort((a, b) => (b.remaining > 0 ? 1 : 0) - (a.remaining > 0 ? 1 : 0) || a.useBy.localeCompare(b.useBy));
  const [open, setOpen] = useState<string | null>(null);
  const [grams, setGrams] = useState('');
  const [error, setError] = useState('');

  const act = (lot: StockLot, kind: 'waste' | 'adjust') => {
    const n = Number(grams.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || (kind === 'waste' && n === 0)) return setError('Enter the grams.');
    if (kind === 'waste' && n > lot.remaining) return setError(`Only ${formatGrams(lot.remaining)} is left.`);
    // A correction sets what's left; the move records the change.
    onMove(lot.id, { date: today, kind, grams: kind === 'waste' ? n : Math.round((n - lot.remaining) * 10) / 10 });
    setOpen(null);
    setGrams('');
  };

  return (
    <div className="farm-stack">
      {lots.length === 0 && <p className="farm-help">No {crop} in stock.</p>}
      {lots.map(lot => {
        const batch = batches.find(b => b.id === lot.batchId);
        const expired = isExpired(lot, today);
        return (
          <section key={lot.id} className="farm-surface stock-lot">
            <div className="stock-lot-head">
              <div>
                <b>
                  {formatGrams(lot.remaining)} of {formatGrams(lot.grams)} left
                </b>
                <small>
                  Harvested {formatDate(lot.harvestedOn)}
                  {batch && ` · ${batchCode(batch.batchNumber)}`}
                  {lot.note && ` · ${lot.note}`}
                </small>
              </div>
              {lot.remaining > 0 && (
                <span className={`stage-badge ${expired ? 'stage-lost' : isUseSoon(lot, today) ? 'stage-harvest' : 'stage-growth'}`}>
                  {expired ? 'Past use-by' : `Use by ${formatDate(lot.useBy)}`}
                </span>
              )}
            </div>
            {lot.moves.length > 0 && (
              <ul className="stock-moves">
                {[...lot.moves].reverse().map(m => (
                  <li key={m.id}>
                    {formatDate(m.date)} · {moveLabel[m.kind]} {formatGrams(Math.abs(m.grams))}
                    {m.kind === 'adjust' && (m.grams >= 0 ? ' more' : ' less')}
                  </li>
                ))}
              </ul>
            )}
            {open === lot.id ? (
              <div className="stock-act">
                <input
                  value={grams}
                  onChange={e => {
                    setGrams(e.target.value);
                    setError('');
                  }}
                  inputMode="decimal"
                  placeholder="Grams"
                  aria-label="Grams"
                  autoFocus
                />
                <button className="farm-danger" onClick={() => act(lot, 'waste')}>
                  Waste
                </button>
                <button className="farm-secondary" onClick={() => act(lot, 'adjust')}>
                  Set left
                </button>
                {error && (
                  <p role="alert" className="supply-error">
                    {error}
                  </p>
                )}
              </div>
            ) : (
              lot.remaining > 0 && (
                <button
                  className="stock-edit"
                  onClick={() => {
                    setOpen(lot.id);
                    setGrams(String(lot.remaining));
                    setError('');
                  }}
                >
                  {expired ? 'Throw away or correct' : 'Record waste or correct'}
                </button>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}

interface AddStockProps {
  cropTypes: CropType[];
  onSave: (lot: StockLot) => void;
}

// Stock added by hand: bought in, or harvested before the app tracked it.
export function AddStock({ cropTypes, onSave }: AddStockProps) {
  const [crop, setCrop] = useState('');
  const [grams, setGrams] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const save = () => {
    const n = Number(grams.replace(',', '.'));
    if (!crop) return setError('Choose the crop.');
    if (!Number.isFinite(n) || n <= 0) return setError('Enter the grams.');
    if (date > todayLocal()) return setError('The harvest date is in the future.');
    onSave(newStockLot(crop, n, date, cropTypes, note.trim() || undefined));
  };
  return (
    <div className="farm-stack supply-form">
      <section className="farm-surface">
        <label className="supply-field">
          <span>Crop</span>
          <select value={crop} onChange={e => setCrop(e.target.value)}>
            <option value="">Choose a crop</option>
            {[...cropTypes].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="supply-row">
          <label className="supply-field">
            <span>Grams</span>
            <input value={grams} onChange={e => setGrams(e.target.value)} inputMode="decimal" placeholder="500" />
          </label>
          <label className="supply-field">
            <span>Harvested on</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
        </div>
        <label className="supply-field">
          <span>Note</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </label>
        {crop && <p className="farm-help">Keeps {shelfLife(crop, cropTypes)} days, so use by {formatDate(newStockLot(crop, 1, date, cropTypes).useBy)}.</p>}
      </section>
      {error && (
        <p role="alert" className="supply-error">
          {error}
        </p>
      )}
      <button className="farm-primary" onClick={save}>
        Add to stock
      </button>
    </div>
  );
}
