import { useState } from 'react';
import { Check, LayoutGrid } from 'lucide-react';
import { AppConfig, Batch } from '../../types';
import { getLayout, MAX_RACKS, MAX_SHELVES_PER_RACK, MAX_TRAYS_PER_SHELF, occupiedSlots } from '../../utils/farmLayout';
import { MAX_TRAY_POSITIONS } from '../../utils/batches';
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
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const values = [racks, shelves, trays].map(Number),
    capacity = values.reduce((a, b) => a * b, 1);
  const fields: [string, string, (v: string) => void, number][] = [
    ['Racks', racks, setRacks, MAX_RACKS],
    ['Shelves / rack', shelves, setShelves, MAX_SHELVES_PER_RACK],
    ['Trays / shelf', trays, setTrays, MAX_TRAYS_PER_SHELF],
  ];
  const save = () => {
    setSaved(false);
    const fieldError = fields.find(([label, value, , max]) => {
      const n = Number(value);
      return !Number.isInteger(n) || n < 1 || n > max ? label : undefined;
    });
    if (fieldError) {
      setError(`${fieldError[0]} must be a whole number from 1 to ${fieldError[3]}.`);
      return;
    }
    if (capacity > MAX_TRAY_POSITIONS) {
      setError(`That's ${capacity} tray positions; the most is ${MAX_TRAY_POSITIONS}.`);
      return;
    }
    const highest = Math.max(0, ...occupiedSlots(batches).keys());
    if (capacity < highest) {
      setError(`Slot ${highest} is occupied. Move its tray before reducing capacity.`);
      return;
    }
    if (
      occupiedSlots(batches).size > 0 &&
      (Number(shelves) !== current.shelvesPerRack || Number(trays) !== current.traysPerShelf) &&
      !window.confirm(
        'This changes the rack / shelf labels for existing slot numbers. Tray IDs and records stay unchanged. Update the physical layout?'
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
    setError('');
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
        Rack → Shelf → Tray. Configure matching racks; existing tray slot numbers are preserved.
      </p>
      <button
        className="farm-secondary vertical-layout-preset"
        onClick={() => {
          setRacks(String(Math.ceil(config.totalTrays / 6)));
          setShelves('6');
          setTrays('1');
          setSaved(false);
          setError('');
        }}
      >
        Use vertical rack · 6 shelves × 1 tray
      </button>
      <div className="layout-fields">
        {fields.map(([label, value, setter, max]) => (
          <label key={label}>
            {label}
            <input
              aria-label={label}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={String(max).length + 1} // room to type a too-large number and see why it's refused
              value={value}
              onChange={(e) => {
                setter(e.target.value.replace(/\D/g, ''));
                setSaved(false);
                setError('');
              }}
            />
          </label>
        ))}
      </div>
      <p className="farm-help">
        Up to {MAX_SHELVES_PER_RACK} shelves per rack and {MAX_TRAYS_PER_SHELF} trays per shelf.
      </p>
      <p className="layout-capacity">{Number.isFinite(capacity) ? capacity : 0} total tray positions</p>
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
          'Save rack layout'
        )}
      </button>
    </section>
  );
}
