import { ArrowUpRight, Check, ChevronRight, CheckCircle2, Droplets, Leaf, Plus, Sprout, Sun, X } from 'lucide-react';
import { Batch, CropType } from '../../types';
import { activeTrays, batchCode, isBatchGrowing } from '../../utils/batches';
import { getDaysSince } from '../../utils/dateUtils';
import TrayArt from './TrayArt';
export type StageFilter = Batch['stage'] | 'lost' | 'all';

// Growing batches that are due for watering (by their crop's watering interval) or ready to harvest.
export const careTasks = (batches: Batch[], cropTypes: CropType[]) => {
  const growing = batches.filter(isBatchGrowing);
  const watering = growing.filter((b) => {
    const last = b.watering.slice(-1)[0];
    return (
      !last || getDaysSince(last.timestamp) >= (cropTypes.find((c) => c.name === b.cropType)?.wateringFrequency ?? 1)
    );
  });
  return { watering, ready: growing.filter((b) => b.stage === 'harvest') };
};

const trays = (b: Batch) => `${activeTrays(b).length} tray${activeTrays(b).length === 1 ? '' : 's'}`;

// The rows of a care list: watering tasks open the watering form, harvest tasks open the batch.
export function CareRows({
  watering,
  ready,
  onWater,
  onBatch,
}: {
  watering: Batch[];
  ready: Batch[];
  onWater: (id: string) => void;
  onBatch: (id: string) => void;
}) {
  return (
    <>
      {watering.map((b) => (
        <button key={`w-${b.id}`} onClick={() => onWater(b.id)}>
          <span className="care-icon">
            <Droplets />
          </span>
          <span>
            <b>Water {b.cropType}</b>
            <small>
              {batchCode(b.batchNumber)} · {trays(b)} · Day {getDaysSince(b.sowingDate)}
            </small>
          </span>
          <ChevronRight />
        </button>
      ))}
      {ready.map((b) => (
        <button key={`h-${b.id}`} onClick={() => onBatch(b.id)}>
          <span className="care-icon lime">
            <Sprout />
          </span>
          <span>
            <b>Harvest {b.cropType}</b>
            <small>
              {batchCode(b.batchNumber)} · {trays(b)} ready
            </small>
          </span>
          <ChevronRight />
        </button>
      ))}
    </>
  );
}

// Every care task, on its own page.
export function AllTasks({
  batches,
  cropTypes,
  onWater,
  onBatch,
}: {
  batches: Batch[];
  cropTypes: CropType[];
  onWater: (id: string) => void;
  onBatch: (id: string) => void;
}) {
  const { watering, ready } = careTasks(batches, cropTypes);
  return (
    <div className="farm-stack">
      {ready.length > 0 && (
        <section>
          <p className="care-group-label">HARVEST · {ready.length}</p>
          <div className="care-list">
            <CareRows watering={[]} ready={ready} onWater={onWater} onBatch={onBatch} />
          </div>
        </section>
      )}
      {watering.length > 0 && (
        <section>
          <p className="care-group-label">WATER · {watering.length}</p>
          <div className="care-list">
            <CareRows watering={watering} ready={[]} onWater={onWater} onBatch={onBatch} />
          </div>
        </section>
      )}
      {!watering.length && !ready.length && (
        <div className="care-list">
          <div className="care-empty">
            <CheckCircle2 />
            <span>All caught up. Let them grow.</span>
          </div>
        </div>
      )}
    </div>
  );
}
export default function FarmHome({
  batches,
  cropTypes,
  onStage,
  onNew,
  onWater,
  onShelves,
  onBatch,
  onAllTasks,
}: {
  batches: Batch[];
  cropTypes: CropType[];
  onStage: (stage: StageFilter) => void;
  onNew: () => void;
  onWater: (id: string) => void;
  onShelves: () => void;
  onBatch: (id: string) => void;
  onAllTasks: () => void;
}) {
  const stages = [
    ['sowing', 'Sowing', Sprout],
    ['germination', 'Germination', Sprout],
    ['growth', 'Growing', Leaf],
    ['harvest', 'Ready to harvest', Sun],
    ['completed', 'Completed', Check],
    ['lost', 'Lost', X],
  ] as const;
  const count = (s: StageFilter) =>
    batches.reduce(
      (n, b) =>
        n +
        (s === 'lost' ? b.trays.filter((t) => t.status === 'lost').length : b.stage === s ? activeTrays(b).length : 0),
      0
    );
  const growing = batches.filter(isBatchGrowing);
  const { watering, ready } = careTasks(batches, cropTypes);
  const taskCount = watering.length + ready.length;
  // Up to three tasks on Home, including a harvest when there is one; the rest are on the All tasks page.
  const previewReady = ready.slice(0, 1);
  const previewWatering = watering.slice(0, 3 - previewReady.length);
  const hidden = taskCount - previewReady.length - previewWatering.length;
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">A LITTLE GROWTH, EVERY DAY</p>
          <h1>
            My farm<span className="heading-dot">.</span>
          </h1>
          <p>Every tray, every stage.</p>
        </div>
        <div className="botanical-mark">
          <Sprout />
        </div>
      </div>
      <div className="farm-metrics">
        <button onClick={() => onStage('all')}>
          <span className="metric-icon">
            <Leaf />
          </span>
          <div>
            <strong>{growing.reduce((n, b) => n + activeTrays(b).length, 0)}</strong>
            <span>Active trays</span>
          </div>
        </button>
        <button onClick={() => onStage('harvest')}>
          <span className="metric-icon lime">
            <Sprout />
          </span>
          <div>
            <strong>{count('harvest')}</strong>
            <span>Ready to harvest</span>
          </div>
        </button>
      </div>
      <section>
        <div className="section-heading">
          <h2>Growth stages</h2>
          <span>TRAYS</span>
        </div>
        <div className="stage-grid">
          {stages.map(([key, label, Icon]) => (
            <button key={key} onClick={() => onStage(key)} className={`stage-card stage-${key}`}>
              <span className="stage-icon">
                <Icon />
              </span>
              <span>
                <span>{label}</span>
                <strong>{count(key)}</strong>
              </span>
              <ArrowUpRight className="stage-arrow" />
            </button>
          ))}
        </div>
      </section>
      <section>
        <div className="section-heading">
          <h2>Today's care</h2>
          {taskCount > 0 ? (
            <button onClick={onAllTasks}>
              {taskCount} task{taskCount === 1 ? '' : 's'} <ChevronRight size={14} />
            </button>
          ) : (
            <span>0 tasks</span>
          )}
        </div>
        <div className="care-list">
          <CareRows watering={previewWatering} ready={previewReady} onWater={onWater} onBatch={onBatch} />
          {hidden > 0 && (
            <button className="care-more" onClick={onAllTasks}>
              See all {taskCount} tasks <ChevronRight />
            </button>
          )}
          {!taskCount && (
            <div className="care-empty">
              <CheckCircle2 />
              <span>{batches.length ? 'All caught up. Let them grow.' : 'Your first harvest starts with a seed.'}</span>
            </div>
          )}
        </div>
      </section>
      <button className="farm-primary" onClick={onNew}>
        <Plus size={20} /> {batches.length ? 'New batch' : 'Add Your First Batch'}
      </button>
      <button className="garden-banner" onClick={onShelves}>
        <div>
          <span className="eyebrow">YOUR GROWING SPACE</span>
          <h3>A place for every tray.</h3>
          <span>
            Explore shelves <ArrowUpRight size={15} />
          </span>
        </div>
        <TrayArt />
      </button>
    </div>
  );
}
