import { Batch, Customer, Sale, StockLot, SupplyItem } from '../types';
import { isBatchLost } from './batches';
import { batchSupplyCost } from './supplies';
import { dueOn } from './sales';

const money = (n: number) => Math.round(n * 100) / 100;
const inRange = (date: string | undefined, from: string, to: string) => !!date && date >= from && date <= to;

export interface CropProfit {
  crop: string;
  gramsSold: number;
  sales: number; // before discounts
  wasteGrams: number;
  growCost: number;
  profit: number; // sales − grow cost
}

export interface ProfitReport {
  sales: number; // after discounts
  discounts: number;
  salesCount: number;
  collected: number; // payments received in the period, for any sale
  owed: number; // still owed on the period's sales
  growCost: number; // supplies used by batches harvested (or lost) in the period
  suppliesBought: number; // what was paid for supplies bought in the period
  profit: number; // sales − grow cost
  margin: number | null; // profit as a % of sales
  crops: CropProfit[];
  customers: { id: string; name: string; sales: number }[];
}

// When a batch's growing ended: its harvest, or the day its last tray was lost.
export const batchEnded = (b: Batch): string | undefined =>
  b.stage === 'completed'
    ? b.actualHarvestDate ?? b.expectedHarvestDate
    : isBatchLost(b)
      ? b.trays.map(t => t.lostDate ?? '').sort().slice(-1)[0] || undefined
      : undefined;

// Sales, costs and profit between two dates (inclusive). A batch's cost (the seed and growing media it used) counts in
// the period its growing ended, next to the sales of its harvest.
export const profitReport = (
  sales: Sale[],
  batches: Batch[],
  stock: StockLot[],
  supplies: SupplyItem[],
  customers: Customer[],
  from: string,
  to: string
): ProfitReport => {
  const inPeriod = sales.filter(s => inRange(s.date, from, to));
  const crops = new Map<string, CropProfit>();
  const crop = (name: string) => {
    const key = name.toLowerCase();
    if (!crops.has(key)) crops.set(key, { crop: name, gramsSold: 0, sales: 0, wasteGrams: 0, growCost: 0, profit: 0 });
    return crops.get(key)!;
  };
  for (const s of inPeriod)
    for (const i of s.items) {
      const c = crop(i.crop);
      c.gramsSold += i.grams;
      c.sales += i.amount;
    }
  for (const lot of stock)
    for (const m of lot.moves) if (m.kind === 'waste' && inRange(m.date, from, to)) crop(lot.crop).wasteGrams += m.grams;
  for (const b of batches) if (inRange(batchEnded(b), from, to)) crop(b.cropType).growCost += batchSupplyCost(b);

  const byCustomer = new Map<string, number>();
  for (const s of inPeriod) if (s.customerId) byCustomer.set(s.customerId, (byCustomer.get(s.customerId) ?? 0) + s.total);

  const total = money(inPeriod.reduce((n, s) => n + s.total, 0));
  const growCost = money([...crops.values()].reduce((n, c) => n + c.growCost, 0));
  const profit = money(total - growCost);
  return {
    sales: total,
    discounts: money(inPeriod.reduce((n, s) => n + (s.discount ?? 0), 0)),
    salesCount: inPeriod.length,
    collected: money(sales.reduce((n, s) => n + s.payments.filter(p => inRange(p.date, from, to)).reduce((m, p) => m + p.amount, 0), 0)),
    owed: money(inPeriod.reduce((n, s) => n + dueOn(s), 0)),
    growCost,
    suppliesBought: money(supplies.reduce((n, item) => n + item.lots.filter(l => inRange(l.purchasedOn, from, to)).reduce((m, l) => m + (l.price ?? 0), 0), 0)),
    profit,
    margin: total > 0 ? Math.round((profit / total) * 100) : null,
    crops: [...crops.values()]
      .filter(c => c.sales || c.growCost || c.wasteGrams) // a harvest with no cost recorded and no sales says nothing
      .map(c => ({ ...c, sales: money(c.sales), growCost: money(c.growCost), profit: money(c.sales - c.growCost) }))
      .sort((a, b) => b.sales - a.sales || b.growCost - a.growCost || a.crop.localeCompare(b.crop)),
    customers: [...byCustomer]
      .map(([id, amount]) => ({ id, name: customers.find(c => c.id === id)?.name ?? 'Deleted customer', sales: money(amount) }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5),
  };
};

// The period's sales, one line per crop sold, for a spreadsheet.
export const salesCsv = (sales: Sale[], customers: Customer[], from: string, to: string, saleCode: (n: number) => string) => {
  const cell = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [['Date', 'Sale', 'Customer', 'Crop', 'Grams', 'Amount', 'Sale discount', 'Sale total', 'Paid', 'Owed']];
  for (const s of sales.filter(x => inRange(x.date, from, to)).sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)) {
    const who = customers.find(c => c.id === s.customerId)?.name ?? (s.customerId ? 'Deleted customer' : 'Walk-in');
    const paid = money(s.payments.reduce((n, p) => n + p.amount, 0));
    s.items.forEach((i, n) =>
      rows.push([s.date, saleCode(s.number), who, i.crop, i.grams, i.amount, n === 0 ? s.discount ?? 0 : '', n === 0 ? s.total : '', n === 0 ? paid : '', n === 0 ? dueOn(s) : ''].map(String))
    );
  }
  return rows.map(r => r.map(cell).join(',')).join('\n');
};
