import { useMemo, useState } from 'react';
import { Plus, Share2, ShoppingBag, Trash2, X } from 'lucide-react';
import { CropPrice, CropType, Customer, CustomerType, PaymentMethod, Sale, StockLot } from '../../types';
import { formatMoney } from '../../data/shop';
import { appInfo } from '../../data/appInfo';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { formatGrams, newId } from '../../utils/batches';
import { stockByCrop } from '../../utils/stock';
import { CUSTOMER_TYPES, dueOn, itemsTotal, paidOn, PAYMENT_METHODS, priceFor, saleCode } from '../../utils/sales';
import { SaleRows } from './Customers';

interface Line {
  key: string;
  crop: string;
  grams: string;
  amount: string;
  edited: boolean; // price typed by hand, not from the price list
}

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

interface SaleFormProps {
  customers: Customer[];
  prices: CropPrice[];
  stock: StockLot[];
  cropTypes: CropType[];
  currency: string;
  customerId?: string;
  onSave: (sale: Omit<Sale, 'number'>) => void;
}

// A new sale: who, what (taken from stock), the price from the price list, and what's paid now.
export function SaleForm({ customers, prices, stock, cropTypes, currency, customerId: startCustomer, onSave }: SaleFormProps) {
  const today = todayLocal();
  const available = useMemo(() => new Map(stockByCrop(stock, today).map(c => [c.crop.toLowerCase(), c.available])), [stock, today]);
  const [customerId, setCustomerId] = useState(startCustomer ?? '');
  const customer = customers.find(c => c.id === customerId);
  const type: CustomerType | undefined = customer?.type;
  const [lines, setLines] = useState<Line[]>([{ key: newId(), crop: '', grams: '', amount: '', edited: false }]);
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paidText, setPaidText] = useState<string | null>(null); // null: paid in full
  const [error, setError] = useState('');

  // Crops in stock first, then the rest.
  const inStock = (crop: string) => ((available.get(crop.toLowerCase()) ?? 0) > 0 ? 1 : 0);
  const crops = [...cropTypes.map(c => c.name)].sort((a, b) => inStock(b) - inStock(a) || a.localeCompare(b));
  const priced = (l: Line, t = type): Line => {
    if (l.edited || !l.crop || !(num(l.grams) > 0)) return l;
    const p = priceFor(prices, l.crop, num(l.grams), t);
    return { ...l, amount: p != null ? String(p) : l.amount };
  };
  const setLine = (key: string, patch: Partial<Line>) => setLines(ls => ls.map(l => (l.key === key ? priced({ ...l, ...patch }) : l)));
  const changeCustomer = (id: string) => {
    setCustomerId(id);
    const t = customers.find(c => c.id === id)?.type;
    setLines(ls => ls.map(l => priced(l, t)));
  };

  const subtotal = Math.round(lines.reduce((n, l) => n + (num(l.amount) || 0), 0) * 100) / 100;
  const disc = num(discount) || 0;
  const total = Math.max(0, Math.round((subtotal - disc) * 100) / 100);
  const paid = paidText == null ? total : num(paidText);

  const save = () => {
    const items = [];
    for (const l of lines) {
      if (!l.crop && !l.grams) continue;
      if (!l.crop) return setError('Choose a crop for each line.');
      if (!(num(l.grams) > 0)) return setError(`Enter the grams of ${l.crop}.`);
      if (!(num(l.amount) >= 0) || l.amount.trim() === '') return setError(`Enter the price of ${l.crop}.`);
      items.push({ crop: l.crop, grams: Math.round(num(l.grams) * 10) / 10, amount: Math.round(num(l.amount) * 100) / 100 });
    }
    if (!items.length) return setError('Add what was sold.');
    if (disc < 0 || disc > itemsTotal(items)) return setError('The discount must be between 0 and the total.');
    if (!(paid >= 0) || paid > total) return setError(`Paid now must be between 0 and ${formatMoney(total, currency)}.`);
    if (paid < total && !customer) return setError('Choose the customer to record what they owe, or mark it as paid in full.');
    onSave({
      id: newId(),
      date: today,
      customerId: customer?.id,
      items,
      discount: disc > 0 ? disc : undefined,
      total,
      payments: paid > 0 ? [{ id: newId(), date: today, amount: Math.round(paid * 100) / 100, method }] : [],
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="farm-stack supply-form">
      <section className="farm-surface">
        <label className="supply-field">
          <span>Customer</span>
          <select value={customerId} onChange={e => changeCustomer(e.target.value)}>
            <option value="">Walk-in (no name)</option>
            {[...customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} · {CUSTOMER_TYPES.find(t => t.type === c.type)?.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="farm-surface">
        <h2>What was sold</h2>
        {lines.map(l => {
          const left = l.crop ? available.get(l.crop.toLowerCase()) ?? 0 : 0;
          const short = l.crop && num(l.grams) > left;
          const noPrice = l.crop && !prices.some(p => p.crop.toLowerCase() === l.crop.toLowerCase());
          return (
            <div key={l.key} className="sale-line">
              <select value={l.crop} onChange={e => setLine(l.key, { crop: e.target.value, edited: false })} aria-label="Crop">
                <option value="">Crop</option>
                {crops.map(c => (
                  <option key={c} value={c}>
                    {c}
                    {(available.get(c.toLowerCase()) ?? 0) > 0 ? ` · ${formatGrams(available.get(c.toLowerCase())!)}` : ''}
                  </option>
                ))}
              </select>
              <div className="sale-line-row">
                <label className="supply-field">
                  <span>Grams</span>
                  <input value={l.grams} onChange={e => setLine(l.key, { grams: e.target.value })} inputMode="decimal" placeholder="100" aria-label="Grams" />
                </label>
                <label className="supply-field">
                  <span>Price ({currency})</span>
                  <input
                    value={l.amount}
                    onChange={e => setLines(ls => ls.map(x => (x.key === l.key ? { ...x, amount: e.target.value, edited: true } : x)))}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Price"
                  />
                </label>
                {lines.length > 1 && (
                  <button className="sale-remove" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} aria-label={`Remove ${l.crop || 'line'}`}>
                    <X size={18} />
                  </button>
                )}
              </div>
              {(short || noPrice) && (
                <small className="sale-warn">
                  {short && `${formatGrams(left)} in stock; the rest isn't taken from stock. `}
                  {noPrice && 'No price for this crop yet: type it, or set it in Settings → Price list.'}
                </small>
              )}
            </div>
          );
        })}
        <button className="stock-edit" onClick={() => setLines(ls => [...ls, { key: newId(), crop: '', grams: '', amount: '', edited: false }])}>
          <Plus size={14} /> Add another crop
        </button>
      </section>

      <section className="farm-surface">
        <div className="supply-row">
          <label className="supply-field">
            <span>Discount ({currency})</span>
            <input value={discount} onChange={e => setDiscount(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
          <label className="supply-field">
            <span>Paid by</span>
            <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map(m => (
                <option key={m.method} value={m.method}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="setting-switch">
          <span>
            <b>Paid in full</b>
            <small>{paidText == null ? 'Nothing owed.' : 'Enter what was paid now; the rest is owed.'}</small>
          </span>
          <input type="checkbox" role="switch" checked={paidText == null} onChange={e => setPaidText(e.target.checked ? null : '0')} />
        </label>
        {paidText != null && (
          <label className="supply-field">
            <span>Paid now ({currency})</span>
            <input value={paidText} onChange={e => setPaidText(e.target.value)} inputMode="decimal" />
          </label>
        )}
        <div className="sale-total">
          <span>Total</span>
          <strong>{formatMoney(total, currency)}</strong>
        </div>
        {paidText != null && paid >= 0 && paid < total && <p className="farm-help">Owed: {formatMoney(Math.round((total - paid) * 100) / 100, currency)}</p>}
      </section>
      {error && (
        <p role="alert" className="supply-error">
          {error}
        </p>
      )}
      <button className="farm-primary" onClick={save}>
        <ShoppingBag size={18} /> Save sale
      </button>
    </div>
  );
}

// A bill as plain text, for WhatsApp or any app.
export const billText = (sale: Sale, customer: Customer | undefined, currency: string, business: string) =>
  [
    `${business}`,
    `Bill ${saleCode(sale.number)} · ${formatDate(sale.date)}`,
    customer ? `For ${customer.name}` : '',
    '',
    ...sale.items.map(i => `${i.crop} ${formatGrams(i.grams)}: ${formatMoney(i.amount, currency)}`),
    sale.discount ? `Discount: −${formatMoney(sale.discount, currency)}` : '',
    `Total: ${formatMoney(sale.total, currency)}`,
    paidOn(sale) > 0 ? `Paid: ${formatMoney(paidOn(sale), currency)}` : '',
    dueOn(sale) > 0 ? `Balance due: ${formatMoney(dueOn(sale), currency)}` : '',
    '',
    'Thank you!',
  ]
    .filter((line, i, all) => line !== '' || (all[i - 1] !== '' && i > 0))
    .join('\n');

interface SalePageProps {
  sale: Sale;
  customer?: Customer;
  currency: string;
  onPay: (amount: number, method: PaymentMethod) => void;
  onDelete: () => void;
  onOpenCustomer: () => void;
}

// One sale: items, payments, sharing the bill, and deleting it (which puts the stock back).
export function SalePage({ sale, customer, currency, onPay, onDelete, onOpenCustomer }: SalePageProps) {
  const due = dueOn(sale);
  const [pay, setPay] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');
  const bill = billText(sale, customer, currency, appInfo.appName);
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ text: bill });
    } catch {
      return; // cancelled
    }
    const digits = customer?.phone?.replace(/\D/g, '');
    const to = digits ? (digits.length === 10 ? `91${digits}` : digits) : '';
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(bill)}`, '_blank');
  };
  return (
    <div className="farm-stack">
      <section className="farm-surface">
        <p className="farm-help">
          {formatDate(sale.date)} ·{' '}
          {customer ? (
            <button className="stock-edit inline" onClick={onOpenCustomer}>
              {customer.name}
            </button>
          ) : (
            'Walk-in'
          )}
        </p>
        <ul className="sale-items">
          {sale.items.map((i, n) => (
            <li key={n}>
              <span>
                {i.crop} · {formatGrams(i.grams)}
              </span>
              <span>{formatMoney(i.amount, currency)}</span>
            </li>
          ))}
          {sale.discount ? (
            <li>
              <span>Discount</span>
              <span>−{formatMoney(sale.discount, currency)}</span>
            </li>
          ) : null}
          <li className="sale-items-total">
            <span>Total</span>
            <span>{formatMoney(sale.total, currency)}</span>
          </li>
        </ul>
        {sale.payments.map(p => (
          <p key={p.id} className="farm-help">
            Paid {formatMoney(p.amount, currency)} by {PAYMENT_METHODS.find(m => m.method === p.method)?.label} on {formatDate(p.date)}
          </p>
        ))}
        {due > 0 && <p className="sale-warn">Owed: {formatMoney(due, currency)}</p>}
      </section>
      <button className="farm-primary" onClick={share}>
        <Share2 size={18} /> Share bill
      </button>
      {due > 0 && (
        <section className="farm-surface">
          <h2>Record a payment</h2>
          <div className="supply-take">
            <input value={pay} onChange={e => setPay(e.target.value)} inputMode="decimal" placeholder={formatMoney(due, currency)} aria-label="Amount paid" />
            <select className="farm-select pay-method" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} aria-label="Paid by">
              {PAYMENT_METHODS.map(m => (
                <option key={m.method} value={m.method}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="farm-secondary pay-button"
            onClick={() => {
              const n = pay.trim() ? num(pay) : due;
              if (!(n > 0) || n > due) return setError(`Enter an amount up to ${formatMoney(due, currency)}.`);
              onPay(Math.round(n * 100) / 100, method);
              setPay('');
              setError('');
            }}
          >
            Record payment
          </button>
          {error && (
            <p role="alert" className="supply-error">
              {error}
            </p>
          )}
        </section>
      )}
      <button className="farm-danger" onClick={onDelete}>
        <Trash2 size={16} /> Delete sale
      </button>
    </div>
  );
}

interface SalesPanelProps {
  sales: Sale[];
  customers: Customer[];
  currency: string;
  onNew: () => void;
  onOpen: (id: string) => void;
}

// The Orders tab, for now: recent sales and a new sale. (Orders for a delivery date and subscriptions come next.)
export function SalesPanel({ sales, customers, currency, onNew, onOpen }: SalesPanelProps) {
  const recent = [...sales].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number).slice(0, 50);
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">SELL AND DELIVER</p>
          <h1>Sales</h1>
          <p>Sales at the shop and to your customers.</p>
        </div>
        <button className="farm-icon-button" onClick={onNew} aria-label="New sale">
          <Plus />
        </button>
      </div>
      <button className="farm-primary" onClick={onNew}>
        <ShoppingBag size={18} /> New sale
      </button>
      {recent.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Recent sales</h2>
            <span>{sales.length}</span>
          </div>
          <SaleRows sales={recent} customers={customers} currency={currency} onOpen={onOpen} />
        </section>
      )}
      <section className="farm-surface coming-soon">
        <h2>Coming next</h2>
        <ul>
          <li>Orders for a delivery date</li>
          <li>Subscriptions that repeat every week</li>
        </ul>
      </section>
    </div>
  );
}

interface PriceListProps {
  prices: CropPrice[];
  cropTypes: CropType[];
  currency: string;
  onChange: (prices: CropPrice[]) => void;
}

// Settings → Price list: a price per 100 g for each crop, and optionally a different one per type of customer.
export function PriceList({ prices, cropTypes, currency, onChange }: PriceListProps) {
  const [open, setOpen] = useState<string | null>(null);
  // Priced crops first, in the order of when the page opened, so rows don't jump while you type prices.
  const [crops] = useState(() =>
    [...cropTypes.map(c => c.name)].sort(
      (a, b) => (prices.some(p => p.crop === b) ? 1 : 0) - (prices.some(p => p.crop === a) ? 1 : 0) || a.localeCompare(b)
    )
  );
  const set = (crop: string, field: 'per100g' | CustomerType, value: string) => {
    const n = Number(value.replace(',', '.'));
    const valid = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
    const current = prices.find(p => p.crop === crop) ?? { crop, per100g: 0 };
    let next: CropPrice;
    if (field === 'per100g') next = { ...current, per100g: valid ?? 0 };
    else {
      const byType = { ...current.byType, [field]: valid };
      if (!valid) delete byType[field];
      next = { ...current, byType: Object.keys(byType).length ? byType : undefined };
    }
    const rest = prices.filter(p => p.crop !== crop);
    onChange(next.per100g > 0 ? [...rest, next] : rest);
  };
  return (
    <div className="farm-stack">
      <p className="farm-help">
        Prices per 100 g, in {currency}. A new sale works out each line from these; you can still change it. Leave a crop blank to type its
        price at each sale.
      </p>
      <div className="care-list price-list">
        {crops.map(crop => {
          const p = prices.find(x => x.crop === crop);
          return (
            <div key={crop} className="price-row">
              <div className="price-main">
                <span>{crop}</span>
                <input
                  defaultValue={p?.per100g || ''}
                  onBlur={e => set(crop, 'per100g', e.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  aria-label={`${crop} price per 100 g`}
                />
                <button className="stock-edit" onClick={() => setOpen(open === crop ? null : crop)} aria-expanded={open === crop}>
                  {p?.byType ? 'By type ✓' : 'By type'}
                </button>
              </div>
              {open === crop && (
                <div className="price-types">
                  {CUSTOMER_TYPES.map(t => (
                    <label key={t.type} className="supply-field">
                      <span>{t.label}</span>
                      <input
                        defaultValue={p?.byType?.[t.type] ?? ''}
                        onBlur={e => set(crop, t.type, e.target.value)}
                        inputMode="decimal"
                        placeholder={p?.per100g ? String(p.per100g) : '—'}
                        aria-label={`${crop} price for ${t.label}`}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
