import { CropPrice, Customer, CustomerType, Payment, PaymentMethod, Sale, SaleItem, StockLot } from '../types';

export const CUSTOMER_TYPES: { type: CustomerType; label: string }[] = [
  { type: 'home', label: 'Home' },
  { type: 'restaurant', label: 'Restaurant' },
  { type: 'shop', label: 'Shop or retailer' },
  { type: 'other', label: 'Other' },
];

export const PAYMENT_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'cash', label: 'Cash' },
  { method: 'upi', label: 'UPI' },
  { method: 'card', label: 'Card' },
  { method: 'other', label: 'Other' },
];

const money = (n: number) => Math.round(n * 100) / 100;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const amount = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? money(n) : 0;
};

export const saleCode = (n: number) => `S${String(n).padStart(3, '0')}`;
export const customerTypeLabel = (t: CustomerType) => CUSTOMER_TYPES.find(c => c.type === t)?.label ?? 'Other';

// The price of `grams` of a crop for a type of customer: its own price for that type, else the crop's price, else
// nothing (undefined) when the crop has no price.
export const priceFor = (prices: CropPrice[], crop: string, grams: number, type?: CustomerType): number | undefined => {
  const p = prices.find(x => x.crop.toLowerCase() === crop.toLowerCase());
  if (!p) return undefined;
  const per100 = (type && p.byType?.[type]) || p.per100g;
  return money((per100 * grams) / 100);
};

export const paidOn = (sale: Sale) => money(sale.payments.reduce((n, p) => n + p.amount, 0));
export const dueOn = (sale: Sale) => Math.max(0, money(sale.total - paidOn(sale)));
export const itemsTotal = (items: SaleItem[]) => money(items.reduce((n, i) => n + i.amount, 0));

// What a customer owes across all their sales.
export const customerDue = (sales: Sale[], customerId: string) =>
  money(sales.filter(s => s.customerId === customerId).reduce((n, s) => n + dueOn(s), 0));

// Takes a payment off a customer's oldest unpaid sales first. Returns the updated sales and anything left over.
export const recordPayment = (sales: Sale[], customerId: string, payment: Payment): { sales: Sale[]; left: number } => {
  let left = money(payment.amount);
  const order = sales
    .filter(s => s.customerId === customerId && dueOn(s) > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)
    .map(s => s.id);
  const paid = new Map<string, number>();
  for (const id of order) {
    if (left <= 0) break;
    const take = Math.min(left, dueOn(sales.find(s => s.id === id)!));
    paid.set(id, take);
    left = money(left - take);
  }
  return {
    sales: sales.map(s =>
      paid.has(s.id) ? { ...s, payments: [...s.payments, { ...payment, id: `${payment.id}-${s.id}`, amount: money(paid.get(s.id)!) }] } : s
    ),
    left,
  };
};

// Puts back the stock a sale took (when the sale is deleted).
export const returnSaleStock = (stock: StockLot[], saleId: string): StockLot[] =>
  stock.map(l => {
    const sold = l.moves.filter(m => m.kind === 'sold' && m.ref === saleId);
    if (!sold.length) return l;
    const back = sold.reduce((n, m) => n + m.grams, 0);
    return { ...l, remaining: Math.min(l.grams, Math.round((l.remaining + back) * 10) / 10), moves: l.moves.filter(m => !sold.includes(m)) };
  });

export const salesTotal = (sales: Sale[], from: string, to = '9999-12-31') =>
  money(sales.filter(s => s.date >= from && s.date <= to).reduce((n, s) => n + s.total, 0));

export const totalDue = (sales: Sale[]) => money(sales.reduce((n, s) => n + dueOn(s), 0));

export const normalizeCustomers = (raw: unknown): Customer[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((c): c is Partial<Customer> => !!c && typeof c === 'object' && typeof (c as Customer).id === 'string')
    .map(c => ({
      id: c.id!,
      name: text(c.name) ?? 'Customer',
      phone: text(c.phone),
      address: text(c.address),
      type: CUSTOMER_TYPES.some(t => t.type === c.type) ? c.type! : 'home',
      note: text(c.note),
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
    }));

export const normalizePrices = (raw: unknown): CropPrice[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((p): p is CropPrice => !!p && typeof p === 'object' && !!text((p as CropPrice).crop) && amount((p as CropPrice).per100g) > 0)
    .map(p => {
      const byType = Object.fromEntries(
        CUSTOMER_TYPES.map(t => [t.type, amount(p.byType?.[t.type])]).filter(([, v]) => (v as number) > 0)
      ) as Partial<Record<CustomerType, number>>;
      return { crop: p.crop.trim(), per100g: amount(p.per100g), ...(Object.keys(byType).length ? { byType } : {}) };
    });

export const normalizeSales = (raw: unknown): Sale[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((s): s is Partial<Sale> => !!s && typeof s === 'object' && typeof (s as Sale).id === 'string')
    .map(s => {
      const items = (Array.isArray(s.items) ? s.items : [])
        .filter(i => i && text(i.crop))
        .map(i => ({ crop: i.crop.trim(), grams: amount(i.grams), amount: amount(i.amount) }));
      const discount = amount(s.discount) || undefined;
      return {
        id: s.id!,
        number: Math.max(0, Math.floor(Number(s.number) || 0)),
        date: isDate(s.date) ? s.date : new Date().toISOString().slice(0, 10),
        customerId: text(s.customerId),
        items,
        discount,
        total: Math.max(0, money(itemsTotal(items) - (discount ?? 0))),
        payments: (Array.isArray(s.payments) ? s.payments : [])
          .filter(p => p && typeof p.id === 'string' && amount(p.amount) > 0)
          .map(p => ({
            id: p.id,
            date: isDate(p.date) ? p.date : new Date().toISOString().slice(0, 10),
            amount: amount(p.amount),
            method: PAYMENT_METHODS.some(m => m.method === p.method) ? p.method : 'cash',
          })),
        note: text(s.note),
        createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
      };
    });
