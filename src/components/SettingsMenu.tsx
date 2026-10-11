import React, { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AlertTriangle, BarChart3, ChevronRight, Database, HardDrive, Hash, HelpCircle, LayoutGrid, Mail, ShieldCheck, ShoppingBag, Sprout, Tag } from 'lucide-react';
import { AppConfig, CropType } from '../types';
import { appInfo, isFilledIn } from '../data/appInfo';
import { batchCode, trayCode } from '../utils/batches';
import { getLayout } from '../utils/farmLayout';
import type { ConfigSection } from './ConfigPanel';
import type { InfoPageKind } from './InfoPage';
import type { AppMode } from './ModeSwitch';
import { shopAccents } from '../data/shop';

export type SettingsPage = 'insights' | 'layout' | 'shop' | 'prices' | ConfigSection;

export const settingsTitles: Record<SettingsPage, string> = {
  insights: 'Insights & reports',
  layout: 'Racks & shelves',
  shop: 'Shop',
  prices: 'Price list',
  crops: 'Crops & categories',
  lossReasons: 'Loss reasons',
  numbering: 'Numbering',
  backup: 'Backup & restore',
  testData: 'Test data',
};

interface SettingsMenuProps {
  config: AppConfig;
  cropTypes: CropType[];
  lastBackup: string | null;
  mode: AppMode;
  pricedCrops: number;
  onOpen: (page: SettingsPage) => void;
  onOpenInfo: (page: InfoPageKind) => void;
}

// The Settings tab: one row per settings page, each opening on its own screen.
export default function SettingsMenu({ config, cropTypes, lastBackup, mode, pricedCrops, onOpen, onOpenInfo }: SettingsMenuProps) {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    // The installed app's version and build number (not available in a browser).
    CapacitorApp.getInfo().then(i => setVersion(`${i.version} (${i.build})`)).catch(() => setVersion(null));
  }, []);

  const layout = getLayout(config);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  type Row = [SettingsPage, React.FC<{ className?: string }>, string];
  const farm: Row[] = [
    ['insights', BarChart3, 'Yields, losses and PDF / CSV reports'],
    ['layout', LayoutGrid, `${plural(layout.rackCount, 'rack')} · ${plural(config.totalTrays, 'tray position')}`],
    ['crops', Sprout, `${plural(cropTypes.length, 'crop')} in ${config.categories.length} categor${config.categories.length === 1 ? 'y' : 'ies'}`],
    ['lossReasons', AlertTriangle, plural(config.lossReasons.length, 'reason')],
    ['numbering', Hash, `Next batch ${batchCode(config.lastBatchNumber + 1)} · next tray ${trayCode(config.lastTrayNumber + 1)}`],
  ];
  const { shop } = config;
  const shopRows: Row[] = [
    ['shop', ShoppingBag, shop.enabled ? `${shopAccents.find(a => a.key === shop.accent)?.label} · ${shop.currency}` : 'Off'],
    ...(shop.enabled ? [['prices', Tag, pricedCrops ? plural(pricedCrops, 'crop') + ' priced' : 'Set a price per 100 g'] as Row] : []),
  ];
  const data: Row[] = [
    ['backup', HardDrive, lastBackup ? `Last copy ${new Date(lastBackup).toLocaleDateString()}` : 'A copy is saved on this phone every day'],
    // Development builds only, so a store build can't replace a grower's data by accident.
    ...(import.meta.env.DEV ? [['testData', Database, 'Load a month of sample batches'] as Row] : []),
  ];
  const row = ([page, Icon, detail]: Row) => (
    <button key={page} onClick={() => onOpen(page)}>
      <span className="menu-icon"><Icon /></span>
      <span className="menu-text">
        <b>{settingsTitles[page]}</b>
        <small>{detail}</small>
      </span>
      <ChevronRight />
    </button>
  );

  const shopGroup = (
    <>
      <p className="settings-group-label">YOUR SHOP</p>
      <div className="settings-menu" role="group" aria-label="Shop settings">{shopRows.map(row)}</div>
    </>
  );

  return (
    <>
      {/* The side you're on comes first. */}
      {mode === 'shop' && shopGroup}
      <p className="settings-group-label">YOUR FARM</p>
      <div className="settings-menu" role="group" aria-label="Farm settings">{farm.map(row)}</div>
      {mode === 'farm' && shopGroup}
      <p className="settings-group-label">DATA</p>
      <div className="settings-menu" role="group" aria-label="Data settings">{data.map(row)}</div>
      <p className="settings-group-label">ABOUT</p>
      <div className="settings-menu" role="group" aria-label="About">
        <button onClick={() => onOpenInfo('faq')}>
          <span className="menu-icon"><HelpCircle /></span>
          <span className="menu-text"><b>Help & FAQ</b></span>
          <ChevronRight />
        </button>
        <button onClick={() => onOpenInfo('privacy')}>
          <span className="menu-icon"><ShieldCheck /></span>
          <span className="menu-text"><b>Privacy policy</b></span>
          <ChevronRight />
        </button>
        {isFilledIn(appInfo.supportEmail) && (
          <a href={`mailto:${appInfo.supportEmail}`}>
            <span className="menu-icon"><Mail /></span>
            <span className="menu-text">
              <b>Contact support</b>
              <small>{appInfo.supportEmail}</small>
            </span>
            <ChevronRight />
          </a>
        )}
      </div>
      <p className="settings-version">
        {appInfo.appName}{version ? ` · version ${version}` : ''}
        {isFilledIn(appInfo.developerName) && <><br />© {new Date().getFullYear()} {appInfo.developerName}</>}
      </p>
    </>
  );
}
