import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BellRing } from 'lucide-react';
import { NotificationSettings } from '../types';
import { askNotificationPermission, notificationPermission } from '../utils/notify';

interface Props {
  settings: NotificationSettings;
  shopOn: boolean;
  today: string[]; // today's summary lines, as a preview
  onChange: (s: NotificationSettings) => void;
  onTest: () => Promise<void>;
}

// Settings → Notifications: a morning summary and an evening reminder, and what they include.
export default function NotificationSettingsPanel({ settings, shopOn, today, onChange, onTest }: Props) {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [message, setMessage] = useState('');
  const native = Capacitor.isNativePlatform();
  useEffect(() => {
    notificationPermission().then(setPermission).catch(() => setPermission('unknown'));
  }, []);
  const set = (patch: Partial<NotificationSettings>) => onChange({ ...settings, ...patch });

  const turnOn = async (on: boolean) => {
    setMessage('');
    if (!on) return set({ enabled: false });
    if (!native) return setMessage('Notifications work in the phone app.');
    const granted = permission === 'granted' || (await askNotificationPermission());
    setPermission(granted ? 'granted' : 'denied');
    if (!granted) return setMessage("Notifications are blocked for this app. Allow them in your phone's Settings → Apps → Thulir → Notifications, then try again.");
    set({ enabled: true });
  };

  const kinds: [keyof NotificationSettings, string, string][] = [
    ['watering', 'Watering', 'Batches due for water'],
    ...(shopOn ? ([['deliveries', 'Deliveries', "The day's orders and subscription boxes, and overdue ones"]] as [keyof NotificationSettings, string, string][]) : []),
    ['sowHarvest', 'Sowing and harvest', 'Sowings due for your orders, and batches ready to harvest'],
    ...(shopOn ? ([['stock', 'Stock to sell', 'Harvests to sell today or tomorrow']] as [keyof NotificationSettings, string, string][]) : []),
  ];

  return (
    <div className="farm-stack supply-form">
      <section className="farm-surface">
        <label className="setting-switch">
          <span>
            <b>Daily reminders</b>
            <small>A morning summary of the day, and an evening reminder of what's left.</small>
          </span>
          <input type="checkbox" role="switch" checked={settings.enabled} onChange={e => turnOn(e.target.checked)} />
        </label>
        {message && (
          <p role="alert" className="supply-error">
            {message}
          </p>
        )}
        <div className="supply-row">
          <label className="supply-field">
            <span>Morning</span>
            <input type="time" value={settings.morning} onChange={e => e.target.value && set({ morning: e.target.value })} disabled={!settings.enabled} />
          </label>
          <label className="supply-field">
            <span>Evening</span>
            <input
              type="time"
              value={settings.evening ?? ''}
              onChange={e => set({ evening: e.target.value || undefined })}
              disabled={!settings.enabled || !settings.evening}
            />
          </label>
        </div>
        <label className="setting-switch">
          <span>
            <b>Evening reminder</b>
            <small>Only when something is still to do.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={!!settings.evening}
            disabled={!settings.enabled}
            onChange={e => set({ evening: e.target.checked ? '18:00' : undefined })}
          />
        </label>
      </section>

      <section className="farm-surface">
        <h2>Include</h2>
        {kinds.map(([key, label, detail]) => (
          <label key={key} className="setting-switch">
            <span>
              <b>{label}</b>
              <small>{detail}</small>
            </span>
            <input type="checkbox" role="switch" checked={!!settings[key]} disabled={!settings.enabled} onChange={e => set({ [key]: e.target.checked })} />
          </label>
        ))}
      </section>

      <section className="farm-surface">
        <h2>Today's summary</h2>
        {today.length ? (
          <ul className="notify-preview">
            {today.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="farm-help">Nothing to do today.</p>
        )}
      </section>

      {settings.enabled && native && (
        <button
          className="farm-secondary"
          onClick={async () => {
            await onTest();
            setMessage('');
          }}
        >
          <BellRing size={16} /> Send a test notification
        </button>
      )}
      <p className="farm-help">
        Reminders are made on your phone from your own data; nothing is sent anywhere. They're set for the coming week each time
        you open the app, so open it now and then to keep them up to date.
      </p>
    </div>
  );
}
