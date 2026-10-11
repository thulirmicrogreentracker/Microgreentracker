import { AlertTriangle, ChevronRight, Package, Plus, Sprout, Layers, Archive } from 'lucide-react';
import { Batch, SupplyItem, SupplyKind } from '../../types';
import { formatAmount, isLow, stockOf, SUPPLY_KINDS, supplyAlerts, traysCovered } from '../../utils/supplies';
import { todayLocal } from '../../utils/dateUtils';

const kindIcon: Record<SupplyKind, typeof Sprout> = { seed: Sprout, media: Layers, packaging: Package, other: Archive };

interface SuppliesPanelProps {
  supplies: SupplyItem[];
  batches: Batch[];
  onOpen: (itemId: string) => void;
  onAdd: (kind?: SupplyKind) => void;
}

// The Supplies tab: seed, growing media, packaging and other things bought for the farm, with what's running low.
export default function SuppliesPanel({ supplies, batches, onOpen, onAdd }: SuppliesPanelProps) {
  const alerts = supplyAlerts(supplies, todayLocal());
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">FROM SEED TO TRAY</p>
          <h1>Supplies</h1>
          <p>Seed, coco peat and packaging.</p>
        </div>
        <button className="farm-icon-button" onClick={() => onAdd()} aria-label="Add supply">
          <Plus />
        </button>
      </div>

      {alerts.length > 0 && (
        <section className="supply-alerts" aria-label="Running low or expiring">
          {alerts.map(a => (
            <button key={`${a.item.id}-${a.kind}`} onClick={() => onOpen(a.item.id)}>
              <AlertTriangle aria-hidden />
              <span>
                <b>{a.item.name}</b> · {a.kind === 'low' ? 'running low' : a.kind === 'expired' ? 'expired' : 'expiring soon'}
                <small>{a.text}</small>
              </span>
            </button>
          ))}
        </section>
      )}

      {supplies.length === 0 ? (
        <section className="farm-surface supply-empty">
          <h2>Add your seed and coco peat</h2>
          <p className="farm-help">
            Each new batch then takes its seed and coco peat off the stock, and the app tells you when something runs low.
          </p>
          <button className="farm-primary" onClick={() => onAdd('seed')}>
            <Sprout size={18} /> Add seed
          </button>
          <button className="farm-secondary" onClick={() => onAdd('media')}>
            <Layers size={18} /> Add coco peat
          </button>
        </section>
      ) : (
        SUPPLY_KINDS.map(({ kind, plural }) => {
          const items = supplies.filter(i => i.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
          if (items.length === 0) return null;
          const Icon = kindIcon[kind];
          return (
            <section key={kind}>
              <div className="section-heading">
                <h2>{plural}</h2>
                <span>{items.length}</span>
              </div>
              <div className="care-list">
                {items.map(item => {
                  const stock = stockOf(item);
                  const trays = traysCovered(item, batches);
                  return (
                    <button key={item.id} onClick={() => onOpen(item.id)}>
                      <span className={`care-icon ${isLow(item) || stock === 0 ? 'supply-low' : 'lime'}`}>
                        <Icon />
                      </span>
                      <span>
                        <b>{item.name}</b>
                        <small>
                          {formatAmount(stock, item.unit)} in stock
                          {trays != null && ` · about ${trays} tray${trays === 1 ? '' : 's'}`}
                          {isLow(item) && ' · low'}
                        </small>
                      </span>
                      <ChevronRight />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
