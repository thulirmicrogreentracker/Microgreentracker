import { ShoppingBag, Sprout } from 'lucide-react';

export type AppMode = 'farm' | 'shop';

interface ModeSwitchProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
  // Work waiting in each mode, shown as a badge on the other side of the switch.
  farmBadge: number;
  shopBadge: number;
}

// The Farm | Shop switch in the header.
export default function ModeSwitch({ mode, onChange, farmBadge, shopBadge }: ModeSwitchProps) {
  const options: [AppMode, string, typeof Sprout, number][] = [
    ['farm', 'Farm', Sprout, farmBadge],
    ['shop', 'Shop', ShoppingBag, shopBadge],
  ];
  return (
    <div className="mode-switch" role="group" aria-label="Farm or shop">
      {options.map(([key, label, Icon, badge]) => (
        <button key={key} aria-pressed={mode === key} onClick={() => onChange(key)} className={`mode-${key}`}>
          <Icon aria-hidden />
          {label}
          {mode !== key && badge > 0 && (
            <span className="mode-badge" aria-label={`${badge} waiting`}>
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
