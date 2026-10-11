import { AlertTriangle, ChevronRight, Clock, Plus } from 'lucide-react';
import { StockLot } from '../../types';
import { formatGrams } from '../../utils/batches';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { movedSince, stockAlerts, stockByCrop } from '../../utils/stock';
import TrayArt from '../farm/TrayArt';

interface StockPanelProps {
  stock: StockLot[];
  onOpenCrop: (crop: string) => void;
  onAdd: () => void;
}

// The Stock tab: harvested microgreens by crop, what to sell first, and this month's harvest, sales and waste.
export default function StockPanel({ stock, onOpenCrop, onAdd }: StockPanelProps) {
  const today = todayLocal();
  const crops = stockByCrop(stock, today);
  const alerts = stockAlerts(stock, today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const harvested = stock.filter(l => l.harvestedOn >= monthStart).reduce((n, l) => n + l.grams, 0);
  const total = crops.reduce((n, c) => n + c.available, 0);

  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">FROM HARVEST TO SALE</p>
          <h1>Stock</h1>
          <p>What's harvested and ready to sell.</p>
        </div>
        <button className="farm-icon-button" onClick={onAdd} aria-label="Add stock">
          <Plus />
        </button>
      </div>

      <div className="farm-metrics">
        <div>
          <div>
            <strong>{formatGrams(total)}</strong>
            <span>Ready to sell</span>
          </div>
        </div>
        <div>
          <div>
            <strong>{formatGrams(movedSince(stock, 'waste', monthStart))}</strong>
            <span>Wasted this month</span>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <section className="supply-alerts" aria-label="Sell soon or past use-by">
          {alerts.map(({ lot, expired }) => (
            <button key={lot.id} onClick={() => onOpenCrop(lot.crop)}>
              {expired ? <AlertTriangle aria-hidden /> : <Clock aria-hidden />}
              <span>
                <b>{lot.crop}</b> · {expired ? 'past its use-by date' : lot.useBy === today ? 'use today' : 'use by tomorrow'}
                <small>
                  {formatGrams(lot.remaining)} · harvested {formatDate(lot.harvestedOn)}
                </small>
              </span>
            </button>
          ))}
        </section>
      )}

      {crops.length === 0 ? (
        <section className="farm-surface supply-empty">
          <h2>Nothing in stock</h2>
          <p className="farm-help">
            When you weigh a harvest, its grams come here, with a use-by date from the crop's shelf life. You can also add
            stock by hand.
          </p>
          <button className="farm-secondary" onClick={onAdd}>
            <Plus size={18} /> Add stock
          </button>
        </section>
      ) : (
        <section>
          <div className="section-heading">
            <h2>By crop</h2>
            <span>{formatGrams(harvested)} harvested this month</span>
          </div>
          <div className="rack-batches">
            {crops.map(c => (
              <button key={c.crop} className="rack-batch" onClick={() => onOpenCrop(c.crop)}>
                <TrayArt stage="harvest" />
                <span>
                  <b>{c.crop}</b>
                  <small>
                    {formatGrams(c.available)} to sell{c.nextUseBy && ` · use by ${formatDate(c.nextUseBy)}`}
                  </small>
                  {c.expired > 0 && <small className="stock-expired">{formatGrams(c.expired)} past use-by</small>}
                </span>
                {c.useSoon > 0 && <span className="stage-badge stage-harvest">Sell soon</span>}
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
