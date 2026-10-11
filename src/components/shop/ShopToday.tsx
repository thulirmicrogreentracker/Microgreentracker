import { AlertTriangle, CalendarDays, ChevronRight, Clock } from 'lucide-react';
import { StockLot } from '../../types';
import { formatGrams } from '../../utils/batches';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { stockAlerts, stockByCrop } from '../../utils/stock';

interface ShopTodayProps {
  stock: StockLot[];
  onOpenCrop: (crop: string) => void;
  onStock: () => void;
}

// Shop's first tab: what needs doing today. Deliveries and payments come with orders.
export default function ShopToday({ stock, onOpenCrop, onStock }: ShopTodayProps) {
  const today = todayLocal();
  const alerts = stockAlerts(stock, today);
  const crops = stockByCrop(stock, today);
  const ready = crops.reduce((n, c) => n + c.available, 0);
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">YOUR SHOP TODAY</p>
          <h1>Today</h1>
          <p>{formatDate(today)}</p>
        </div>
      </div>
      <div className="farm-metrics">
        <button onClick={onStock}>
          <div>
            <strong>{formatGrams(ready)}</strong>
            <span>Ready to sell</span>
          </div>
        </button>
        <button onClick={onStock}>
          <div>
            <strong>{crops.filter(c => c.available > 0).length}</strong>
            <span>Crops in stock</span>
          </div>
        </button>
      </div>
      <section>
        <div className="section-heading">
          <h2>Sell first</h2>
          <span>{alerts.length}</span>
        </div>
        <div className="care-list">
          {alerts.map(({ lot, expired }) => (
            <button key={lot.id} onClick={() => onOpenCrop(lot.crop)}>
              <span className={`care-icon ${expired ? 'supply-low' : 'lime'}`}>{expired ? <AlertTriangle /> : <Clock />}</span>
              <span>
                <b>
                  {lot.crop} · {formatGrams(lot.remaining)}
                </b>
                <small>{expired ? 'Past its use-by date' : lot.useBy === today ? 'Use today' : `Use by ${formatDate(lot.useBy)}`}</small>
              </span>
              <ChevronRight />
            </button>
          ))}
          {alerts.length === 0 && (
            <div className="care-empty">
              <CalendarDays />
              <span>Nothing close to its use-by date.</span>
            </div>
          )}
        </div>
      </section>
      <section className="farm-surface coming-soon">
        <h2>Coming next</h2>
        <ul>
          <li>Today's deliveries, from orders and subscriptions</li>
          <li>Payments due</li>
        </ul>
      </section>
    </div>
  );
}
