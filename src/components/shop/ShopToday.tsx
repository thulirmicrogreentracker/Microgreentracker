import { AlertTriangle, CalendarDays, ChevronRight, Clock, Share2, ShoppingBag, TrendingUp, Truck, Wallet } from 'lucide-react';
import { Customer, Order, Sale, StockLot, Subscription } from '../../types';
import { formatMoney } from '../../data/shop';
import { formatGrams } from '../../utils/batches';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { stockAlerts, stockByCrop } from '../../utils/stock';
import { customerDue, salesTotal } from '../../utils/sales';
import { Delivery, deliveriesBetween } from '../../utils/orders';
import { DeliveryRows } from './Orders';

interface ShopTodayProps {
  stock: StockLot[];
  sales: Sale[];
  customers: Customer[];
  orders: Order[];
  subscriptions: Subscription[];
  currency: string;
  onDeliver: (d: Delivery) => void;
  onOpenDelivery: (d: Delivery) => void;
  onShareDeliveries: (deliveries: Delivery[]) => void;
  onProfit: () => void;
  onOpenCrop: (crop: string) => void;
  onStock: () => void;
  onNewSale: () => void;
  onOpenCustomer: (id: string) => void;
}

// Shop's first tab: today's deliveries, today's sales, what to sell first and who owes money.
export default function ShopToday(props: ShopTodayProps) {
  const { stock, sales, customers, orders, subscriptions, currency, onOpenCrop, onStock, onNewSale, onOpenCustomer } = props;
  const today = todayLocal();
  const alerts = stockAlerts(stock, today);
  const byCrop = stockByCrop(stock, today);
  const ready = byCrop.reduce((n, c) => n + c.available, 0);
  // Today's deliveries, and orders that were due earlier.
  const deliveries = deliveriesBetween(orders, subscriptions, today, today, true);
  const need = new Map<string, number>();
  for (const d of deliveries) for (const i of d.items) need.set(i.crop, (need.get(i.crop) ?? 0) + i.grams);
  const short = [...need]
    .map(([crop, grams]) => ({ crop, grams, have: byCrop.find(c => c.crop.toLowerCase() === crop.toLowerCase())?.available ?? 0 }))
    .filter(x => x.have < x.grams);
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
          <h2>Deliveries</h2>
          <span>{deliveries.length}</span>
        </div>
        {deliveries.length > 0 ? (
          <>
            <DeliveryRows deliveries={deliveries} customers={customers} onOpen={props.onOpenDelivery} onDeliver={props.onDeliver} />
            {short.length > 0 && (
              <p className="sale-warn delivery-short">
                Not enough in stock: {short.map(x => `${x.crop} needs ${formatGrams(x.grams)}, ${formatGrams(x.have)} ready`).join('; ')}.
              </p>
            )}
            <button className="farm-secondary share-list" onClick={() => props.onShareDeliveries(deliveries)}>
              <Share2 size={16} /> Share delivery list
            </button>
          </>
        ) : (
          <div className="care-list">
            <div className="care-empty">
              <Truck />
              <span>No deliveries today.</span>
            </div>
          </div>
        )}
      </section>
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
      <button className="farm-secondary" onClick={props.onProfit}>
        <TrendingUp size={16} /> Profit report
      </button>
    </div>
  );
}
