import { AlertTriangle, ChevronRight, Sprout } from 'lucide-react';
import { addDaysToDate, formatDay, todayLocal } from '../../utils/dateUtils';
import { formatGrams } from '../../utils/batches';
import { DEFAULT_TRAY_YIELD, Shortfall, SowPlan } from '../../utils/plan';

const when = (date: string, today: string) =>
  date === today ? 'today' : date === addDaysToDate(today, 1) ? 'tomorrow' : formatDay(date);

// Rows for sowings to make (each opens a new batch with the crop and trays filled in) and deliveries too soon to grow
// for.
export function SowRows({ plans, short, onSow }: { plans: SowPlan[]; short: Shortfall[]; onSow: (p: SowPlan) => void }) {
  const today = todayLocal();
  return (
    <>
      {short.map(s => (
        <div key={`short-${s.crop}-${s.date}`} className="care-row-static">
          <span className="care-icon supply-low">
            <AlertTriangle />
          </span>
          <span>
            <b>
              {s.crop}: {formatGrams(s.grams)} short for {when(s.date, today)}
            </b>
            <small>Too soon to sow for it. Harvest early, or deliver less.</small>
          </span>
        </div>
      ))}
      {plans.map(p => (
        <button key={`sow-${p.crop}-${p.sowBy}`} onClick={() => onSow(p)}>
          <span className="care-icon lime">
            <Sprout />
          </span>
          <span>
            <b>
              Sow {p.trays} tray{p.trays === 1 ? '' : 's'} of {p.crop}
            </b>
            <small>
              {p.sowBy === today ? 'Today' : `By ${when(p.sowBy, today)}`} · for {when(p.forDate, today)} ({formatGrams(p.grams)} more needed)
            </small>
          </span>
          <ChevronRight />
        </button>
      ))}
    </>
  );
}

const EstimateNote = ({ plans }: { plans: SowPlan[] }) => {
  const guessed = [...new Set(plans.filter(p => p.estimated).map(p => p.crop))];
  return guessed.length ? (
    <p className="farm-help sow-note">
      {guessed.join(', ')}: worked out at {DEFAULT_TRAY_YIELD} g a tray until you weigh a harvest of {guessed.length === 1 ? 'it' : 'them'}.
    </p>
  ) : null;
};

interface SowForOrdersProps {
  plans: SowPlan[];
  short: Shortfall[];
  freePositions: number;
  onSow: (p: SowPlan) => void;
  onAll: () => void;
}

// On Farm Home: what to sow this week so the Shop's orders and subscriptions have enough.
export function SowForOrders({ plans, short, freePositions, onSow, onAll }: SowForOrdersProps) {
  const today = todayLocal();
  const thisWeek = plans.filter(p => p.sowBy <= addDaysToDate(today, 6));
  const shown = thisWeek.slice(0, 3);
  const shownShort = short.slice(0, 1);
  const more = plans.length + short.length - shown.length - shownShort.length;
  const weekTrays = thisWeek.reduce((n, p) => n + p.trays, 0);
  if (!plans.length && !short.length) return null;
  return (
    <section>
      <div className="section-heading">
        <h2>Sow for orders</h2>
        <button onClick={onAll}>
          {plans.length} sowing{plans.length === 1 ? '' : 's'} <ChevronRight size={14} />
        </button>
      </div>
      <div className="care-list">
        <SowRows plans={shown} short={shownShort} onSow={onSow} />
        {shown.length === 0 && shownShort.length === 0 && (
          <div className="care-empty">
            <Sprout />
            <span>Nothing to sow this week. Next: {plans[0] && `${plans[0].crop} by ${formatDay(plans[0].sowBy)}`}.</span>
          </div>
        )}
        {more > 0 && (
          <button className="care-more" onClick={onAll}>
            See all for the next weeks <ChevronRight />
          </button>
        )}
      </div>
      {weekTrays > freePositions && (
        <p className="sale-warn sow-note">
          This week needs {weekTrays} tray{weekTrays === 1 ? '' : 's'}, and {freePositions} tray position{freePositions === 1 ? ' is' : 's are'} free.
          Harvest first, or add racks under Settings → Racks & shelves.
        </p>
      )}
    </section>
  );
}

// The full plan, on its own page.
export function SowForOrdersPage({ plans, short, onSow }: { plans: SowPlan[]; short: Shortfall[]; onSow: (p: SowPlan) => void }) {
  return (
    <div className="farm-stack">
      <p className="farm-help">
        From your orders and subscriptions for the next weeks, after the stock you have and the batches already growing.
        Tap a sowing to start the batch.
      </p>
      {short.length > 0 && (
        <section>
          <p className="care-group-label">TOO SOON TO GROW · {short.length}</p>
          <div className="care-list">
            <SowRows plans={[]} short={short} onSow={onSow} />
          </div>
        </section>
      )}
      <section>
        <p className="care-group-label">TO SOW · {plans.length}</p>
        <div className="care-list">
          <SowRows plans={plans} short={[]} onSow={onSow} />
          {plans.length === 0 && (
            <div className="care-empty">
              <Sprout />
              <span>Stock and growing batches cover your orders.</span>
            </div>
          )}
        </div>
      </section>
      <EstimateNote plans={plans} />
    </div>
  );
}
