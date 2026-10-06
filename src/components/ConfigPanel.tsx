import React, { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Plus, Pencil, Trash2, Check, X, Droplets, Sun, Timer, ChevronDown, ChevronUp, Hash, HardDrive, History, Database, Upload, FolderOpen, ListPlus, ShieldCheck, HelpCircle, Mail, ChevronRight, Info, Crown, UserRound, BadgeCheck, LogOut, UserX } from 'lucide-react';
import { format } from 'date-fns';
import type { SubscriptionState } from '../subscription/useSubscription';
import { restorePurchases } from '../subscription/purchases';
import type { AccountState } from '../account/useAccount';
import { AccountError, deleteAccount, signOut } from '../account/account';
import { openExternal } from '../utils/openExternal';
import { appInfo, isFilledIn } from '../data/appInfo';
import type { InfoPageKind } from './InfoPage';
import { CropType, AppConfig } from '../types';
import { batchCode, MAX_NUMBER, MAX_TRAY_POSITIONS, trayCode, wholeNumber } from '../utils/batches';
import { categoryIcon, categoryIconOptions } from '../data/categoryIcons';
import { defaultCategories, defaultCropTypes } from '../data/cropTypes';

interface ConfigPanelProps {
  cropTypes: CropType[];
  onUpdateCropTypes: (crops: CropType[]) => void;
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  onRenameCategory: (from: string, to: string) => void;
  onAddStandardCrops: () => void;
  onOpenInfo: (page: InfoPageKind) => void;
  subscription: SubscriptionState;
  onOpenPaywall: () => void;
  accountState: AccountState;
  onOpenAccount: () => void;
  onDeleteCategory: (name: string) => void;
  highestBatchNumber: number;
  highestTrayNumber: number;
  usedTrayCount: number;
  onBackupNow: () => void;
  onShowRestore: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onLoadTestData: () => void;
  hasBatches: boolean;
}

const defaultCrop: Omit<CropType, 'name' | 'category'> = {
  daysToGermination: 3,
  daysToHarvest: 10,
  wateringFrequency: 1,
  lightingHours: 12,
};

// An editable list of names (crop categories, loss reasons).
const NameListEditor: React.FC<{
  items: string[];
  placeholder: string;
  countFor?: (name: string) => number;
  onAdd: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (name: string) => void;
  iconFor?: (name: string) => string | undefined; // icon key, when the items have icons
  onPickIcon?: (name: string, iconKey: string) => void;
}> = ({ items, placeholder, countFor, onAdd, onRename, onDelete, iconFor, onPickIcon }) => {
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const exists = (name: string, except?: string) =>
    items.some(i => i !== except && i.toLowerCase() === name.trim().toLowerCase());

  const add = () => {
    const name = draft.trim();
    if (!name || exists(name)) return;
    onAdd(name);
    setDraft('');
  };
  const saveRename = () => {
    const name = editText.trim();
    if (editing && name && !exists(name, editing) && name !== editing) onRename(editing, name);
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-100">
        {items.map(item => (
          <div key={item}>
          <div className="flex items-center gap-2 px-3 py-2">
            {editing === item ? (
              <>
                <input
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveRename()}
                  className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  autoFocus
                />
                <button onClick={saveRename} aria-label="Save name" className="p-1.5 text-emerald-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditing(null)} aria-label="Cancel" className="p-1.5 text-gray-400"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                {iconFor && (() => {
                  const ItemIcon = categoryIcon(iconFor(item));
                  return (
                    <button
                      onClick={() => setPicking(picking === item ? null : item)}
                      aria-label={`Choose icon for ${item}`}
                      aria-expanded={picking === item}
                      className={`p-1.5 rounded-lg border ${picking === item ? 'border-emerald-400 bg-emerald-50' : 'border-transparent bg-emerald-50'} text-emerald-700`}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </button>
                  );
                })()}
                <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">{item}</span>
                {countFor && <span className="text-xs text-gray-400">{countFor(item)}</span>}
                <button onClick={() => { setEditing(item); setEditText(item); }} aria-label={`Rename ${item}`} className="p-1.5 text-gray-400 hover:text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  disabled={items.length <= 1}
                  aria-label={`Delete ${item}`}
                  className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          {picking === item && onPickIcon && (
            <div role="group" aria-label={`Icons for ${item}`} className="grid grid-cols-7 gap-1.5 px-3 pb-3">
              {categoryIconOptions.map(opt => {
                const OptIcon = opt.icon;
                const on = iconFor?.(item) === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => { onPickIcon(item, opt.key); setPicking(null); }}
                    aria-label={opt.label}
                    aria-pressed={on}
                    title={opt.label}
                    className={`aspect-square flex items-center justify-center rounded-lg border ${on ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    <OptIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <button
          onClick={add}
          disabled={!draft.trim() || exists(draft)}
          className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg disabled:opacity-40 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
};

// A whole number that is applied when the field loses focus, so typing isn't fought mid-way.
// A whole number from min to max. Only digits can be typed; anything out of range goes back to the saved value.
const NumberSetting: React.FC<{ value: number; min: number; max: number; onChange: (n: number) => void; label: string }> = ({ value, min, max, onChange, label }) => {
  const [text, setText] = useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = wholeNumber(text, max, -1);
    if (n >= min) onChange(n);
    else setText(String(value));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={String(max).length}
      aria-label={label}
      value={text}
      onChange={e => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
  );
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ cropTypes, onUpdateCropTypes, config, onUpdateConfig, onRenameCategory, onAddStandardCrops, onOpenInfo, subscription, onOpenPaywall, accountState, onOpenAccount, onDeleteCategory, highestBatchNumber, highestTrayNumber, usedTrayCount, onBackupNow, onShowRestore, onExportBackup, onImportBackup, onLoadTestData, hasBatches }) => {
  const [editingCrop, setEditingCrop] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // The installed app's version and build number (not available in a browser).
    CapacitorApp.getInfo().then(i => setVersion(`${i.version} (${i.build})`)).catch(() => setVersion(null));
  }, []);
  const [isAdding, setIsAdding] = useState(false);
  const fallbackCategory = config.categories.includes('Other') ? 'Other' : config.categories[0];
  const [newCrop, setNewCrop] = useState<CropType>({
    name: '',
    ...defaultCrop,
    category: fallbackCategory,
  });
  const [editForm, setEditForm] = useState<CropType | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const has = (list: string[], name: string) => list.some(n => n.toLowerCase() === name.toLowerCase());
  const missingCrops = defaultCropTypes.filter(c => !has(cropTypes.map(x => x.name), c.name)).length;
  const missingCategories = defaultCategories.filter(c => !has(config.categories, c)).length;

  const grouped = config.categories
    .map(category => [category, cropTypes.filter(c => c.category === category)] as const)
    .filter(([, crops]) => crops.length > 0);

  const handleAdd = () => {
    if (!newCrop.name.trim()) return;
    const exists = cropTypes.some(c => c.name.toLowerCase() === newCrop.name.trim().toLowerCase());
    if (exists) return;
    onUpdateCropTypes([...cropTypes, { ...newCrop, name: newCrop.name.trim() }]);
    setNewCrop({ name: '', ...defaultCrop, category: fallbackCategory });
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!editForm) return;
    onUpdateCropTypes(cropTypes.map(c => c.name === editingCrop ? editForm : c));
    setEditingCrop(null);
    setEditForm(null);
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Delete "${name}" crop configuration?`)) {
      onUpdateCropTypes(cropTypes.filter(c => c.name !== name));
    }
  };

  const startEdit = (crop: CropType) => {
    setEditingCrop(crop.name);
    setEditForm({ ...crop });
  };

  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const restore = async () => {
    setRestoreMessage('Checking…');
    try {
      const status = await restorePurchases();
      setRestoreMessage(status.active ? 'Pro restored.' : 'No earlier purchase was found for this store account.');
    } catch {
      setRestoreMessage('Couldn\'t check right now. Please check your internet connection.');
    }
  };

  const [accountMessage, setAccountMessage] = useState('');
  const { account } = accountState;

  const removeAccount = async () => {
    if (!window.confirm('Delete your account? Your name and email are removed from our sign-in service. Your batches and photos on this phone are kept, and a Pro purchase stays with your store account (use Restore purchases).')) return;
    setAccountMessage('Deleting…');
    try {
      await deleteAccount();
      setAccountMessage('Your account has been deleted.');
    } catch (e) {
      setAccountMessage(e instanceof AccountError ? e.message : 'Couldn\'t delete the account right now. Please try again.');
    }
  };

  const { pro } = subscription;
  const planName = pro.plan === 'yearly' ? 'Yearly' : pro.plan === 'monthly' ? 'Monthly' : pro.plan === 'lifetime' ? 'Lifetime' : '';
  const subscriptionLine = pro.active
    ? pro.plan === 'lifetime' || !pro.expiresAt
      ? `Pro${planName ? ` · ${planName}` : ''}. Thank you!`
      : `Pro · ${planName} · ${pro.willRenew ? 'renews' : 'ends'} ${format(new Date(pro.expiresAt), 'MMM d, yyyy')}`
    : subscription.trialEnded
      ? 'Free trial ended. Subscribe to start new batches; everything else keeps working.'
      : `Free trial · ${subscription.trialDaysLeft} day${subscription.trialDaysLeft === 1 ? '' : 's'} left${
          subscription.trialEndsAt ? ` (until ${format(subscription.trialEndsAt, 'MMM d, yyyy')})` : ''
        }`;

  return (
    <div className="space-y-6">
      {/* Account (optional sign-in; hidden when accounts are off, e.g. builds without Firebase settings) */}
      {accountState.mode !== 'off' && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <UserRound className="w-4 h-4" />
            Account
          </h3>
          {!accountState.loaded ? (
            <p className="text-sm text-gray-700">Checking…</p>
          ) : !account ? (
            <>
              <p className="text-sm text-gray-700 mb-3">Optional. Sign in so your Pro plan works on all your devices.</p>
              <button onClick={onOpenAccount} className="w-full py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                Sign in or create account
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 min-w-0">
                {account.name && <p className="text-sm font-semibold text-gray-900 truncate">{account.name}</p>}
                <p className="text-sm text-gray-700 truncate">{account.email}</p>
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${account.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {account.verified
                    ? `Verified${account.provider === 'google' ? ' · Google' : ''}`
                    : 'Email not confirmed yet'}
                </p>
              </div>
              <div className="flex gap-2">
                {!account.verified && (
                  <button onClick={onOpenAccount} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                    Confirm email
                  </button>
                )}
                <button
                  onClick={() => { setAccountMessage(''); signOut().catch(() => setAccountMessage('Couldn\'t sign out. Please try again.')); }}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
              <button onClick={removeAccount} className="mt-3 text-xs text-red-600 flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" />
                Delete account
              </button>
            </>
          )}
          {accountMessage && <p className="text-xs text-gray-500 mt-2">{accountMessage}</p>}
          {accountState.mode === 'test' && (
            <p className="text-[11px] text-amber-700 mt-2">Test mode: sign-in is simulated on this phone and no email is sent.</p>
          )}
        </div>
      )}

      {/* Subscription (hidden when subscriptions are off, e.g. development builds without RevenueCat keys) */}
      {subscription.mode !== 'off' && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <Crown className="w-4 h-4" />
            Subscription
          </h3>
          <p className="text-sm text-gray-700 mb-3">{subscription.loaded ? subscriptionLine : 'Checking your subscription…'}</p>
          <div className="flex gap-2">
            {!pro.active && (
              <button onClick={onOpenPaywall} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                See plans
              </button>
            )}
            {pro.active && pro.managementURL && pro.plan !== 'lifetime' && (
              <button onClick={() => openExternal(pro.managementURL!)} className="flex-1 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                Manage subscription
              </button>
            )}
            {!pro.active && (
              <button onClick={restore} className="flex-1 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
                Restore purchases
              </button>
            )}
          </div>
          {restoreMessage && <p className="text-xs text-gray-500 mt-2">{restoreMessage}</p>}
          {subscription.mode === 'test' && (
            <p className="text-[11px] text-amber-700 mt-2">Test mode: plans are made up and nothing is charged.</p>
          )}
        </div>
      )}

      {/* Backup & Restore */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-1.5">
          <HardDrive className="w-4 h-4" />
          Backup & Restore
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          A copy of your data is saved on this phone automatically every day. You can also save one now or go back to an earlier copy.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onBackupNow}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <HardDrive className="w-4 h-4" />
            Backup Now
          </button>
          <button
            onClick={onShowRestore}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <History className="w-4 h-4" />
            Restore
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-1">Backup file</h4>
          <p className="text-xs text-gray-500 mb-3">
            Save everything, including photos, as one file to Google Drive, Files or email. Open it on a new phone to restore.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onExportBackup}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Save File
            </button>
            <button
              onClick={onImportBackup}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Restore File
            </button>
          </div>
        </div>
      </div>

      {/* Test Data: development builds only, so a store build can't replace a grower's data by accident. */}
      {import.meta.env.DEV && (
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-1.5">
          <Database className="w-4 h-4" />
          Test Data
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Populate the app with a full month of sample batches across all growth stages, complete with watering records and notes.
        </p>
        <button
          onClick={onLoadTestData}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <Database className="w-4 h-4" />
          {hasBatches ? 'Replace Data with Test Batches' : 'Load Test Data (1 Month)'}
        </button>
      </div>
      )}

      {/* Tray Settings */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Tray Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              <Hash className="w-3 h-3 inline mr-1" />
              Tray Positions (racks / shelf spots)
            </label>
            <NumberSetting
              label="Tray positions"
              value={config.totalTrays}
              min={1}
              max={MAX_TRAY_POSITIONS}
              onChange={n => onUpdateConfig({ ...config, totalTrays: n })}
            />
            <p className="text-xs text-gray-500 mt-1">
              {usedTrayCount} in use, {config.totalTrays - usedTrayCount} available
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tray Label Prefix</label>
            <input
              type="text"
              value={config.trayNumberPrefix}
              onChange={e => onUpdateConfig({ ...config, trayNumberPrefix: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g., Tray, Rack, Shelf"
            />
            <p className="text-xs text-gray-500 mt-1">
              Shown as "{config.trayNumberPrefix || 'Tray'} #1", "{config.trayNumberPrefix || 'Tray'} #2", etc.
            </p>
          </div>
        </div>
      </div>

      {/* Numbering */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wide">Numbering</h3>
        <p className="text-xs text-gray-500 mb-3">
          New batches and trays are numbered automatically, carrying on from the last number used, also after restoring a backup.
          Change the next number if you already label trays on paper.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Next batch: {batchCode(config.lastBatchNumber + 1)}</label>
            <NumberSetting
              label="Next batch number"
              value={config.lastBatchNumber + 1}
              min={highestBatchNumber + 1}
              max={MAX_NUMBER}
              onChange={n => onUpdateConfig({ ...config, lastBatchNumber: n - 1 })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Next tray: {trayCode(config.lastTrayNumber + 1)}</label>
            <NumberSetting
              label="Next tray number"
              value={config.lastTrayNumber + 1}
              min={highestTrayNumber + 1}
              max={MAX_NUMBER}
              onChange={n => onUpdateConfig({ ...config, lastTrayNumber: n - 1 })}
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Can't go below {batchCode(highestBatchNumber + 1)} / {trayCode(highestTrayNumber + 1)}, so numbers are never reused,
          or above {batchCode(MAX_NUMBER)} / {trayCode(MAX_NUMBER)}.
        </p>
      </div>

      {/* Crop categories */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wide">Crop Categories</h3>
        <p className="text-xs text-gray-500 mb-3">Group your crops. Tap an icon to change it; the number shows how many crops are in each.</p>
        <NameListEditor
          items={config.categories}
          placeholder="New category, e.g. Flowers"
          countFor={name => cropTypes.filter(c => c.category === name).length}
          onAdd={name => onUpdateConfig({ ...config, categories: [...config.categories, name], categoryIcons: { ...config.categoryIcons, [name]: 'tag' } })}
          onRename={onRenameCategory}
          onDelete={onDeleteCategory}
          iconFor={name => config.categoryIcons[name]}
          onPickIcon={(name, key) => onUpdateConfig({ ...config, categoryIcons: { ...config.categoryIcons, [name]: key } })}
        />
        {(missingCrops > 0 || missingCategories > 0) && (
          <button
            onClick={onAddStandardCrops}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
          >
            <ListPlus className="w-4 h-4" />
            Add standard microgreens ({missingCrops} crop{missingCrops === 1 ? '' : 's'}{missingCategories > 0 ? `, ${missingCategories} categor${missingCategories === 1 ? 'y' : 'ies'}` : ''})
          </button>
        )}
      </div>

      {/* Loss reasons */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wide">Loss Reasons</h3>
        <p className="text-xs text-gray-500 mb-3">Offered when you report a lost tray. Trays already marked keep their reason.</p>
        <NameListEditor
          items={config.lossReasons}
          placeholder="New reason, e.g. Seed quality"
          onAdd={name => onUpdateConfig({ ...config, lossReasons: [...config.lossReasons, name] })}
          onRename={(from, to) => onUpdateConfig({ ...config, lossReasons: config.lossReasons.map(r => (r === from ? to : r)) })}
          onDelete={name => onUpdateConfig({ ...config, lossReasons: config.lossReasons.filter(r => r !== name) })}
        />
      </div>

      {/* General settings section */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">General Settings</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between py-2">
            <span>Date Format</span>
            <span className="font-medium text-gray-900">MMM dd, yyyy</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>Default Yield Unit</span>
            <span className="font-medium text-gray-900">Grams</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>Total Crop Types</span>
            <span className="font-medium text-gray-900">{cropTypes.length}</span>
          </div>
        </div>
      </div>

      {/* Add crop button */}
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-colors font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Crop Type
      </button>

      {/* Add crop form */}
      {isAdding && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-emerald-900">New Crop Type</h4>
            <button onClick={() => setIsAdding(false)} className="p-1 text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={newCrop.name}
            onChange={e => setNewCrop({ ...newCrop, name: e.target.value })}
            placeholder="Crop name"
            className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Timer className="w-3 h-3 inline mr-1" />Germination (days)
              </label>
              <input
                type="number"
                value={newCrop.daysToGermination}
                onChange={e => setNewCrop({ ...newCrop, daysToGermination: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Timer className="w-3 h-3 inline mr-1" />Harvest (days)
              </label>
              <input
                type="number"
                value={newCrop.daysToHarvest}
                onChange={e => setNewCrop({ ...newCrop, daysToHarvest: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Droplets className="w-3 h-3 inline mr-1" />Watering (days)
              </label>
              <input
                type="number"
                value={newCrop.wateringFrequency}
                onChange={e => setNewCrop({ ...newCrop, wateringFrequency: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-800 mb-1">
                <Sun className="w-3 h-3 inline mr-1" />Light (h/day)
              </label>
              <input
                type="number"
                value={newCrop.lightingHours}
                onChange={e => setNewCrop({ ...newCrop, lightingHours: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                min={1}
                max={24}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-emerald-800 mb-1">Category</label>
            <select
              value={newCrop.category}
              onChange={e => setNewCrop({ ...newCrop, category: e.target.value })}
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {config.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newCrop.name.trim()}
              className="flex-1 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Crop types list by category */}
      {grouped.map(([category, crops]) => {
        const Icon = categoryIcon(config.categoryIcons[category]);
        const colorClass = 'text-emerald-700 bg-emerald-50';
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{category}</span>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">{crops.length}</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div className="divide-y divide-gray-50">
                {crops.map(crop => {
                  const isEditing = editingCrop === crop.name;

                  if (isEditing && editForm) {
                    return (
                      <div key={crop.name} className="p-4 bg-amber-50 space-y-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Germination (days)</label>
                            <input
                              type="number"
                              value={editForm.daysToGermination}
                              onChange={e => setEditForm({ ...editForm, daysToGermination: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Harvest (days)</label>
                            <input
                              type="number"
                              value={editForm.daysToHarvest}
                              onChange={e => setEditForm({ ...editForm, daysToHarvest: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Watering (days)</label>
                            <input
                              type="number"
                              value={editForm.wateringFrequency}
                              onChange={e => setEditForm({ ...editForm, wateringFrequency: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-amber-800 mb-1">Light (h/day)</label>
                            <input
                              type="number"
                              value={editForm.lightingHours}
                              onChange={e => setEditForm({ ...editForm, lightingHours: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              min={1}
                              max={24}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-amber-800 mb-1">Category</label>
                          <select
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                          >
                            {config.categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingCrop(null); setEditForm(null); }}
                            className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdate}
                            className="flex-1 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={crop.name} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{crop.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(crop)}
                            aria-label={`Edit ${crop.name}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(crop.name)}
                            aria-label={`Delete ${crop.name}`}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          <span>{crop.daysToGermination}d germ</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          <span>{crop.daysToHarvest}d harvest</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          <span>Every {crop.wateringFrequency}d</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sun className="w-3 h-3" />
                          <span>{crop.lightingHours}h/day</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* About */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          About
        </h3>
        <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-100">
          {([
            ['privacy', 'Privacy policy', ShieldCheck],
            ['faq', 'Help & FAQ', HelpCircle],
          ] as const).map(([kind, label, Icon]) => (
            <button key={kind} onClick={() => onOpenInfo(kind)} className="w-full flex items-center gap-3 px-3 py-3 text-left">
              <Icon className="w-4 h-4 text-emerald-600" />
              <span className="flex-1 text-sm text-gray-900">{label}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
          {isFilledIn(appInfo.supportEmail) && (
            <a href={`mailto:${appInfo.supportEmail}`} className="w-full flex items-center gap-3 px-3 py-3">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span className="flex-1 text-sm text-gray-900">Contact support</span>
              <span className="text-xs text-gray-400 truncate max-w-[50%]">{appInfo.supportEmail}</span>
            </a>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          {appInfo.appName}{version ? ` · version ${version}` : ''}
          {isFilledIn(appInfo.developerName) && <><br />© {new Date().getFullYear()} {appInfo.developerName}</>}
        </p>
      </div>
    </div>
  );
};

export default ConfigPanel;
