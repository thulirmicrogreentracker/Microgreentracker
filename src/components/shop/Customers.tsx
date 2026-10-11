import { ReactNode, useState } from 'react';
import { ChevronRight, MessageCircle, Phone, Plus, Search, ShoppingBag, Trash2, Pencil, Users } from 'lucide-react';
import { Customer, CustomerType, PaymentMethod, Sale } from '../../types';
import { formatMoney } from '../../data/shop';
import { formatDate, todayLocal } from '../../utils/dateUtils';
import { newId } from '../../utils/batches';
import { CUSTOMER_TYPES, customerDue, customerTypeLabel, dueOn, PAYMENT_METHODS, saleCode } from '../../utils/sales';

// A phone number as digits for links; Indian numbers without a country code get +91.
const phoneDigits = (phone: string) => {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits.slice(1) : digits.length === 10 ? `91${digits}` : digits;
};

interface CustomersPanelProps {
  customers: Customer[];
  sales: Sale[];
  currency: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

// The Customers tab: everyone you sell to, with what they owe.
export function CustomersPanel({ customers, sales, currency, onOpen, onAdd }: CustomersPanelProps) {
  const [search, setSearch] = useState('');
  const shown = customers
    .filter(c => `${c.name} ${c.phone ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">THE PEOPLE YOU GROW FOR</p>
          <h1>Customers</h1>
          <p>Homes, restaurants and shops.</p>
        </div>
        <button className="farm-icon-button" onClick={onAdd} aria-label="Add customer">
          <Plus />
        </button>
      </div>
      {customers.length > 5 && (
        <label className="batch-search">
          <Search size={18} />
          <input placeholder="Search name or phone" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      )}
      {customers.length === 0 ? (
        <section className="farm-surface supply-empty">
          <h2>Add your first customer</h2>
          <p className="farm-help">Keep their phone and address, see what they've bought and what they owe.</p>
          <button className="farm-primary" onClick={onAdd}>
            <Plus size={18} /> Add customer
          </button>
        </section>
      ) : (
        <div className="care-list">
          {shown.map(c => {
            const due = customerDue(sales, c.id);
            return (
              <button key={c.id} onClick={() => onOpen(c.id)}>
                <span className="care-icon lime">
                  <Users />
                </span>
                <span>
                  <b>{c.name}</b>
                  <small>
                    {customerTypeLabel(c.type)}
                    {c.phone && ` · ${c.phone}`}
                  </small>
                </span>
                {due > 0 && <span className="supply-badge">Owes {formatMoney(due, currency)}</span>}
                <ChevronRight />
              </button>
            );
          })}
          {shown.length === 0 && <p className="farm-help care-empty">No customer matches "{search}".</p>}
        </div>
      )}
    </div>
  );
}

interface CustomerPageProps {
  customer: Customer;
  sales: Sale[];
  currency: string;
  onEdit: () => void;
  onNewSale: () => void;
  orderSection?: ReactNode;
  onOpenSale: (id: string) => void;
  onPay: (amount: number, method: PaymentMethod) => void;
  onDelete: () => void;
}

// One customer: contact, what they owe, a payment, and their sales.
export function CustomerPage({ customer, sales, currency, onEdit, onNewSale, orderSection, onOpenSale, onPay, onDelete }: CustomerPageProps) {
  const theirs = sales.filter(s => s.customerId === customer.id).sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
  const due = customerDue(sales, customer.id);
  const [pay, setPay] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');
  const submit = () => {
    const n = Number(pay.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return setError('Enter the amount paid.');
    if (n > due) return setError(`They owe ${formatMoney(due, currency)}.`);
    onPay(Math.round(n * 100) / 100, method);
    setPay('');
    setError('');
  };
  const digits = customer.phone ? phoneDigits(customer.phone) : '';
  return (
    <div className="farm-stack">
      <section className="farm-surface supply-summary">
        <div>
          <strong>{formatMoney(due, currency)}</strong>
          <span>owed</span>
        </div>
        <div>
          <strong>{theirs.length}</strong>
          <span>sale{theirs.length === 1 ? '' : 's'}</span>
        </div>
        <p className="farm-help">
          {customerTypeLabel(customer.type)}
          {customer.address && ` · ${customer.address}`}
          {customer.note && ` · ${customer.note}`}
        </p>
      </section>
      {digits && (
        <div className="supply-actions contact-actions">
          <a className="farm-secondary" href={`tel:+${digits}`}>
            <Phone size={16} /> Call
          </a>
          <a className="farm-secondary" href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      )}
      <button className="farm-primary" onClick={onNewSale}>
        <ShoppingBag size={18} /> New sale
      </button>
      {orderSection}
      {due > 0 && (
        <section className="farm-surface">
          <h2>Record a payment</h2>
          <p className="farm-help">Paid off their oldest sales first.</p>
          <div className="supply-take">
            <input value={pay} onChange={e => setPay(e.target.value)} inputMode="decimal" placeholder={`Amount (${currency})`} aria-label="Amount paid" />
            <select className="farm-select pay-method" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} aria-label="Paid by">
              {PAYMENT_METHODS.map(m => (
                <option key={m.method} value={m.method}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button className="farm-secondary pay-button" onClick={submit}>
            Record payment
          </button>
          {error && (
            <p role="alert" className="supply-error">
              {error}
            </p>
          )}
        </section>
      )}
      {theirs.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Sales</h2>
            <span>{theirs.length}</span>
          </div>
          <SaleRows sales={theirs} customers={[customer]} currency={currency} onOpen={onOpenSale} />
        </section>
      )}
      <div className="supply-actions">
        <button className="farm-secondary" onClick={onEdit}>
          <Pencil size={16} /> Edit
        </button>
        <button className="farm-danger" onClick={onDelete}>
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

// A list of sales: number, customer, what, total and anything owed.
export function SaleRows({ sales, customers, currency, onOpen }: { sales: Sale[]; customers: Customer[]; currency: string; onOpen: (id: string) => void }) {
  return (
    <div className="care-list">
      {sales.map(s => {
        const due = dueOn(s);
        const who = customers.find(c => c.id === s.customerId)?.name ?? 'Walk-in';
        return (
          <button key={s.id} onClick={() => onOpen(s.id)}>
            <span>
              <b>
                {saleCode(s.number)} · {who} · {formatMoney(s.total, currency)}
              </b>
              <small>
                {formatDate(s.date)} · {s.items.map(i => `${i.grams} g ${i.crop}`).join(', ')}
              </small>
            </span>
            {due > 0 && <span className="supply-badge">Owes {formatMoney(due, currency)}</span>}
            <ChevronRight />
          </button>
        );
      })}
    </div>
  );
}

interface CustomerFormProps {
  customer?: Customer;
  existing: Customer[];
  onSave: (c: Customer) => void;
}

export function CustomerForm({ customer, existing, onSave }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [type, setType] = useState<CustomerType>(customer?.type ?? 'home');
  const [note, setNote] = useState(customer?.note ?? '');
  const [error, setError] = useState('');
  const save = () => {
    if (!name.trim()) return setError('Enter a name.');
    if (phone.trim() && phone.replace(/\D/g, '').length < 7) return setError('That phone number looks too short.');
    const same = existing.find(c => c.id !== customer?.id && c.name.toLowerCase() === name.trim().toLowerCase());
    if (same && !window.confirm(`You already have a customer called ${same.name}. Add another?`)) return;
    onSave({
      id: customer?.id ?? newId(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      type,
      note: note.trim() || undefined,
      createdAt: customer?.createdAt ?? new Date().toISOString(),
    });
  };
  return (
    <div className="farm-stack supply-form">
      <section className="farm-surface">
        <label className="supply-field">
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Hotel Annapoorna" />
        </label>
        <label className="supply-field">
          <span>Phone</span>
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" />
        </label>
        <label className="supply-field">
          <span>Address</span>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional" />
        </label>
        <div className="supply-field">
          <span>Type</span>
          <div className="segmented-control supply-kinds" role="radiogroup" aria-label="Type of customer">
            {CUSTOMER_TYPES.map(t => (
              <button key={t.type} role="radio" aria-checked={type === t.type} aria-pressed={type === t.type} onClick={() => setType(t.type)}>
                {t.type === 'shop' ? 'Shop' : t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="supply-field">
          <span>Note</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </label>
      </section>
      {error && (
        <p role="alert" className="supply-error">
          {error}
        </p>
      )}
      <button className="farm-primary" onClick={save}>
        {customer ? 'Save changes' : 'Add customer'}
      </button>
    </div>
  );
}

export const paymentFor = (amount: number, method: PaymentMethod) => ({ id: newId(), date: todayLocal(), amount, method });
