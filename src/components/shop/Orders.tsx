import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, ClipboardList, Pause, Pencil, Play, Plus, Repeat, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { CropType, Customer, MixSpec, Order, OrderItem, Sale, Subscription } from '../../types';
import { formatDate, formatDay, todayLocal, addDaysToDate } from '../../utils/dateUtils';
import { formatGrams, newId } from '../../utils/batches';
import { customerTypeLabel, saleCode } from '../../utils/sales';
import {
  boxText,
  Delivery,
  deliveriesBetween,
  itemsText,
  LogStatus,
  MAX_VARIETIES,
  nextDates,
  orderCode,
  scheduleText,
  subscriptionLog,
  subStatus,
  WEEKDAYS,
} from '../../utils/orders';
import { Allocation } from '../../utils/plan';
import { SaleRows } from './Customers';

// "Today", "Tomorrow", "Overdue · Fri, Oct 9", or "Wed, Oct 14".
export const dayLabel = (date: string, today: string) =>
  date === today ? 'Today' : date === addDaysToDate(today, 1) ? 'Tomorrow' : date < today ? `Overdue · ${formatDay(date)}` : formatDay(date);

const customerName = (customers: Customer[], id: string) => customers.find(c => c.id === id)?.name ?? 'Customer';

const when = (date: string, today: string) =>
  date <= today ? 'today' : date === addDaysToDate(today, 1) ? 'tomorrow' : formatDay(date);

// Where a delivery's microgreens come from, in a few words: "Ready from stock", "Radish from B012 (Wed, Oct 21)",
// "Sow Pea Shoots by Thu, Oct 15", "100 g Beet short". The tone is the most urgent part.
export const supplyText = (allocations: Allocation[] | undefined, today: string): { text: string; tone: 'ok' | 'grow' | 'sow' | 'short' } | null => {
  if (!allocations?.length) return null;
  const parts: string[] = [];
  const byCrop = (from: Allocation['from']) => {
    const m = new Map<string, Allocation[]>();
    for (const a of allocations.filter(x => x.from === from)) m.set(a.crop, [...(m.get(a.crop) ?? []), a]);
    return [...m.entries()];
  };
  for (const [crop, list] of byCrop('short')) parts.push(`${formatGrams(list.reduce((n, a) => n + a.grams, 0))} ${crop === 'Mix' ? 'of the mix' : crop} short`);
  for (const [crop, list] of byCrop('sow')) parts.push(`sow ${crop} by ${when(list[0].sowBy!, today)}`);
  for (const [crop, list] of byCrop('batch')) {
    const ready = list[0].readyOn!;
    parts.push(`${crop} from ${[...new Set(list.map(a => a.batchCode))].join(', ')} (${ready <= today ? 'harvest now' : `ready ${when(ready, today)}`})`);
  }
  const stock = allocations.filter(a => a.from === 'stock');
  if (stock.length) parts.push(parts.length ? 'rest from stock' : 'Ready from stock');
  const tone = allocations.some(a => a.from === 'short') ? 'short' : allocations.some(a => a.from === 'sow') ? 'sow' : allocations.some(a => a.from === 'batch') ? 'grow' : 'ok';
  const text = parts.slice(0, 3).join(' · ');
  return { text: text.charAt(0).toUpperCase() + text.slice(1), tone };
};

export function SupplyLine({ allocations, today }: { allocations?: Allocation[]; today: string }) {
  const s = supplyText(allocations, today);
  return s ? <small className={`supply-line supply-${s.tone}`}>{s.text}</small> : null;
}

interface DeliveryRowsProps {
  deliveries: Delivery[];
  customers: Customer[];
  showDate?: boolean;
  supply?: Map<string, Allocation[]>; // where each delivery's microgreens come from
  contents?: (d: Delivery) => OrderItem[] | undefined; // today's boxes as they'd be packed now
  onOpen: (d: Delivery) => void;
  onDeliver?: (d: Delivery) => void;
  onMissed?: (d: Delivery) => void; // for overdue subscription days
}

// Deliveries to make: who, what, where it comes from, and a Deliver button that records the sale.
export function DeliveryRows({ deliveries, customers, showDate, supply, contents, onOpen, onDeliver, onMissed }: DeliveryRowsProps) {
  const today = todayLocal();
  return (
    <div className="care-list delivery-list">
      {deliveries.map(d => {
        const packed = d.mix ? contents?.(d) : undefined;
        return (
          <div key={d.key} className="delivery-row">
            <button onClick={() => onOpen(d)}>
              <span className={`care-icon ${d.date < today ? 'supply-low' : 'lime'}`}>{d.subscription ? <Repeat /> : <ClipboardList />}</span>
              <span>
                <b>{customerName(customers, d.customerId)}</b>
                <small>
                  {showDate || d.date < today ? `${dayLabel(d.date, today)} · ` : ''}
                  {d.order ? `${orderCode(d.order.number)} · ` : ''}
                  {boxText(d)}
                </small>
                {packed?.length ? <small className="supply-line">Pack: {itemsText(packed)}</small> : null}
                <SupplyLine allocations={supply?.get(d.key)} today={today} />
              </span>
              {!onDeliver && <ChevronRight />}
            </button>
            {onDeliver && (
              <span className="delivery-actions">
                <button className="delivery-go" onClick={() => onDeliver(d)} aria-label={`Deliver to ${customerName(customers, d.customerId)}`}>
                  <Truck size={15} /> Deliver
                </button>
                {onMissed && d.subscription && d.date < today && (
                  <button className="stock-edit" onClick={() => onMissed(d)} aria-label={`Missed ${customerName(customers, d.customerId)} on ${formatDate(d.date)}`}>
                    Missed
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ItemLine {
  key: string;
  crop: string;
  grams: string;
}
const toLines = (items: OrderItem[] | undefined): ItemLine[] =>
  items?.length ? items.map(i => ({ key: newId(), crop: i.crop, grams: String(i.grams) })) : [{ key: newId(), crop: '', grams: '' }];
const num = (s: string) => Number(s.replace(',', '.'));

// Validates the lines; returns the items or an error message.
const readLines = (lines: ItemLine[]): OrderItem[] | string => {
  const items: OrderItem[] = [];
  for (const l of lines) {
    if (!l.crop && !l.grams) continue;
    if (!l.crop) return 'Choose a crop for each line.';
    if (!(num(l.grams) > 0)) return `Enter the grams of ${l.crop}.`;
    items.push({ crop: l.crop, grams: Math.round(num(l.grams) * 10) / 10 });
  }
  return items.length ? items : 'Add what they want.';
};

function ItemsEditor({ lines, setLines, cropTypes }: { lines: ItemLine[]; setLines: (f: (l: ItemLine[]) => ItemLine[]) => void; cropTypes: CropType[] }) {
  const crops = cropTypes.map(c => c.name).sort((a, b) => a.localeCompare(b));
  const set = (key: string, patch: Partial<ItemLine>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <section className="farm-surface">
      <h2>What they want</h2>
      {lines.map(l => (
        <div key={l.key} className="sale-line-row order-line">
          <label className="supply-field">
            <span>Crop</span>
            <select value={l.crop} onChange={e => set(l.key, { crop: e.target.value })} aria-label="Crop">
              <option value="">Choose</option>
              {crops.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="supply-field">
            <span>Grams</span>
            <input value={l.grams} onChange={e => set(l.key, { grams: e.target.value })} inputMode="decimal" placeholder="100" aria-label="Grams" />
          </label>
          {lines.length > 1 && (
            <button className="sale-remove" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} aria-label={`Remove ${l.crop || 'line'}`}>
              <X size={18} />
            </button>
          )}
        </div>
      ))}
      <button className="stock-edit" onClick={() => setLines(ls => [...ls, { key: newId(), crop: '', grams: '' }])}>
        <Plus size={14} /> Add another crop
      </button>
    </section>
  );
}

function CustomerPicker({ customers, value, onChange, onAddCustomer }: { customers: Customer[]; value: string; onChange: (id: string) => void; onAddCustomer: () => void }) {
  return (
    <section className="farm-surface">
      <label className="supply-field">
        <span>Customer</span>
        <select value={value} onChange={e => (e.target.value === '+' ? onAddCustomer() : onChange(e.target.value))}>
          <option value="">Choose</option>
          {[...customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
            <option key={c.id} value={c.id}>
              {c.name} · {customerTypeLabel(c.type)}
            </option>
          ))}
          <option value="+">+ New customer…</option>
        </select>
      </label>
    </section>
  );
}

const ErrorText = ({ error }: { error: string }) =>
  error ? (
    <p role="alert" className="supply-error">
      {error}
    </p>
  ) : null;

interface OrderFormProps {
  customers: Customer[];
  cropTypes: CropType[];
  order?: Order;
  customerId?: string;
  onAddCustomer: () => void;
  onSave: (o: Order) => void;
}

// A one-off order for a delivery date. It becomes a sale when it's delivered.
export function OrderForm({ customers, cropTypes, order, customerId: startCustomer, onAddCustomer, onSave }: OrderFormProps) {
  const [customerId, setCustomerId] = useState(order?.customerId ?? startCustomer ?? '');
  useEffect(() => {
    if (startCustomer) setCustomerId(startCustomer); // a customer just added from this form
  }, [startCustomer]);
  const [deliverOn, setDeliverOn] = useState(order?.deliverOn ?? addDaysToDate(todayLocal(), 1));
  const [lines, setLines] = useState(() => toLines(order?.items));
  const [note, setNote] = useState(order?.note ?? '');
  const [error, setError] = useState('');
  const save = () => {
    if (!customerId) return setError('Choose the customer.');
    if (!deliverOn) return setError('Choose the delivery date.');
    const items = readLines(lines);
    if (typeof items === 'string') return setError(items);
    onSave({
      id: order?.id ?? newId(),
      number: order?.number ?? 0,
      customerId,
      deliverOn,
      items,
      note: note.trim() || undefined,
      status: order?.status ?? 'open',
      saleId: order?.saleId,
      createdAt: order?.createdAt ?? new Date().toISOString(),
    });
  };
  return (
    <div className="farm-stack supply-form">
      <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} onAddCustomer={onAddCustomer} />
      <section className="farm-surface">
        <label className="supply-field">
          <span>Deliver on</span>
          <input type="date" value={deliverOn} onChange={e => setDeliverOn(e.target.value)} />
        </label>
      </section>
      <ItemsEditor lines={lines} setLines={setLines} cropTypes={cropTypes} />
      <section className="farm-surface">
        <label className="supply-field">
          <span>Note</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </label>
      </section>
      <ErrorText error={error} />
      <button className="farm-primary" onClick={save}>
        {order ? 'Save changes' : 'Add order'}
      </button>
    </div>
  );
}

const DEFAULT_MIX: MixSpec = { grams: 300, varieties: 3 };

// A mixed box: total grams, how many crops, and optionally which crops it can use.
function MixEditor({ mix, setMix, cropTypes }: { mix: MixSpec; setMix: (m: MixSpec) => void; cropTypes: CropType[] }) {
  const [gramsText, setGramsText] = useState(String(mix.grams));
  const crops = cropTypes.map(c => c.name).sort((a, b) => a.localeCompare(b));
  const chosen = mix.crops ?? [];
  const toggle = (crop: string) => {
    const next = chosen.includes(crop) ? chosen.filter(c => c !== crop) : [...chosen, crop];
    setMix({ ...mix, crops: next.length ? next : undefined });
  };
  return (
    <>
      <div className="supply-row">
        <label className="supply-field">
          <span>Box weight (g)</span>
          <input
            value={gramsText}
            onChange={e => {
              setGramsText(e.target.value);
              const n = Math.round(Number(e.target.value.replace(',', '.')));
              setMix({ ...mix, grams: Number.isFinite(n) ? n : 0 });
            }}
            inputMode="numeric"
            aria-label="Box weight in grams"
          />
        </label>
        <div className="supply-field">
          <span>Crops in each box</span>
          <div className="variety-stepper" role="group" aria-label="Crops in each box">
            <button onClick={() => setMix({ ...mix, varieties: Math.max(1, mix.varieties - 1) })} aria-label="Fewer crops">
              −
            </button>
            <b>{mix.varieties}</b>
            <button onClick={() => setMix({ ...mix, varieties: Math.min(MAX_VARIETIES, mix.varieties + 1) })} aria-label="More crops">
              +
            </button>
          </div>
        </div>
      </div>
      <div className="supply-field">
        <span>Crops it can use {chosen.length ? `(${chosen.length})` : '(any you grow)'}</span>
        <div className="crop-chips" role="group" aria-label="Crops for the mix">
          {crops.map(c => (
            <button key={c} aria-pressed={chosen.includes(c)} onClick={() => toggle(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="farm-help">
        Each delivery the app picks {mix.varieties} crop{mix.varieties === 1 ? '' : 's'} from what's ready, freshest first and different from
        last time, and plans the sowing so there's enough.
      </p>
    </>
  );
}

interface SubscriptionFormProps {
  customers: Customer[];
  cropTypes: CropType[];
  subscription?: Subscription;
  customerId?: string;
  onAddCustomer: () => void;
  onSave: (s: Subscription) => void;
}

// A delivery that repeats on chosen weekdays, every week or every other week.
export function SubscriptionForm({ customers, cropTypes, subscription: sub, customerId: startCustomer, onAddCustomer, onSave }: SubscriptionFormProps) {
  const [customerId, setCustomerId] = useState(sub?.customerId ?? startCustomer ?? '');
  useEffect(() => {
    if (startCustomer) setCustomerId(startCustomer);
  }, [startCustomer]);
  const [lines, setLines] = useState(() => toLines(sub?.items));
  // New subscriptions are mixed boxes; one with only chosen crops opens on those.
  const [kind, setKind] = useState<'mix' | 'crops'>(sub && !sub.mix ? 'crops' : 'mix');
  const [mix, setMix] = useState<MixSpec>(sub?.mix ?? DEFAULT_MIX);
  const [weekdays, setWeekdays] = useState<number[]>(sub?.weekdays ?? []);
  const [everyWeeks, setEveryWeeks] = useState(sub?.everyWeeks ?? 1);
  const [startOn, setStartOn] = useState(sub?.startOn ?? todayLocal());
  const [endOn, setEndOn] = useState(sub?.endOn ?? '');
  const [note, setNote] = useState(sub?.note ?? '');
  const [error, setError] = useState('');
  const toggleDay = (day: number) => setWeekdays(ds => (ds.includes(day) ? ds.filter(d => d !== day) : [...ds, day]));
  const save = () => {
    if (!customerId) return setError('Choose the customer.');
    let items: OrderItem[] = [];
    if (kind === 'crops') {
      const read = readLines(lines);
      if (typeof read === 'string') return setError(read);
      items = read;
    } else {
      if (!(mix.grams >= 10)) return setError('Enter the weight of the box.');
      if (mix.crops?.length && mix.crops.length < mix.varieties) return setError(`Choose at least ${mix.varieties} crops, or none to use any you grow.`);
    }
    if (!weekdays.length) return setError('Choose the days to deliver.');
    if (!startOn) return setError('Choose the start date.');
    if (endOn && endOn < startOn) return setError('The end date is before the start date.');
    onSave({
      id: sub?.id ?? newId(),
      customerId,
      items,
      mix: kind === 'mix' ? mix : undefined,
      weekdays: [...weekdays].sort((a, b) => a - b),
      everyWeeks,
      startOn,
      endOn: endOn || undefined,
      pausedUntil: sub?.pausedUntil,
      skipped: sub?.skipped ?? [],
      missed: sub?.missed ?? [],
      delivered: sub?.delivered ?? [],
      note: note.trim() || undefined,
      createdAt: sub?.createdAt ?? new Date().toISOString(),
    });
  };
  return (
    <div className="farm-stack supply-form">
      <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} onAddCustomer={onAddCustomer} />
      <section className="farm-surface">
        <h2>What's in the box</h2>
        <div className="segmented-control supply-kinds how-often" role="radiogroup" aria-label="Box">
          <button role="radio" aria-checked={kind === 'mix'} aria-pressed={kind === 'mix'} onClick={() => setKind('mix')}>
            Mixed box
          </button>
          <button role="radio" aria-checked={kind === 'crops'} aria-pressed={kind === 'crops'} onClick={() => setKind('crops')}>
            Chosen crops
          </button>
        </div>
        {kind === 'mix' && <MixEditor mix={mix} setMix={setMix} cropTypes={cropTypes} />}
      </section>
      {kind === 'crops' && <ItemsEditor lines={lines} setLines={setLines} cropTypes={cropTypes} />}
      <section className="farm-surface">
        <div className="supply-field">
          <span>Deliver on</span>
          <div className="weekday-picker" role="group" aria-label="Delivery days">
            {WEEKDAYS.map(w => (
              <button key={w.day} aria-pressed={weekdays.includes(w.day)} onClick={() => toggleDay(w.day)} aria-label={w.label}>
                {w.short}
              </button>
            ))}
          </div>
        </div>
        <div className="segmented-control supply-kinds how-often" role="radiogroup" aria-label="How often">
          {[1, 2].map(n => (
            <button key={n} role="radio" aria-checked={everyWeeks === n} aria-pressed={everyWeeks === n} onClick={() => setEveryWeeks(n)}>
              {n === 1 ? 'Every week' : 'Every other week'}
            </button>
          ))}
        </div>
        <div className="supply-row">
          <label className="supply-field">
            <span>Starts</span>
            <input type="date" value={startOn} onChange={e => setStartOn(e.target.value)} />
          </label>
          <label className="supply-field">
            <span>Ends (optional)</span>
            <input type="date" value={endOn} onChange={e => setEndOn(e.target.value)} />
          </label>
        </div>
        {weekdays.length > 0 && <p className="farm-help">{scheduleText({ weekdays, everyWeeks })}</p>}
      </section>
      <section className="farm-surface">
        <label className="supply-field">
          <span>Note</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </label>
      </section>
      <ErrorText error={error} />
      <button className="farm-primary" onClick={save}>
        {sub ? 'Save changes' : 'Add subscription'}
      </button>
    </div>
  );
}

interface OrderPageProps {
  order: Order;
  customer?: Customer;
  sale?: Sale;
  onDeliver: () => void;
  onEdit: () => void;
  onStatus: (status: 'open' | 'cancelled') => void;
  onDelete: () => void;
  onOpenSale: () => void;
  onOpenCustomer: () => void;
}

export function OrderPage({ order, customer, sale, onDeliver, onEdit, onStatus, onDelete, onOpenSale, onOpenCustomer }: OrderPageProps) {
  const today = todayLocal();
  return (
    <div className="farm-stack">
      <section className="farm-surface">
        <p className="farm-help">
          {customer ? (
            <button className="stock-edit inline" onClick={onOpenCustomer}>
              {customer.name}
            </button>
          ) : (
            'Customer deleted'
          )}{' '}
          ·{' '}
          {order.status !== 'open'
            ? formatDate(order.deliverOn)
            : order.deliverOn < today
              ? `Was due ${formatDate(order.deliverOn)}`
              : `Deliver ${order.deliverOn === today ? 'today' : order.deliverOn === addDaysToDate(today, 1) ? 'tomorrow' : `on ${formatDay(order.deliverOn)}`}`}
        </p>
        <ul className="sale-items">
          {order.items.map((i, n) => (
            <li key={n}>
              <span>{i.crop}</span>
              <span>{formatGrams(i.grams)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="farm-help">{order.note}</p>}
        {order.status === 'delivered' && (
          <p className="farm-help">
            Delivered.{' '}
            {sale && (
              <button className="stock-edit inline" onClick={onOpenSale}>
                Sale {saleCode(sale.number)}
              </button>
            )}
          </p>
        )}
        {order.status === 'cancelled' && <p className="sale-warn">Cancelled</p>}
      </section>
      {order.status === 'open' && (
        <>
          <button className="farm-primary" onClick={onDeliver}>
            <Truck size={18} /> Deliver
          </button>
          <div className="supply-actions">
            <button className="farm-secondary" onClick={onEdit}>
              <Pencil size={16} /> Edit
            </button>
            <button className="farm-secondary" onClick={() => onStatus('cancelled')}>
              <X size={16} /> Cancel
            </button>
          </div>
        </>
      )}
      {order.status === 'cancelled' && (
        <button className="farm-secondary" onClick={() => onStatus('open')}>
          Reopen order
        </button>
      )}
      <button className="farm-danger" onClick={onDelete}>
        <Trash2 size={16} /> Delete order
      </button>
    </div>
  );
}

interface SubscriptionPageProps {
  subscription: Subscription;
  customer?: Customer;
  sales: Sale[];
  supply: Map<string, Allocation[]>;
  onDeliver: (date: string) => void;
  onSkip: (date: string) => void;
  onMissed: (date: string, missed: boolean) => void;
  onPause: (until: string | undefined) => void;
  onEnd: (endOn: string | undefined) => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenSale: (id: string) => void;
  onOpenCustomer: () => void;
}

// One subscription: its schedule, the next deliveries (skip one, or deliver today's), pause, end, edit.
const LOG_LABEL: Record<LogStatus, string> = {
  delivered: 'Delivered',
  skipped: 'Skipped',
  missed: 'Missed',
  overdue: 'Not delivered yet',
  unrecorded: 'Not recorded',
};

export function SubscriptionPage(props: SubscriptionPageProps) {
  const { subscription: sub, customer, sales, supply, onDeliver, onSkip, onMissed, onPause, onEnd, onEdit, onDelete, onOpenSale, onOpenCustomer } = props;
  const today = todayLocal();
  const status = subStatus(sub, today);
  const [pauseUntil, setPauseUntil] = useState(addDaysToDate(today, 7));
  const [showAll, setShowAll] = useState(false);
  const upcoming = status === 'ended' ? [] : nextDates({ ...sub, pausedUntil: undefined }, today, 8);
  const log = subscriptionLog(sub, today);
  const shownLog = showAll ? log : log.slice(0, 6);
  const delivered = sub.delivered.length;
  const missed = log.filter(l => l.status === 'missed' || l.status === 'unrecorded').length;
  return (
    <div className="farm-stack">
      <section className="farm-surface">
        <p className="farm-help">
          {customer ? (
            <button className="stock-edit inline" onClick={onOpenCustomer}>
              {customer.name}
            </button>
          ) : (
            'Customer deleted'
          )}{' '}
          · {scheduleText(sub)}
        </p>
        <ul className="sale-items">
          {sub.items.map((i, n) => (
            <li key={n}>
              <span>{i.crop}</span>
              <span>{formatGrams(i.grams)}</span>
            </li>
          ))}
          {sub.mix && (
            <li>
              <span>
                Mixed box of {sub.mix.varieties} crop{sub.mix.varieties === 1 ? '' : 's'}
                {sub.mix.crops?.length ? ` (${sub.mix.crops.join(', ')})` : ''}
              </span>
              <span>{formatGrams(sub.mix.grams)}</span>
            </li>
          )}
        </ul>
        <p className="farm-help">
          {delivered} delivered{missed ? ` · ${missed} missed` : ''}
        </p>
        <p className="farm-help">
          From {formatDate(sub.startOn)}
          {sub.endOn ? ` to ${formatDate(sub.endOn)}` : ''}
          {sub.note ? ` · ${sub.note}` : ''}
        </p>
        {status === 'paused' && <p className="sale-warn">Paused until {formatDate(sub.pausedUntil!)}</p>}
        {status === 'ended' && <p className="sale-warn">Ended</p>}
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Next deliveries</h2>
          </div>
          <div className="care-list delivery-list">
            {upcoming.map(d => {
              const paused = !d.delivered && !!sub.pausedUntil && d.date < sub.pausedUntil;
              return (
                <div key={d.date} className={`delivery-row${d.skipped || paused ? ' skipped' : ''}`}>
                  <span className="delivery-date">
                    <b>{dayLabel(d.date, today)}</b>
                    <small>{d.delivered ? 'Delivered' : paused ? 'Paused' : d.skipped ? 'Skipped' : boxText(sub)}</small>
                    {!d.delivered && !d.skipped && !paused && <SupplyLine allocations={supply.get(`s-${sub.id}-${d.date}`)} today={today} />}
                  </span>
                  {d.date === today && !d.delivered && !d.skipped && !paused && (
                    <button className="delivery-go" onClick={() => onDeliver(d.date)}>
                      <Truck size={15} /> Deliver
                    </button>
                  )}
                  {!d.delivered && !paused && (
                    <button className="stock-edit" onClick={() => onSkip(d.date)} aria-label={`${d.skipped ? 'Undo skip' : 'Skip'} ${formatDate(d.date)}`}>
                      {d.skipped ? 'Undo skip' : 'Skip'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {status !== 'ended' && (
        <section className="farm-surface">
          <h2>Pause</h2>
          {status === 'paused' ? (
            <button className="farm-secondary" onClick={() => onPause(undefined)}>
              <Play size={16} /> Resume now
            </button>
          ) : (
            <>
              <p className="farm-help">No deliveries until the date you choose, for a holiday or a break.</p>
              <div className="supply-take">
                <input type="date" value={pauseUntil} min={addDaysToDate(today, 1)} onChange={e => setPauseUntil(e.target.value)} aria-label="Pause until" />
                <button className="farm-secondary" onClick={() => pauseUntil > today && onPause(pauseUntil)}>
                  <Pause size={16} /> Pause
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {log.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Delivery log</h2>
            <span>Last 8 weeks</span>
          </div>
          <div className="care-list delivery-list">
            {shownLog.map(l => {
              const sale = l.saleId ? sales.find(s => s.id === l.saleId) : undefined;
              const open = l.status === 'overdue' || l.status === 'unrecorded';
              return (
                <div key={l.date} className={`delivery-row log-${l.status}`}>
                  {sale ? (
                    <button onClick={() => onOpenSale(sale.id)}>
                      <span className="delivery-date">
                        <b>{formatDay(l.date)}</b>
                        <small>
                          <span className="log-chip">{LOG_LABEL[l.status]}</span> {saleCode(sale.number)} · {itemsText(sale.items)}
                        </small>
                      </span>
                      <ChevronRight />
                    </button>
                  ) : (
                    <span className="delivery-date">
                      <b>{formatDay(l.date)}</b>
                      <small>
                        <span className="log-chip">{LOG_LABEL[l.status]}</span>
                      </small>
                    </span>
                  )}
                  {open && (
                    <span className="delivery-actions">
                      <button className="delivery-go" onClick={() => onDeliver(l.date)} aria-label={`Delivered on ${formatDate(l.date)}`}>
                        <Truck size={15} /> Deliver
                      </button>
                      <button className="stock-edit" onClick={() => onMissed(l.date, true)} aria-label={`Missed on ${formatDate(l.date)}`}>
                        Missed
                      </button>
                    </span>
                  )}
                  {l.status === 'missed' && (
                    <button className="stock-edit" onClick={() => onMissed(l.date, false)} aria-label={`Undo missed ${formatDate(l.date)}`}>
                      Undo
                    </button>
                  )}
                </div>
              );
            })}
            {log.length > shownLog.length && (
              <button className="care-more" onClick={() => setShowAll(true)}>
                Show all {log.length}
              </button>
            )}
          </div>
          {delivered > 0 && <p className="farm-help">Tap a delivery to see its sale.</p>}
        </section>
      )}

      <div className="supply-actions">
        <button className="farm-secondary" onClick={onEdit}>
          <Pencil size={16} /> Edit
        </button>
        {status === 'ended' ? (
          <button className="farm-secondary" onClick={() => onEnd(undefined)}>
            <Play size={16} /> Restart
          </button>
        ) : (
          <button className="farm-secondary" onClick={() => onEnd(addDaysToDate(today, -1))}>
            <CalendarClock size={16} /> End
          </button>
        )}
      </div>
      <button className="farm-danger" onClick={onDelete}>
        <Trash2 size={16} /> Delete subscription
      </button>
    </div>
  );
}

interface SubscriptionRowsProps {
  subscriptions: Subscription[];
  customers: Customer[];
  showCustomer?: boolean;
  onOpen: (id: string) => void;
}

export function SubscriptionRows({ subscriptions, customers, showCustomer = true, onOpen }: SubscriptionRowsProps) {
  const today = todayLocal();
  const rank = { active: 0, paused: 1, ended: 2 };
  const sorted = [...subscriptions].sort(
    (a, b) => rank[subStatus(a, today)] - rank[subStatus(b, today)] || customerName(customers, a.customerId).localeCompare(customerName(customers, b.customerId))
  );
  return (
    <div className="care-list">
      {sorted.map(s => {
        const status = subStatus(s, today);
        return (
          <button key={s.id} onClick={() => onOpen(s.id)} className={status === 'ended' ? 'muted' : undefined}>
            <span className="care-icon lime">
              <Repeat />
            </span>
            <span>
              <b>{showCustomer ? customerName(customers, s.customerId) : scheduleText(s)}</b>
              <small>{showCustomer ? `${scheduleText(s)} · ${boxText(s)}` : boxText(s)}</small>
            </span>
            {status !== 'active' && <span className="supply-badge">{status === 'paused' ? 'Paused' : 'Ended'}</span>}
            <ChevronRight />
          </button>
        );
      })}
    </div>
  );
}

type OrdersView = 'upcoming' | 'subscriptions' | 'sales';

interface OrdersPanelProps {
  supply: Map<string, Allocation[]>;
  orders: Order[];
  subscriptions: Subscription[];
  sales: Sale[];
  customers: Customer[];
  currency: string;
  onNewOrder: () => void;
  onNewSubscription: () => void;
  onNewSale: () => void;
  onOpenDelivery: (d: Delivery) => void;
  onOpenOrder: (id: string) => void;
  onOpenSubscription: (id: string) => void;
  onOpenSale: (id: string) => void;
}

const VIEW_KEY = 'thulir-orders-view';

// The Orders tab: deliveries coming up (orders and subscriptions), subscriptions, and sales.
export function OrdersPanel(p: OrdersPanelProps) {
  const today = todayLocal();
  const [view, setViewState] = useState<OrdersView>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return v === 'subscriptions' || v === 'sales' ? v : 'upcoming';
    } catch {
      return 'upcoming';
    }
  });
  const setView = (v: OrdersView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // not saved; it's only a convenience
    }
  };
  const upcoming = deliveriesBetween(p.orders, p.subscriptions, today, addDaysToDate(today, 13), true);
  const byDate = new Map<string, Delivery[]>();
  for (const d of upcoming) {
    const key = d.date < today ? 'overdue' : d.date;
    byDate.set(key, [...(byDate.get(key) ?? []), d]);
  }
  const past = p.orders
    .filter(o => o.status !== 'open')
    .sort((a, b) => b.deliverOn.localeCompare(a.deliverOn) || b.number - a.number)
    .slice(0, 10);
  const recentSales = [...p.sales].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number).slice(0, 50);
  const active = p.subscriptions.filter(s => subStatus(s, today) === 'active').length;
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">SELL AND DELIVER</p>
          <h1>Orders</h1>
          <p>Orders, subscriptions and sales.</p>
        </div>
      </div>
      <div className="segmented-control orders-views" role="tablist" aria-label="Show">
        {(
          [
            ['upcoming', 'Upcoming'],
            ['subscriptions', 'Subscriptions'],
            ['sales', 'Sales'],
          ] as const
        ).map(([v, label]) => (
          <button key={v} role="tab" aria-selected={view === v} aria-pressed={view === v} onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </div>

      {view === 'upcoming' && (
        <>
          <div className="supply-actions">
            <button className="farm-primary" onClick={p.onNewOrder}>
              <Plus size={18} /> New order
            </button>
            <button className="farm-secondary" onClick={p.onNewSubscription}>
              <Repeat size={16} /> Subscription
            </button>
          </div>
          {upcoming.length === 0 ? (
            <section className="farm-surface supply-empty">
              <h2>No deliveries in the next two weeks</h2>
              <p className="farm-help">Add an order for a delivery date, or a subscription that repeats every week.</p>
            </section>
          ) : (
            [...byDate.entries()].map(([date, list]) => (
              <section key={date}>
                <div className="section-heading">
                  <h2>{date === 'overdue' ? 'Overdue' : dayLabel(date, today)}</h2>
                  <span>{list.length}</span>
                </div>
                <DeliveryRows deliveries={list} customers={p.customers} showDate={date === 'overdue'} supply={p.supply} onOpen={p.onOpenDelivery} />
              </section>
            ))
          )}
          {past.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>Past orders</h2>
              </div>
              <div className="care-list">
                {past.map(o => (
                  <button key={o.id} onClick={() => p.onOpenOrder(o.id)} className="muted">
                    <span>
                      <b>
                        {orderCode(o.number)} · {customerName(p.customers, o.customerId)}
                      </b>
                      <small>
                        {o.status === 'delivered' ? 'Delivered' : 'Cancelled'} · {formatDate(o.deliverOn)} · {itemsText(o.items)}
                      </small>
                    </span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {view === 'subscriptions' && (
        <>
          <button className="farm-primary" onClick={p.onNewSubscription}>
            <Repeat size={18} /> New subscription
          </button>
          {p.subscriptions.length === 0 ? (
            <section className="farm-surface supply-empty">
              <h2>No subscriptions yet</h2>
              <p className="farm-help">For customers who get the same microgreens on the same days every week. Skip a day or pause it any time.</p>
            </section>
          ) : (
            <section>
              <div className="section-heading">
                <h2>Subscriptions</h2>
                <span>{active} active</span>
              </div>
              <SubscriptionRows subscriptions={p.subscriptions} customers={p.customers} onOpen={p.onOpenSubscription} />
            </section>
          )}
        </>
      )}

      {view === 'sales' && (
        <>
          <button className="farm-primary" onClick={p.onNewSale}>
            <ShoppingBag size={18} /> New sale
          </button>
          {recentSales.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>Recent sales</h2>
                <span>{p.sales.length}</span>
              </div>
              <SaleRows sales={recentSales} customers={p.customers} currency={p.currency} onOpen={p.onOpenSale} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

interface CustomerOrdersProps {
  customerId: string;
  orders: Order[];
  subscriptions: Subscription[];
  onNewOrder: () => void;
  onNewSubscription: () => void;
  onOpenOrder: (id: string) => void;
  onOpenSubscription: (id: string) => void;
}

// On a customer's page: their open orders and subscriptions.
export function CustomerOrders({ customerId, orders, subscriptions, onNewOrder, onNewSubscription, onOpenOrder, onOpenSubscription }: CustomerOrdersProps) {
  const today = todayLocal();
  const open = orders.filter(o => o.customerId === customerId && o.status === 'open').sort((a, b) => a.deliverOn.localeCompare(b.deliverOn));
  const subs = subscriptions.filter(s => s.customerId === customerId);
  return (
    <>
      <div className="supply-actions contact-actions">
        <button className="farm-secondary" onClick={onNewOrder}>
          <ClipboardList size={16} /> New order
        </button>
        <button className="farm-secondary" onClick={onNewSubscription}>
          <Repeat size={16} /> Subscription
        </button>
      </div>
      {(open.length > 0 || subs.length > 0) && (
        <section>
          <div className="section-heading">
            <h2>Orders and subscriptions</h2>
          </div>
          {subs.length > 0 && <SubscriptionRows subscriptions={subs} customers={[]} showCustomer={false} onOpen={onOpenSubscription} />}
          {open.length > 0 && (
            <div className="care-list">
              {open.map(o => (
                <button key={o.id} onClick={() => onOpenOrder(o.id)}>
                  <span className="care-icon lime">
                    <ClipboardList />
                  </span>
                  <span>
                    <b>
                      {orderCode(o.number)} · {dayLabel(o.deliverOn, today)}
                    </b>
                    <small>{itemsText(o.items)}</small>
                  </span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
