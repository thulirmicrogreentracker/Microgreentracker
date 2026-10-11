import { AlertTriangle, CalendarDays, ChevronRight, Clock, ShoppingBag, Wallet } from 'lucide-react';
import { Customer, Sale, StockLot } from '../../types';
import { formatMoney } from '../../data/shop';
import { formatGrams } from '../../utils/batches';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { stockAlerts, stockByCrop } from '../../utils/stock';
import { customerDue, salesTotal } from '../../utils/sales';

interface ShopTodayProps {
  stock: StockLot[];
  sales: Sale[];
  customers: Customer[];
  currency: string;
  onOpenCrop: (crop: string) => void;
  onStock: () => void;
  onNewSale: () => void;
  onOpenCustomer: (id: string) => void;
}

// Shop's first tab: today's sales, what to sell first and who owes money. Deliveries come with orders.
export default function ShopToday({ stock, sales, customers, currency, onOpenCrop, onStock, onNewSale, onOpenCustomer }: ShopTodayProps) {
  const today = todayLocal();
  const alerts = stockAlerts(stock, today);
  const ready = stockByCrop(stock, today).reduce((n, c) => n + c.available, 0);
  const owing = customers
    .map(c => ({ c, due: customerDue(sales, c.id) }))
    .filter(x => x.due > 0)
    .sort((a, b) => b.due - a.due);
  const owed = owing.reduce((n, x) => n + x.due, 0);
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
        <div>
          <div>
            <strong>{formatMoney(salesTotal(sales, today, today), currency)}</strong>
            <span>Sold today</span>
          </div>
        </div>
        <button onClick={onStock}>
          <div>
            <strong>{formatGrams(ready)}</strong>
            <span>Ready to sell</span>
          </div>
        </button>
      </div>
      <button className="farm-primary" onClick={onNewSale}>
        <ShoppingBag size={18} /> New sale
      </button>
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
      {owing.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Payments due</h2>
            <span>{formatMoney(owed, currency)}</span>
          </div>
          <div className="care-list">
            {owing.slice(0, 5).map(({ c, due }) => (
              <button key={c.id} onClick={() => onOpenCustomer(c.id)}>
                <span className="care-icon supply-low">
                  <Wallet />
                </span>
                <span>
                  <b>{c.name}</b>
                  <small>Owes {formatMoney(due, currency)}</small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
