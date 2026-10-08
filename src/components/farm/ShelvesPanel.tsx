import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Settings2,
} from "lucide-react";
import { AppConfig, Batch, Tray } from "../../types";
import { getLayout, occupiedSlots, rackName } from "../../utils/farmLayout";
import { stageConfig } from "../../data/stages";
import TrayArt from "./TrayArt";
export default function ShelvesPanel({
  batches,
  config,
  onTray,
  onNew,
  onConfig,
}: {
  batches: Batch[];
  config: AppConfig;
  onTray: (batchId: string, trayId: string) => void;
  onNew: () => void;
  onConfig: () => void;
}) {
  const layout = getLayout(config),
    occupied = occupiedSlots(batches);
  const [rack, setRack] = useState(0),
    [shelf, setShelf] = useState<number | null>(null),
    [view, setView] = useState<"visual" | "list">("visual");
  const selectedRack = Math.min(rack, layout.rackCount - 1);
  const shelves = Array.from({ length: layout.shelvesPerRack }, (_, i) => ({
    index: i,
    slots: Array.from(
      { length: layout.traysPerShelf },
      (_, j) =>
        selectedRack * layout.shelvesPerRack * layout.traysPerShelf +
        i * layout.traysPerShelf +
        j +
        1,
    ).filter((n) => n <= config.totalTrays),
  })).filter((s) => s.slots.length);
  const activeShelf =
    shelf !== null ? shelves.find((s) => s.index === shelf) : undefined;
  const used = shelves
    .flatMap((s) => s.slots)
    .filter((n) => occupied.has(n)).length;
  function trayButton(slot: number, entry?: { batch: Batch; tray: Tray }) {
    return (
      <button
        key={slot}
        className={`rack-tray ${entry ? "" : "empty-slot"}`}
        onClick={() =>
          entry ? onTray(entry.batch.id, entry.tray.id) : onNew()
        }
        aria-label={
          entry ? `Open tray ${entry.tray.code}` : `Add tray in slot ${slot}`
        }
      >
        <TrayArt stage={entry?.batch.stage} empty={!entry} />
        <b>{entry?.tray.code ?? `Slot ${slot}`}</b>
        <span
          className={`stage-badge stage-${entry?.batch.stage ?? "completed"}`}
        >
          {entry ? stageConfig[entry.batch.stage].label : "+ Empty"}
        </span>
        {entry && <small>{entry.batch.cropType}</small>}
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
            {used} occupied · {shelves.flatMap((s) => s.slots).length} slots in{" "}
            {rackName(selectedRack)}
          </p>
        </div>
        <button
          className="farm-icon-button"
          onClick={onConfig}
          aria-label="Configure racks"
        >
          <Settings2 />
        </button>
      </div>
      <div className="view-toolbar">
        <div className="segmented-control">
          <button
            aria-pressed={view === "visual"}
            onClick={() => setView("visual")}
          >
            <LayoutGrid size={15} /> Visual
          </button>
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
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
      {view === "visual" && !activeShelf ? (
        <div className="shelf-tiles">
          {shelves.map((s) => (
            <button
              className="shelf-tile"
              key={s.index}
              onClick={() => setShelf(s.index)}
            >
              <div className="mini-shelf">
                {s.slots.slice(0, 4).map((n) => (
                  <TrayArt
                    key={n}
                    stage={occupied.get(n)?.batch.stage}
                    empty={!occupied.has(n)}
                  />
                ))}
                <span className="mini-shelf-rail" />
              </div>
              <div>
                <b>Shelf {s.index + 1}</b>
                <ChevronRight size={17} />
              </div>
              <small>
                {s.slots.filter((n) => occupied.has(n)).length} /{" "}
                {s.slots.length} trays
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
      ) : view === "visual" ? (
        <div className="visual-rack">
          <div className="rack-top">
            <b>{rackName(selectedRack)}</b>
            <span>Illustrative crop view</span>
          </div>
          <div className="rack-level">
            <span className="shelf-label">
              Shelf {(activeShelf?.index ?? 0) + 1}
            </span>
            <div className="rack-trays">
              {activeShelf?.slots.map((n) => trayButton(n, occupied.get(n)))}
            </div>
            <div className="shelf-rail" />
          </div>
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
                    onClick={() =>
                      e ? onTray(e.batch.id, e.tray.id) : onNew()
                    }
                  >
                    <TrayArt stage={e?.batch.stage} empty={!e} />
                    <span>
                      <b>
                        {e
                          ? `${e.tray.code} · ${e.batch.cropType}`
                          : `Slot ${n}`}
                      </b>
                      <small>
                        {e ? stageConfig[e.batch.stage].label : "Available"}
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                );
              })}
            </section>
          ))}
        </div>
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
        Tap a shelf to expand it, then a tray for its details. Empty slots are
        assigned when creating or editing a batch.
      </p>
    </div>
  );
}
