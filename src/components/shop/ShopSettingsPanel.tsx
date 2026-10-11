import { Check } from 'lucide-react';
import { ShopSettings } from '../../types';
import { currencies, formatMoney, shopAccents } from '../../data/shop';

interface ShopSettingsPanelProps {
  shop: ShopSettings;
  onChange: (shop: ShopSettings) => void;
}

// Settings → Shop: show or hide Shop mode, its colour and the currency for prices.
export default function ShopSettingsPanel({ shop, onChange }: ShopSettingsPanelProps) {
  const set = (patch: Partial<ShopSettings>) => onChange({ ...shop, ...patch });
  const known = currencies.some(c => c.code === shop.currency);
  return (
    <div className="farm-stack">
      <section className="farm-surface">
        <label className="setting-switch">
          <span>
            <b>I sell my microgreens</b>
            <small>Shows the Farm / Shop switch at the top, for orders, subscriptions, customers and stock.</small>
          </span>
          <input type="checkbox" role="switch" checked={shop.enabled} onChange={e => set({ enabled: e.target.checked })} />
        </label>
      </section>

      <section className="farm-surface">
        <h2>Shop colour</h2>
        <p className="farm-help">Used for the switch and the bottom bar in Shop, so you can see which side you're on.</p>
        <div className="accent-swatches" role="radiogroup" aria-label="Shop colour">
          {shopAccents.map(a => (
            <button
              key={a.key}
              role="radio"
              aria-checked={shop.accent === a.key}
              aria-label={a.label}
              title={a.label}
              onClick={() => set({ accent: a.key })}
              style={{ background: a.color }}
            >
              {shop.accent === a.key && <Check aria-hidden />}
            </button>
          ))}
        </div>
      </section>

      <section className="farm-surface">
        <h2>Currency</h2>
        <p className="farm-help">For prices, sales and reports.</p>
        <select className="farm-select" value={shop.currency} onChange={e => set({ currency: e.target.value })} aria-label="Currency">
          {!known && <option value={shop.currency}>{shop.currency}</option>}
          {currencies.map(c => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="farm-help">Example: {formatMoney(1250.5, shop.currency)}</p>
      </section>
    </div>
  );
}
