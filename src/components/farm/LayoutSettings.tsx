import { useState } from "react";
import { Check, LayoutGrid } from "lucide-react";
import { AppConfig, Batch } from "../../types";
import { getLayout, occupiedSlots } from "../../utils/farmLayout";
import { MAX_TRAY_POSITIONS } from "../../utils/batches";
export default function LayoutSettings({
  config,
  batches,
  onSave,
}: {
  config: AppConfig;
  batches: Batch[];
  onSave: (c: AppConfig) => void;
}) {
  const current = getLayout(config);
  const [racks, setRacks] = useState(String(current.rackCount)),
    [shelves, setShelves] = useState(String(current.shelvesPerRack)),
    [trays, setTrays] = useState(String(current.traysPerShelf));
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const values = [racks, shelves, trays].map(Number),
    capacity = values.reduce((a, b) => a * b, 1);
  const save = () => {
    setSaved(false);
    if (
      values.some((n) => !Number.isInteger(n) || n < 1) ||
      capacity > MAX_TRAY_POSITIONS
    ) {
      setError(
        `Use positive whole numbers with at most ${MAX_TRAY_POSITIONS} total slots.`,
      );
      return;
    }
    const highest = Math.max(0, ...occupiedSlots(batches).keys());
    if (capacity < highest) {
      setError(
        `Slot ${highest} is occupied. Move its tray before reducing capacity.`,
      );
      return;
    }
    if (
      occupiedSlots(batches).size > 0 &&
      (Number(shelves) !== current.shelvesPerRack ||
        Number(trays) !== current.traysPerShelf) &&
      !window.confirm(
        "This changes the rack / shelf labels for existing slot numbers. Tray IDs and records stay unchanged. Update the physical layout?",
      )
    )
      return;
    onSave({
      ...config,
      totalTrays: capacity,
      farmLayout: {
        rackCount: values[0],
        shelvesPerRack: values[1],
        traysPerShelf: values[2],
      },
    });
    setError("");
    setSaved(true);
  };
  return (
    <section className="farm-surface layout-settings">
      <div className="section-heading">
        <h2>
          <LayoutGrid size={18} /> Racks & shelves
        </h2>
        <span>{config.totalTrays} slots</span>
      </div>
      <p className="farm-help">
        Rack → Shelf → Tray. Configure matching racks; existing tray slot
        numbers are preserved.
      </p>
      <div className="layout-fields">
        {[
          ["Racks", racks, setRacks],
          ["Shelves / rack", shelves, setShelves],
          ["Trays / shelf", trays, setTrays],
        ].map(([label, value, setter]) => (
          <label key={label as string}>
            {label as string}
            <input
              aria-label={label as string}
              type="number"
              min="1"
              max="2000"
              value={value as string}
              onChange={(e) => {
                (setter as (v: string) => void)(e.target.value);
                setSaved(false);
              }}
            />
          </label>
        ))}
      </div>
      <p className="layout-capacity">
        {Number.isFinite(capacity) ? capacity : 0} total tray positions
      </p>
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
      <button className="farm-primary" onClick={save}>
        {saved ? (
          <>
            <Check size={17} /> Layout saved
          </>
        ) : (
          "Save rack layout"
        )}
      </button>
    </section>
  );
}
