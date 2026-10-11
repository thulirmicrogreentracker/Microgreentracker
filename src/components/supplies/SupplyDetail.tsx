import { useState } from 'react';
import { ChevronRight, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Batch, SupplyItem, SupplyLot } from '../../types';
import { formatMoney } from '../../data/shop';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { formatAmount, isLow, stockOf, takeFromStock, traysCovered } from '../../utils/supplies';

interface SupplyDetailProps {
  item: SupplyItem;
  batches: Batch[];
  currency: string;
  onChange: (item: SupplyItem) => void;
  onEdit: () => void;
  onAddLot: () => void;
  onEditLot: (lotId: string) => void;
  onDelete: () => void;
}

const lotStatus = (lot: SupplyLot, today: string) =>
  lot.remaining === 0 ? 'Used up' : lot.expiresOn && lot.expiresOn < today ? 'Expired' : null;

// One supply: what's in stock, every purchase (newest first) and a way to take some out by hand.
export default function SupplyDetail({ item, batches, currency, onChange, onEdit, onAddLot, onEditLot, onDelete }: SupplyDetailProps) {
  const [useAmount, setUseAmount] = useState('');
  const [message, setMessage] = useState('');
  const today = todayLocal();
  const stock = stockOf(item);
  const trays = traysCovered(item, batches);
  const lots = [...item.lots].sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn));
  const usedBy = batches.filter(b => b.supplyUse?.some(u => u.itemId === item.id)).length;

  const takeOut = () => {
    const n = Number(useAmount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return setMessage('Enter an amount above zero.');
    if (n > stock) return setMessage(`Only ${formatAmount(stock, item.unit)} is in stock.`);
    onChange(takeFromStock(item, n).item);
    setMessage(`${formatAmount(n, item.unit)} taken out.`);
    setUseAmount('');
  };

  return (
    <div className="farm-stack">
      <section className="farm-surface supply-summary">
        <div>
          <strong>{formatAmount(stock, item.unit)}</strong>
          <span>in stock{isLow(item) && <em className="supply-badge">Low</em>}</span>
        </div>
        {trays != null && (
          <div>
            <strong>{trays}</strong>
            <span>trays, about</span>
          </div>
        )}
        <p className="farm-help">
          {item.kind === 'seed' && `New ${item.crop} batches take their seed from here.`}
          {item.kind === 'media' && (item.autoUse ? `Every new batch takes 1 ${item.unit} per ${item.traysPerUnit} trays.` : 'Not taken off for new batches.')}
          {item.lowAt != null && ` Warns at ${formatAmount(item.lowAt, item.unit)}.`}
          {usedBy > 0 && ` Used by ${usedBy} batch${usedBy === 1 ? '' : 'es'}.`}
        </p>
      </section>

      <div className="supply-actions">
        <button className="farm-primary" onClick={onAddLot}>
          <Plus size={18} /> Add purchase
        </button>
        <button className="farm-secondary" onClick={onEdit}>
          <Pencil size={16} /> Edit
        </button>
      </div>

      <section className="farm-surface">
        <h2>Take out by hand</h2>
        <p className="farm-help">For spills, spoiled stock or anything not sown in a batch. It comes off the oldest stock first.</p>
        <div className="supply-take">
          <input
            value={useAmount}
            onChange={e => {
              setUseAmount(e.target.value);
              setMessage('');
            }}
            inputMode="decimal"
            placeholder={`Amount (${item.unit})`}
            aria-label={`Amount to take out, in ${item.unit}`}
          />
          <button className="farm-secondary" onClick={takeOut}>
            <Minus size={16} /> Take out
          </button>
        </div>
        {message && <p className="farm-help" role="status">{message}</p>}
      </section>

      <section>
        <div className="section-heading">
          <h2>Purchases</h2>
          <span>{lots.length}</span>
        </div>
        <div className="care-list">
          {lots.map(lot => {
            const status = lotStatus(lot, today);
            return (
              <button key={lot.id} onClick={() => onEditLot(lot.id)} aria-label={`Purchase of ${formatDate(lot.purchasedOn)}`}>
                <span>
                  <b>
                    {formatAmount(lot.remaining, item.unit)} of {formatAmount(lot.quantity, item.unit)} left
                    {status && <em className="supply-badge">{status}</em>}
                  </b>
                  <small>
                    {formatDate(lot.purchasedOn)}
                    {lot.supplier && ` · ${lot.supplier}`}
                    {lot.price != null && ` · ${formatMoney(lot.price, currency)}`}
                    {lot.expiresOn && ` · expires ${formatDate(lot.expiresOn)}`}
                    {lot.lotNumber && ` · lot ${lot.lotNumber}`}
                  </small>
                </span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </section>

      <button className="farm-danger" onClick={onDelete}>
        <Trash2 size={16} /> Delete {item.name}
      </button>
    </div>
  );
}
