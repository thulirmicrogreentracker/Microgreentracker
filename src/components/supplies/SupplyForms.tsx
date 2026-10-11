import React, { useState } from 'react';
import { CropType, SupplyItem, SupplyKind, SupplyLot } from '../../types';
import { newId } from '../../utils/batches';
import { todayLocal } from '../../utils/dateUtils';
import { SUPPLY_KINDS } from '../../utils/supplies';

// Numbers typed into the forms: blank is "not given"; anything else must be a number above zero.
const parse = (s: string): number | undefined | null => {
  if (!s.trim()) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="supply-field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

interface LotFieldsState {
  quantity: string;
  price: string;
  supplier: string;
  purchasedOn: string;
  expiresOn: string;
  lotNumber: string;
  remaining: string;
}

const lotState = (lot?: SupplyLot): LotFieldsState => ({
  quantity: lot ? String(lot.quantity) : '',
  price: lot?.price != null ? String(lot.price) : '',
  supplier: lot?.supplier ?? '',
  purchasedOn: lot?.purchasedOn ?? todayLocal(),
  expiresOn: lot?.expiresOn ?? '',
  lotNumber: lot?.lotNumber ?? '',
  remaining: lot ? String(lot.remaining) : '',
});

// The purchase fields; `editing` also shows how much of the lot is left, to correct stock.
const LotFields: React.FC<{ state: LotFieldsState; set: (s: LotFieldsState) => void; unit: string; currency: string; editing: boolean }> = ({
  state,
  set,
  unit,
  currency,
  editing,
}) => {
  const input = (key: keyof LotFieldsState, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={state[key]} onChange={e => set({ ...state, [key]: e.target.value })} {...props} />
  );
  return (
    <>
      <div className="supply-row">
        <Field label={`Quantity bought (${unit})`}>{input('quantity', { inputMode: 'decimal', placeholder: unit === 'g' ? '1000' : '5' })}</Field>
        <Field label={`Price paid (${currency})`}>{input('price', { inputMode: 'decimal', placeholder: 'Optional' })}</Field>
      </div>
      {editing && <Field label={`Left in stock (${unit})`}>{input('remaining', { inputMode: 'decimal' })}</Field>}
      <Field label="Supplier">{input('supplier', { placeholder: 'Optional' })}</Field>
      <div className="supply-row">
        <Field label="Bought on">{input('purchasedOn', { type: 'date' })}</Field>
        <Field label="Expires on">{input('expiresOn', { type: 'date' })}</Field>
      </div>
      <Field label="Lot or batch number">{input('lotNumber', { placeholder: 'Optional' })}</Field>
    </>
  );
};

// Checks the purchase fields; returns the lot or an error message.
const readLot = (s: LotFieldsState, id: string, editing: boolean): SupplyLot | string => {
  const quantity = parse(s.quantity);
  const price = parse(s.price);
  if (!quantity) return 'Enter how much you bought.';
  if (price === null) return 'The price must be a number above zero, or left blank.';
  let remaining = quantity;
  if (editing) {
    const r = s.remaining.trim() === '0' ? 0 : parse(s.remaining);
    if (r == null) return 'Enter how much is left (0 or more).';
    if (r > quantity) return 'What is left cannot be more than what you bought.';
    remaining = r;
  }
  if (s.expiresOn && s.expiresOn < s.purchasedOn) return 'The expiry date is before the purchase date.';
  return {
    id,
    quantity,
    remaining,
    price,
    supplier: s.supplier.trim() || undefined,
    purchasedOn: s.purchasedOn || todayLocal(),
    expiresOn: s.expiresOn || undefined,
    lotNumber: s.lotNumber.trim() || undefined,
  };
};

interface SupplyFormProps {
  item?: SupplyItem; // editing; otherwise a new item with its first purchase
  kind?: SupplyKind;
  cropTypes: CropType[];
  existing: SupplyItem[];
  currency: string;
  onSave: (item: SupplyItem) => void;
}

const defaultUnit: Record<SupplyKind, string> = { seed: 'g', media: 'block', packaging: 'pcs', other: 'pcs' };
const defaultLow: Record<SupplyKind, string> = { seed: '200', media: '2', packaging: '20', other: '' };

// Add or edit a supply. A new supply also records the first purchase.
export function SupplyForm({ item, kind: startKind, cropTypes, existing, currency, onSave }: SupplyFormProps) {
  const [kind, setKind] = useState<SupplyKind>(item?.kind ?? startKind ?? 'seed');
  const [crop, setCrop] = useState(item?.crop ?? '');
  const [name, setName] = useState(item && item.kind !== 'seed' ? item.name : startKind === 'media' ? 'Coco peat' : '');
  const [unit, setUnit] = useState(item?.unit ?? defaultUnit[kind]);
  const [traysPerUnit, setTraysPerUnit] = useState(item?.traysPerUnit != null ? String(item.traysPerUnit) : '');
  const [autoUse, setAutoUse] = useState(item?.autoUse ?? true);
  const [lowAt, setLowAt] = useState(item ? (item.lowAt != null ? String(item.lowAt) : '') : defaultLow[kind]);
  const [lot, setLot] = useState(lotState());
  const [error, setError] = useState('');

  const changeKind = (k: SupplyKind) => {
    setKind(k);
    setUnit(defaultUnit[k]);
    setLowAt(defaultLow[k]);
    if (k === 'media' && !name) setName('Coco peat');
    setError('');
  };

  const save = () => {
    const finalName = kind === 'seed' ? `${crop} seed` : name.trim();
    if (kind === 'seed' && !crop) return setError('Choose the crop this seed is for.');
    if (!finalName) return setError('Enter a name.');
    if (kind !== 'seed' && !unit.trim()) return setError('Enter the unit you buy it in, for example block or kg.');
    const duplicate = existing.find(i => i.id !== item?.id && i.name.toLowerCase() === finalName.toLowerCase());
    if (duplicate) return setError(`${duplicate.name} is already in Supplies. Open it and add a purchase there.`);
    const trays = parse(traysPerUnit);
    if (kind === 'media' && !trays) return setError(`Enter how many trays one ${unit.trim() || 'unit'} fills.`);
    const low = parse(lowAt);
    if (low === null) return setError('The low stock level must be a number above zero, or left blank.');
    let lots = item?.lots ?? [];
    if (!item) {
      const first = readLot(lot, newId(), false);
      if (typeof first === 'string') return setError(first);
      lots = [first];
    }
    onSave({
      id: item?.id ?? newId(),
      kind,
      name: finalName,
      crop: kind === 'seed' ? crop : undefined,
      unit: kind === 'seed' ? 'g' : unit.trim(),
      traysPerUnit: kind === 'media' ? trays! : undefined,
      autoUse: kind === 'media' ? autoUse : undefined,
      lowAt: low,
      lots,
      createdAt: item?.createdAt ?? new Date().toISOString(),
    });
  };

  const unitLabel = kind === 'seed' ? 'g' : unit.trim() || 'unit';
  return (
    <div className="farm-stack supply-form">
      {!item && (
        <div className="segmented-control supply-kinds" role="radiogroup" aria-label="Type of supply">
          {SUPPLY_KINDS.map(k => (
            <button key={k.kind} role="radio" aria-checked={kind === k.kind} aria-pressed={kind === k.kind} onClick={() => changeKind(k.kind)}>
              {k.label}
            </button>
          ))}
        </div>
      )}
      <section className="farm-surface">
        {kind === 'seed' ? (
          <Field label="Crop" hint="New batches of this crop take their seed from here.">
            <select value={crop} onChange={e => setCrop(e.target.value)}>
              <option value="">Choose a crop</option>
              {[...cropTypes].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Name">
              <input value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'media' ? 'Coco peat' : kind === 'packaging' ? '100 g clamshell box' : 'Name'} />
            </Field>
            <Field label="Unit" hint="How you buy and count it.">
              <input value={unit} onChange={e => setUnit(e.target.value)} list="supply-units" placeholder="block" />
              <datalist id="supply-units">
                {['block', 'kg', 'bag', 'litre', 'pcs', 'box', 'roll'].map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
          </>
        )}
        {kind === 'media' && (
          <>
            <Field label={`Trays one ${unitLabel} fills`}>
              <input value={traysPerUnit} onChange={e => setTraysPerUnit(e.target.value)} inputMode="decimal" placeholder="8" />
            </Field>
            <label className="setting-switch">
              <span>
                <b>Use for every new batch</b>
                <small>Each new batch takes its share off the stock.</small>
              </span>
              <input type="checkbox" role="switch" checked={autoUse} onChange={e => setAutoUse(e.target.checked)} />
            </label>
          </>
        )}
        <Field label={`Warn me at or below (${unitLabel})`} hint="Leave blank for no warning.">
          <input value={lowAt} onChange={e => setLowAt(e.target.value)} inputMode="decimal" />
        </Field>
      </section>
      {!item && (
        <section className="farm-surface">
          <h2>First purchase</h2>
          <LotFields state={lot} set={setLot} unit={unitLabel} currency={currency} editing={false} />
        </section>
      )}
      {error && (
        <p role="alert" className="supply-error">
          {error}
        </p>
      )}
      <button className="farm-primary" onClick={save}>
        {item ? 'Save changes' : 'Add to supplies'}
      </button>
    </div>
  );
}

interface LotFormProps {
  item: SupplyItem;
  lot?: SupplyLot; // editing; otherwise a new purchase
  currency: string;
  onSave: (lot: SupplyLot) => void;
  onDelete?: () => void;
}

// Add a purchase to a supply, or correct one.
export function LotForm({ item, lot, currency, onSave, onDelete }: LotFormProps) {
  const [state, setState] = useState(lotState(lot));
  const [error, setError] = useState('');
  const save = () => {
    const result = readLot(state, lot?.id ?? newId(), !!lot);
    if (typeof result === 'string') return setError(result);
    onSave(result);
  };
  return (
    <div className="farm-stack supply-form">
      <section className="farm-surface">
        <LotFields state={state} set={setState} unit={item.unit} currency={currency} editing={!!lot} />
      </section>
      {error && (
        <p role="alert" className="supply-error">
          {error}
        </p>
      )}
      <button className="farm-primary" onClick={save}>
        {lot ? 'Save changes' : 'Add purchase'}
      </button>
      {lot && onDelete && (
        <button className="farm-danger" onClick={onDelete}>
          Delete this purchase
        </button>
      )}
    </div>
  );
}
