import { useState } from 'react';
import { Download, Users } from 'lucide-react';
import { Batch, Customer, Sale, StockLot, SupplyItem } from '../../types';
import { formatMoney } from '../../data/shop';
import { formatGrams } from '../../utils/batches';
import { addDaysToDate, formatDate, todayLocal } from '../../utils/dateUtils';
import { profitReport, salesCsv } from '../../utils/profit';
import { saleCode } from '../../utils/sales';
import { saveFile } from '../../utils/saveFile';

type Period = 'month' | 'lastMonth' | '30days' | 'year';
const PERIODS: [Period, string][] = [
  ['month', 'This month'],
  ['lastMonth', 'Last month'],
  ['30days', '30 days'],
  ['year', 'This year'],
];

export const periodDates = (period: Period, today: string): [string, string] => {
  const [y, m] = today.split('-').map(Number);
  const first = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`;
  if (period === 'month') return [first(y, m), today];
  if (period === 'lastMonth') {
    const start = m === 1 ? first(y - 1, 12) : first(y, m - 1);
    return [start, addDaysToDate(first(y, m), -1)];
  }
  if (period === '30days') return [addDaysToDate(today, -29), today];
  return [`${y}-01-01`, today];
};

interface ProfitReportProps {
  sales: Sale[];
  batches: Batch[];
  stock: StockLot[];
  supplies: SupplyItem[];
  customers: Customer[];
  currency: string;
  onOpenCustomer: (id: string) => void;
}

// Settings → Profit report: what was sold, what growing it cost, and the profit, by crop and customer.
export default function ProfitReportPanel({ sales, batches, stock, supplies, customers, currency, onOpenCustomer }: ProfitReportProps) {
  const today = todayLocal();
  const [period, setPeriod] = useState<Period>('month');
  const [error, setError] = useState('');
  const [from, to] = periodDates(period, today);
  const r = profitReport(sales, batches, stock, supplies, customers, from, to);
  const money = (n: number) => formatMoney(n, currency);
  const download = async () => {
    setError('');
    try {
      const csv = salesCsv(sales, customers, from, to, saleCode);
      await saveFile(`thulir-sales-${from}-to-${to}.csv`, new Blob([csv], { type: 'text/csv' }), 'text/csv');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the file.');
    }
  };
  return (
    <div className="farm-stack">
      <div className="segmented-control orders-views profit-periods" role="tablist" aria-label="Period">
        {PERIODS.map(([p, label]) => (
          <button key={p} role="tab" aria-selected={period === p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {label}
          </button>
        ))}
      </div>
      <p className="farm-help">
        {formatDate(from)} to {formatDate(to)} · {r.salesCount} sale{r.salesCount === 1 ? '' : 's'}
      </p>

      <section className="farm-surface profit-summary">
        <div>
          <span>Sales</span>
          <strong>{money(r.sales)}</strong>
        </div>
        <div>
          <span>Growing cost</span>
          <strong>{money(r.growCost)}</strong>
        </div>
        <div className={r.profit < 0 ? 'loss' : undefined}>
          <span>Profit</span>
          <strong>{money(r.profit)}</strong>
          {r.margin != null && r.growCost > 0 && <small>{r.margin}% of sales</small>}
        </div>
      </section>

      {r.sales > 0 && r.growCost === 0 && (
        <p className="sale-warn">
          No growing costs recorded for this period. Add your seed and coco peat with what you paid under Farm → Supplies:
          each new batch then records what it uses.
        </p>
      )}
      <section className="farm-surface profit-lines">
        <p>
          <span>Collected</span>
          <b>{money(r.collected)}</b>
        </p>
        <p>
          <span>Still owed on these sales</span>
          <b>{money(r.owed)}</b>
        </p>
        {r.discounts > 0 && (
          <p>
            <span>Discounts given</span>
            <b>{money(r.discounts)}</b>
          </p>
        )}
        <p>
          <span>Spent on supplies bought</span>
          <b>{money(r.suppliesBought)}</b>
        </p>
        <small className="farm-help">
          Growing cost is the seed and growing media each batch used, counted when it was harvested (or lost). Spent on
          supplies is what you paid for supplies bought in this period, packaging included.
        </small>
      </section>

      <section>
        <div className="section-heading">
          <h2>By crop</h2>
          <span>{r.crops.length}</span>
        </div>
        {r.crops.length ? (
          <div className="care-list">
            {r.crops.map(c => (
              <div key={c.crop} className="care-row-static profit-crop">
                <span>
                  <b>{c.crop}</b>
                  <small>
                    {formatGrams(c.gramsSold)} sold · {money(c.sales)} sales · {money(c.growCost)} cost
                    {c.wasteGrams > 0 && ` · ${formatGrams(c.wasteGrams)} wasted`}
                  </small>
                </span>
                <strong className={c.profit < 0 ? 'loss' : undefined}>{money(c.profit)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="farm-help">No sales or harvests in this period.</p>
        )}
      </section>

      {r.customers.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Top customers</h2>
          </div>
          <div className="care-list">
            {r.customers.map(c => (
              <button key={c.id} onClick={() => onOpenCustomer(c.id)} disabled={!customers.some(x => x.id === c.id)}>
                <span className="care-icon lime">
                  <Users />
                </span>
                <span>
                  <b>{c.name}</b>
                </span>
                <strong>{money(c.sales)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <button className="farm-secondary" onClick={download} disabled={!r.salesCount}>
        <Download size={16} /> Download sales (CSV)
      </button>
      {error && (
        <p role="alert" className="supply-error">
          {error}
        </p>
      )}
    </div>
  );
}
