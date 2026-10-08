import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, LayoutGrid, Rows3, List, Plus, Settings2 } from 'lucide-react';
import { AppConfig, Batch, Tray } from '../../types';
import { getLayout, occupiedSlots, rackName, rackShelves } from '../../utils/farmLayout';
import { batchCode } from '../../utils/batches';
import { getDaysSince, getRelativeTimeString } from '../../utils/dateUtils';
import { stageConfig } from '../../data/stages';
import TrayArt from './TrayArt';
export default function ShelvesPanel({
  batches,
  config,
  onTray,
  onNew,
  onConfig,
  onBatch,
}: {
  batches: Batch[];
  config: AppConfig;
  onTray: (batchId: string, trayId: string) => void;
  onNew: () => void;
  onConfig: () => void;
  onBatch: (batchId: string) => void;
}) {
  const layout = getLayout(config),
    occupied = occupiedSlots(batches);
  const [rack, setRack] = useState(0),
    [shelf, setShelf] = useState<number | null>(null),
    [view, setView] = useState<'visual' | 'tiles' | 'list'>('visual');
  const selectedRack = Math.min(rack, layout.rackCount - 1);
  const shelves = Array.from({ length: layout.shelvesPerRack }, (_, i) => ({
    index: i,
    slots: Array.from(
      { length: layout.traysPerShelf },
      (_, j) => selectedRack * layout.shelvesPerRack * layout.traysPerShelf + i * layout.traysPerShelf + j + 1
    ).filter((n) => n <= config.totalTrays),
  })).filter((s) => s.slots.length);
  const activeShelf = shelf !== null ? shelves.find((s) => s.index === shelf) : undefined;
  const used = shelves.flatMap((s) => s.slots).filter((n) => occupied.has(n)).length;
  // The batches growing on the rack (or on the one shelf shown), with the slots each one has here.
  const shownSlots = (activeShelf ? [activeShelf] : shelves).flatMap((s) => s.slots).filter((n) => occupied.has(n));
  const rackBatches = [...new Set(shownSlots.map((n) => occupied.get(n)!.batch))].map((batch) => ({
    batch,
    slots: shownSlots.filter((n) => occupied.get(n)!.batch === batch),
  }));
  const batchLine = (batch: Batch) => `${batchCode(batch.batchNumber)} · Day ${getDaysSince(batch.sowingDate)}`;
  function trayButton(slot: number, entry?: { batch: Batch; tray: Tray }) {
    return (
      <button
        key={slot}
        className={`rack-tray ${entry ? '' : 'empty-slot'}`}
        onClick={() => (entry ? onTray(entry.batch.id, entry.tray.id) : onNew())}
        aria-label={entry ? `Open tray ${entry.tray.code}, ${batchCode(entry.batch.batchNumber)} ${entry.batch.cropType}` : `Add tray in slot ${slot}`}
      >
        <TrayArt stage={entry?.batch.stage} empty={!entry} />
        <b>{entry ? `${entry.tray.code} · ${batchCode(entry.batch.batchNumber)}` : `Slot ${slot}`}</b>
        <span className={`stage-badge stage-${entry?.batch.stage ?? 'completed'}`}>
          {entry ? stageConfig[entry.batch.stage].label : '+ Empty'}
        </span>
        {entry && (
          <small>
            {entry.batch.cropType} · Day {getDaysSince(entry.batch.sowingDate)}
          </small>
        )}
      </button>
    );
  }
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">YOUR GROWING SPACE</p>
          <h1>Shelves & trays</h1>
          <p>
            {used} occupied · {shelves.flatMap((s) => s.slots).length} slots in {rackName(selectedRack)}
          </p>
        </div>
        <button className="farm-icon-button" onClick={onConfig} aria-label="Configure racks">
          <Settings2 />
        </button>
      </div>
      <div className="view-toolbar">
        <div className="segmented-control">
          <button aria-pressed={view === 'visual'} onClick={() => setView('visual')}>
            <Rows3 size={15} /> Rack
          </button>
          <button aria-pressed={view === 'tiles'} onClick={() => setView('tiles')}>
            <LayoutGrid size={15} /> Tiles
          </button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={15} /> List
          </button>
        </div>
        <label className="rack-select">
          <span className="sr-only">Select rack</span>
          <select
            value={selectedRack}
            onChange={(e) => {
              setRack(Number(e.target.value));
              setShelf(null);
            }}
          >
            {Array.from({ length: layout.rackCount }, (_, i) => (
              <option key={i} value={i}>
                {rackName(i)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      {activeShelf && (
        <button className="farm-back" onClick={() => setShelf(null)}>
          <ArrowLeft size={16} /> All shelves in {rackName(selectedRack)}
        </button>
      )}
      {view === 'tiles' && !activeShelf ? (
        <div className="shelf-tiles">
          {shelves.map((s) => (
            <button className="shelf-tile" key={s.index} onClick={() => setShelf(s.index)}>
              <div className="mini-shelf">
                {s.slots.slice(0, 4).map((n) => (
                  <TrayArt key={n} stage={occupied.get(n)?.batch.stage} empty={!occupied.has(n)} />
                ))}
                <span className="mini-shelf-rail" />
              </div>
              <div>
                <b>Shelf {s.index + 1}</b>
                <ChevronRight size={17} />
              </div>
              <small>
                {s.slots.filter((n) => occupied.has(n)).length} / {s.slots.length} trays
              </small>
              <div className="capacity-track">
                <i
                  style={{
                    width: `${(s.slots.filter((n) => occupied.has(n)).length / s.slots.length) * 100}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      ) : view === 'visual' || view === 'tiles' ? (
        <div className="steel-rack" aria-label={`${rackName(selectedRack)}, ${shelves.length} shelves`}>
          <div className="steel-rack-name">
            <b>{rackName(selectedRack)}</b>
            <span>
              {shelves.length} shelves · {layout.traysPerShelf} tray
              {layout.traysPerShelf === 1 ? '' : 's'} per shelf
            </span>
          </div>
          <div className="steel-rack-frame">
            <div className="steel-post steel-post-left" aria-hidden="true" />
            <div className="steel-post steel-post-right" aria-hidden="true" />
            <div className="steel-topbar" aria-hidden="true" />
            {(activeShelf ? [activeShelf] : shelves).map((s) => (
              <section className="steel-level" key={s.index} aria-label={`Shelf ${s.index + 1}`}>
                <button
                  className="steel-shelf-label"
                  aria-label={`Expand shelf ${s.index + 1}`}
                  onClick={() => setShelf(activeShelf ? null : s.index)}
                >
                  Shelf {s.index + 1}
                </button>
                <div className="steel-grow-light" aria-hidden="true" />
                <div
                  className={`steel-tray-row ${s.slots.length === 1 ? 'single-tray' : ''}`}
                  // At most 4 trays side by side on a phone; more wrap onto another row and the shelf grows.
                  style={s.slots.length > 1 ? { gridTemplateColumns: `repeat(${Math.min(s.slots.length, 4)}, minmax(0, 1fr))` } : undefined}
                >
                  {s.slots.map((n) => trayButton(n, occupied.get(n)))}
                </div>
                <div className="steel-deck" aria-hidden="true">
                  <i />
                </div>
                <i className="steel-collar left" aria-hidden="true" />
                <i className="steel-collar right" aria-hidden="true" />
              </section>
            ))}
            <div className="steel-feet" aria-hidden="true">
              <i />
              <i />
            </div>
          </div>
          <p className="steel-caption">Tap a tray to view its details</p>
        </div>
      ) : (
        <div className="farm-stack">
          {(activeShelf ? [activeShelf] : shelves).map((s) => (
            <section className="farm-surface" key={s.index}>
              <h2>Shelf {s.index + 1}</h2>
              {s.slots.map((n) => {
                const e = occupied.get(n);
                return (
                  <button
                    key={n}
                    className="slot-list-row"
                    onClick={() => (e ? onTray(e.batch.id, e.tray.id) : onNew())}
                  >
                    <TrayArt stage={e?.batch.stage} empty={!e} />
                    <span>
                      <b>{e ? `${e.tray.code} · ${e.batch.cropType}` : `Slot ${n}`}</b>
                      <small>{e ? `${stageConfig[e.batch.stage].label} · ${batchLine(e.batch)}` : 'Available'}</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {rackBatches.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Batches on {activeShelf ? `shelf ${activeShelf.index + 1}` : rackName(selectedRack)}</h2>
            <span>{rackBatches.length}</span>
          </div>
          <div className="rack-batches">
            {rackBatches.map(({ batch, slots }) => (
              <button key={batch.id} className="rack-batch" onClick={() => onBatch(batch.id)}>
                <TrayArt stage={batch.stage} />
                <span>
                  <b>
                    {batchCode(batch.batchNumber)} · {batch.cropType}
                  </b>
                  <small>
                    {slots.length} tray{slots.length === 1 ? '' : 's'} · {rackShelves(slots, config)[0]?.shelves}
                  </small>
                  <small>
                    Day {getDaysSince(batch.sowingDate)} · Harvest {getRelativeTimeString(batch.expectedHarvestDate).toLowerCase()}
                  </small>
                </span>
                <span className={`stage-badge stage-${batch.stage}`}>{stageConfig[batch.stage].label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="stage-legend">
        <span>
          <i className="stage-sowing" />
          Sowing
        </span>
        <span>
          <i className="stage-germination" />
          Germination
        </span>
        <span>
          <i className="stage-growth" />
          Growing
        </span>
        <span>
          <i className="stage-harvest" />
          Ready
        </span>
      </div>
      <button className="farm-primary" onClick={onNew}>
        <Plus size={18} /> Add a batch
      </button>
      <p className="farm-help">
        Tap a tray for details, or a shelf label to focus on one shelf. Empty slots are assigned when creating or
        editing a batch.
      </p>
    </div>
  );
}
