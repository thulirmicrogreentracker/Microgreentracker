import React, { useState, useMemo, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Plus, Sprout, Settings, Home, Bell, X, Download, FolderOpen, AlertTriangle, ChevronsUpDown, LayoutGrid, Layers, Search, Package, CalendarDays, ClipboardList, Boxes, Users } from 'lucide-react';
import { AppData, Batch, BatchStats, CropType, AppConfig, Reminder, WateringRecord, BatchNote, BatchPhoto, SupplyItem, SupplyKind, Customer, PaymentMethod, Sale, Order, OrderItem, Subscription } from './types';
import { useAppData, UpdateAppData } from './hooks/useAppData';
import { useReminders } from './hooks/useReminders';
import { useDailySnapshot } from './hooks/useBackup';
import { createSnapshot, deleteSnapshot, listSnapshots, readSnapshot, SnapshotInfo } from './storage/snapshots';
import { exportBackupFile, parseBackupFile, writeBackupPhotos } from './storage/backupFile';
import BatchCard from './components/BatchCard';
import AddBatchModal from './components/AddBatchModal';
import FarmHome, { AllTasks, StageFilter } from './components/farm/FarmHome';
import ShelvesPanel from './components/farm/ShelvesPanel';
import TrayDetail from './components/farm/TrayDetail';
import LayoutSettings from './components/farm/LayoutSettings';
import ReportExport from './components/farm/ReportExport';
import './components/farm/farm.css';
import NotificationPanel from './components/NotificationPanel';
import QuickActionModal from './components/QuickActionModal';
import ConfigPanel from './components/ConfigPanel';
import SettingsMenu, { SettingsPage, settingsTitles } from './components/SettingsMenu';
import SwipePage, { attachSwipeBack } from './components/SwipePage';
import ReportsPanel from './components/ReportsPanel';
import BatchGallery from './components/photos/BatchGallery';
import PhotoViewer from './components/photos/PhotoViewer';
import PhotoCompare from './components/photos/PhotoCompare';
import CropPhotos from './components/photos/CropPhotos';
import LostTraySheet, { TrayLoss } from './components/LostTraySheet';
import HarvestSheet from './components/HarvestSheet';
import AppLogo from './components/AppLogo';
import InfoPage, { InfoPageKind } from './components/InfoPage';
import ModeSwitch, { AppMode } from './components/ModeSwitch';
import ShopSettingsPanel from './components/shop/ShopSettingsPanel';
import { accentColor } from './data/shop';
import SuppliesPanel from './components/supplies/SuppliesPanel';
import SupplyDetail from './components/supplies/SupplyDetail';
import { LotForm, SupplyForm } from './components/supplies/SupplyForms';
import { suppliesForBatch, supplyAlerts } from './utils/supplies';
import { addHarvestToStock, moveStock, sellFromStock, stockAlerts } from './utils/stock';
import StockPanel from './components/shop/StockPanel';
import StockCrop, { AddStock } from './components/shop/StockCrop';
import ShopToday from './components/shop/ShopToday';
import { CustomerForm, CustomerPage, CustomersPanel, paymentFor } from './components/shop/Customers';
import { PriceList, SaleForm, SalePage } from './components/shop/Sales';
import { CustomerOrders, OrderForm, OrderPage, OrdersPanel, SubscriptionForm, SubscriptionPage } from './components/shop/Orders';
import { Delivery, deliveriesBetween, deliveryListText, orderCode } from './utils/orders';
import { sowPlans, SowPlan } from './utils/plan';
import { SowForOrders, SowForOrdersPage } from './components/farm/SowForOrders';
import ProfitReportPanel from './components/shop/ProfitReport';
import { customerDue, recordPayment, returnSaleStock, saleCode } from './utils/sales';
import { formatDate, getDaysSince, todayLocal } from './utils/dateUtils';
import { activeTrays, batchYieldGrams, freeSlots, highestBatchNumber, highestTrayNumber, isBatchGrowing, isBatchLost, lostTrays, newId, syncCounters, trayCode } from './utils/batches';
import { stageConfig } from './data/stages';
import { defaultCategories, defaultCategoryIcons, defaultCropTypes } from './data/cropTypes';
import { generateTestBatches } from './utils/generateTestData';
import { appInfo } from './data/appInfo';

type FarmTab = 'home' | 'shelves' | 'batches' | 'supplies';
type ShopTab = 'today' | 'orders' | 'stock' | 'customers';
type Tab = FarmTab | ShopTab | 'config';

// The first tab of each mode, where Back and a swipe from the left edge lead.
const startTab = (mode: AppMode): Tab => (mode === 'farm' ? 'home' : 'today');
const SHOP_TABS: Tab[] = ['today', 'orders', 'stock', 'customers'];

// The last mode used, remembered on this phone only.
const MODE_KEY = 'thulir-mode';
const savedMode = (): AppMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'shop' ? 'shop' : 'farm';
  } catch {
    return 'farm';
  }
};

interface TrackerAppProps {
  data: AppData;
  update: UpdateAppData;
  saveError: string | null;
  onRetrySave: () => void;
}

function TrackerApp({ data, update, saveError, onRetrySave }: TrackerAppProps) {
  const { batches, cropTypes, config, reminders, supplies, stock, customers, prices, sales, orders, subscriptions } = data;
  const currency = config.shop.currency;
  const setSupplies = (fn: (prev: SupplyItem[]) => SupplyItem[]) => update(d => ({ ...d, supplies: fn(d.supplies) }));
  const saveSupply = (item: SupplyItem) =>
    setSupplies(prev => (prev.some(i => i.id === item.id) ? prev.map(i => (i.id === item.id ? item : i)) : [...prev, item]));
  const setBatches = (fn: (prev: Batch[]) => Batch[]) => update(d => ({ ...d, batches: fn(d.batches) }));
  const setCropTypes = (next: CropType[]) => update(d => ({ ...d, cropTypes: next }));
  const setConfig = (next: AppConfig) => {
    // The number of positions can't drop below a position that a growing tray is in.
    const highestSlot = Math.max(0, ...batches.filter(isBatchGrowing).flatMap(b => activeTrays(b).map(t => t.slot ?? 0)));
    if (next.totalTrays < highestSlot) {
      window.alert(`Position ${highestSlot} is in use. Move its tray before reducing the number of positions.`);
      return;
    }
    // A rack layout is kept only while it covers exactly the tray positions.
    const layout = next.farmLayout;
    const fits = layout && layout.rackCount * layout.shelvesPerRack * layout.traysPerShelf === next.totalTrays;
    update(d => ({ ...d, config: { ...next, farmLayout: fits ? layout : undefined } }));
  };
  const setReminders = (fn: (prev: Reminder[]) => Reminder[]) => update(d => ({ ...d, reminders: fn(d.reminders) }));
  const shopOn = config.shop.enabled;
  const [chosenMode, setChosenMode] = useState<AppMode>(savedMode);
  const mode: AppMode = shopOn ? chosenMode : 'farm';
  const [activeTab, setActiveTab] = useState<Tab>(() => startTab(mode));
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedTray, setSelectedTray] = useState<{ batchId: string; trayId: string } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // A new batch started from "Sow for orders": its crop and number of trays.
  const [batchPreset, setBatchPreset] = useState<{ crop: string; trays: number } | null>(null);
  const [showSowPlan, setShowSowPlan] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lossSheet, setLossSheet] = useState<{ batchId: string; trayIds: string[] } | null>(null);
  const [harvestBatchId, setHarvestBatchId] = useState<string | null>(null);
  const [infoPage, setInfoPage] = useState<InfoPageKind | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRestoreSheet, setShowRestoreSheet] = useState(false);
  const [galleryBatchId, setGalleryBatchId] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<{ batchId: string; photoId: string } | null>(null);
  const [compareBatchId, setCompareBatchId] = useState<string | null>(null);
  const [cropPhotos, setCropPhotos] = useState<string | null>(null);
  const [settingsPage, setSettingsPage] = useState<SettingsPage | null>(null);
  const [showTasks, setShowTasks] = useState(false);
  // Supplies: the item page that's open, and a form on top of it.
  const [supplyId, setSupplyId] = useState<string | null>(null);
  // Stock: one crop's page, and the add-stock form.
  const [stockCrop, setStockCrop] = useState<string | null>(null);
  const [addingStock, setAddingStock] = useState(false);
  // Customers and sales: a customer's or sale's page, and a form on top.
  const [customerPage, setCustomerPage] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<{ id?: string } | null>(null);
  const [salePage, setSalePage] = useState<string | null>(null);
  // A new sale, or the delivery of an order or of one date of a subscription.
  const [saleForm, setSaleForm] = useState<{ customerId?: string; items?: OrderItem[]; orderId?: string; subscriptionId?: string; date?: string } | null>(null);
  // Orders and subscriptions: a page, and a form on top.
  const [orderPage, setOrderPage] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<{ id?: string; customerId?: string } | null>(null);
  const [subPage, setSubPage] = useState<string | null>(null);
  const [subForm, setSubForm] = useState<{ id?: string; customerId?: string } | null>(null);
  const [supplyForm, setSupplyForm] = useState<
    { mode: 'new'; kind?: SupplyKind } | { mode: 'edit'; id: string } | { mode: 'lot'; itemId: string; lotId?: string } | null
  >(null);

  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    batch: Batch | null;
    actionType: 'watering' | 'photo' | 'note' | null;
    trayId?: string;
  }>({
    isOpen: false,
    batch: null,
    actionType: null
  });

  const { notifications, completeReminder, deleteReminder } = useReminders(batches, reminders, setReminders);
  const { lastBackup, snapshotNow } = useDailySnapshot(data);
  const [backups, setBackups] = useState<SnapshotInfo[]>([]);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showRestoreSheet) {
      listSnapshots().then(setBackups).catch(() => setBackups([]));
    }
  }, [showRestoreSheet]);

  // Back (Android back button or gesture, or a swipe from the left edge): close the top-most screen; on a tab other
  // than Home go to Home; on Home leave the app.
  const goBack = () => {
    if (infoPage) setInfoPage(null);
    else if (harvestBatchId) setHarvestBatchId(null);
    else if (lossSheet) setLossSheet(null);
    else if (quickActionModal.isOpen) setQuickActionModal({ isOpen: false, batch: null, actionType: null });
    else if (isModalOpen) handleCloseModal();
    else if (viewerPhoto) setViewerPhoto(null);
    else if (compareBatchId) setCompareBatchId(null);
    else if (galleryBatchId) setGalleryBatchId(null);
    else if (cropPhotos) setCropPhotos(null);
    else if (showRestoreSheet) setShowRestoreSheet(false);
    else if (showNotifications) setShowNotifications(false);
    else if (selectedTray) setSelectedTray(null);
    else if (showTasks) setShowTasks(false);
    else if (showSowPlan) setShowSowPlan(false);
    else if (saleForm) setSaleForm(null);
    else if (customerForm) setCustomerForm(null);
    else if (subForm) setSubForm(null);
    else if (orderForm) setOrderForm(null);
    else if (salePage) setSalePage(null);
    else if (subPage) setSubPage(null);
    else if (orderPage) setOrderPage(null);
    else if (customerPage) setCustomerPage(null);
    else if (addingStock) setAddingStock(false);
    else if (stockCrop) setStockCrop(null);
    else if (supplyForm) setSupplyForm(null);
    else if (supplyId) setSupplyId(null);
    else if (settingsPage) setSettingsPage(null);
    else if (activeTab !== startTab(mode)) setActiveTab(startTab(mode));
    else CapacitorApp.exitApp();
  };
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  useEffect(() => {
    const handle = CapacitorApp.addListener('backButton', () => goBackRef.current());
    return () => { handle.then(h => h.remove()); };
  }, []);

  // A swipe from the left edge on a tab other than the mode's first one goes back to it (pushed screens handle their
  // own swipe).
  const atStartRef = useRef(true);
  atStartRef.current = activeTab === startTab(mode);
  useEffect(() => attachSwipeBack(mainRef.current!, () => goBackRef.current(), {
    slideOut: false,
    enabled: () => !atStartRef.current,
  }), []);

  const switchMode = (next: AppMode) => {
    setChosenMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // not remembered; nothing else depends on it
    }
    setActiveTab(startTab(next));
    setSettingsPage(null);
    mainRef.current?.scrollTo(0, 0);
  };

  // Turning Shop off while on a Shop tab goes back to the farm.
  useEffect(() => {
    if (!shopOn && SHOP_TABS.includes(activeTab)) setActiveTab('home');
  }, [shopOn, activeTab]);

  const availableSlots = useMemo(() => freeSlots(batches, config.totalTrays), [batches, config.totalTrays]);


  const stats: BatchStats = useMemo(() => {
    const s = {
      total: batches.length,
      sowing: 0,
      germination: 0,
      growth: 0,
      harvest: 0,
      completed: 0,
      avgDaysToHarvest: 0,
      totalYield: 0,
      lost: 0,
      traysGrowing: 0,
      traysLost: 0,
    };

    let totalDays = 0;
    let harvestedCount = 0;
    let totalYield = 0;

    batches.forEach(batch => {
      s.traysLost += lostTrays(batch).length;
      if (isBatchLost(batch)) {
        s.lost++;
        return;
      }
      s[batch.stage]++;
      if (batch.stage !== 'completed') s.traysGrowing += activeTrays(batch).length;

      if (batch.stage === 'completed' && batch.actualHarvestDate) {
        const days = getDaysSince(batch.sowingDate) - getDaysSince(batch.actualHarvestDate);
        totalDays += Math.abs(days);
        harvestedCount++;
      }

      totalYield += batchYieldGrams(batch);
    });

    s.avgDaysToHarvest = harvestedCount > 0 ? totalDays / harvestedCount : 0;
    s.totalYield = totalYield;

    return s;
  }, [batches]);

  // Adds or updates a batch. A new batch gets the next batch number and new trays (empty code) the next
  // tray numbers, in the same update as the counters so two quick saves can't get the same number.
  const saveBatch = (batch: Batch) => {
    update(d => {
      let lastBatch = d.config.lastBatchNumber;
      let lastTray = d.config.lastTrayNumber;
      const saved: Batch = {
        ...batch,
        batchNumber: batch.batchNumber || ++lastBatch,
        trays: batch.trays.map(t => (t.code ? t : { ...t, code: trayCode(++lastTray) })),
        updatedAt: new Date().toISOString(),
      };
      const exists = d.batches.some(b => b.id === saved.id);
      // A new batch takes its seed and growing media off the stock in Supplies.
      const taken = exists ? null : suppliesForBatch(d.supplies, saved);
      if (taken && taken.use.length > 0) saved.supplyUse = taken.use;
      return {
        ...d,
        batches: exists ? d.batches.map(b => (b.id === saved.id ? saved : b)) : [...d.batches, saved],
        config: { ...d.config, lastBatchNumber: lastBatch, lastTrayNumber: lastTray },
        supplies: taken ? taken.supplies : d.supplies,
      };
    });
    if (!batches.some(b => b.id === batch.id)) setExpandedIds(prev => new Set(prev).add(batch.id));
    setEditBatch(null);
  };

  const deleteBatch = (id: string) => {
    if (window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      setBatches(prev => prev.filter(batch => batch.id !== id));
    }
  };

  const updateBatchStage = (id: string, stage: Batch['stage']) => {
    setBatches(prev => prev.map(batch =>
      batch.id === id
        ? {
            ...batch,
            stage,
            actualHarvestDate: stage === 'completed' ? todayLocal() : batch.actualHarvestDate,
            updatedAt: new Date().toISOString()
          }
        : batch
    ));
  };

  const updateTrays = (batchId: string, fn: (trays: Batch['trays']) => Batch['trays']) =>
    setBatches(prev => prev.map(b => (b.id === batchId ? { ...b, trays: fn(b.trays), updatedAt: new Date().toISOString() } : b)));

  const markTraysLost = (batchId: string, trayIds: string[], loss: TrayLoss) => {
    updateTrays(batchId, trays => trays.map(t => (trayIds.includes(t.id)
      ? { ...t, status: 'lost', lostReason: loss.reason, lostDate: loss.date, lostNote: loss.note }
      : t)));
    setLossSheet(null);
  };

  // Records the harvest: per-tray weights in grams, the date, and the batch total. Also used to correct weights later.
  // Also adds the weighed harvest to Shop's stock (or updates it when weighed again).
  const harvestBatch = (batchId: string, weights: Record<string, number | undefined>, date: string) => {
    update(d => {
      let stock = d.stock;
      const nextBatches = d.batches.map(b => {
        if (b.id !== batchId) return b;
        const trays = b.trays.map(t => (t.id in weights ? { ...t, harvestWeight: weights[t.id] } : t));
        const total = trays.reduce((sum, t) => sum + (t.status === 'active' ? t.harvestWeight ?? 0 : 0), 0);
        const weighed = trays.some(t => t.status === 'active' && t.harvestWeight != null);
        if (weighed) stock = addHarvestToStock(stock, b, total, date, d.cropTypes);
        return {
          ...b,
          trays,
          stage: 'completed' as const,
          actualHarvestDate: date,
          // Without any tray weights, keep an older total (e.g. from before trays were weighed).
          ...(weighed ? { yieldAmount: Math.round(total * 10) / 10, yieldUnit: 'grams' as const } : {}),
          updatedAt: new Date().toISOString(),
        };
      });
      return { ...d, batches: nextBatches, stock };
    });
    setHarvestBatchId(null);
  };

  const deleteNote = (batchId: string, noteId: string) =>
    setBatches(prev => prev.map(b => (b.id === batchId ? { ...b, notes: b.notes.filter(n => n.id !== noteId) } : b)));

  const renameCategory = (from: string, to: string) =>
    update(d => ({
      ...d,
      cropTypes: d.cropTypes.map(c => (c.category === from ? { ...c, category: to } : c)),
      config: {
        ...d.config,
        categories: d.config.categories.map(c => (c === from ? to : c)),
        categoryIcons: Object.fromEntries(Object.entries(d.config.categoryIcons).map(([c, icon]) => [c === from ? to : c, icon])),
      },
    }));

  // Adds the standard categories and crops that aren't in the list yet (matched by name, ignoring case).
  // Crops the user already has keep their own settings.
  const addStandardCrops = () => {
    const has = (list: string[], name: string) => list.some(n => n.toLowerCase() === name.toLowerCase());
    update(d => {
      const categories = [...d.config.categories, ...defaultCategories.filter(c => !has(d.config.categories, c))];
      const newCrops = defaultCropTypes.filter(c => !has(d.cropTypes.map(x => x.name), c.name));
      return {
        ...d,
        cropTypes: [...d.cropTypes, ...newCrops],
        config: {
          ...d.config,
          categories,
          categoryIcons: Object.fromEntries(categories.map(c => [c, d.config.categoryIcons[c] ?? defaultCategoryIcons[c] ?? 'tag'])),
        },
      };
    });
  };

  const deleteCategory = (name: string) => {
    const remaining = config.categories.filter(c => c !== name);
    const moveTo = remaining.includes('Other') ? 'Other' : remaining[0];
    const used = cropTypes.filter(c => c.category === name).length;
    if (!moveTo) return;
    if (!window.confirm(used > 0
      ? `Delete the category "${name}"? Its ${used} crop${used === 1 ? '' : 's'} will move to "${moveTo}".`
      : `Delete the category "${name}"?`)) return;
    update(d => ({
      ...d,
      cropTypes: d.cropTypes.map(c => (c.category === name ? { ...c, category: moveTo } : c)),
      config: {
        ...d.config,
        categories: remaining,
        categoryIcons: Object.fromEntries(Object.entries(d.config.categoryIcons).filter(([c]) => c !== name)),
      },
    }));
  };

  const toggleExpanded = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleEdit = (batch: Batch) => {
    setEditBatch(batch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditBatch(null);
    setBatchPreset(null);
  };
  const sowFor = (p: SowPlan) => {
    setBatchPreset({ crop: p.crop, trays: p.trays });
    setEditBatch(null);
    setIsModalOpen(true);
  };

  const updatePhotos = (batchId: string, fn: (photos: BatchPhoto[]) => BatchPhoto[]) =>
    setBatches(prev => prev.map(batch =>
      batch.id === batchId ? { ...batch, photos: fn(batch.photos), updatedAt: new Date().toISOString() } : batch
    ));

  const updatePhotoCaption = (batchId: string, photoId: string, caption: string) =>
    updatePhotos(batchId, photos => photos.map(p => (p.id === photoId ? { ...p, caption: caption || undefined } : p)));

  const deletePhoto = (batchId: string, photoId: string) =>
    updatePhotos(batchId, photos => photos.filter(p => p.id !== photoId));

  const galleryBatch = batches.find(b => b.id === galleryBatchId) ?? null;
  const viewerBatch = batches.find(b => b.id === viewerPhoto?.batchId) ?? null;
  const compareBatch = batches.find(b => b.id === compareBatchId) ?? null;
  const canCompare = (batch: Batch) =>
    batch.photos.length >= 2 || batches.some(b => b.id !== batch.id && b.cropType === batch.cropType && b.photos.length > 0);

  const handleQuickAction = (batchId: string, actionType: 'watering' | 'photo' | 'note', trayId?: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      setQuickActionModal({ isOpen: true, batch, actionType, trayId });
    }
  };

  const handleQuickActionSave = (batchId: string, actionData: { type: string; data: Record<string, unknown> }) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id !== batchId) return batch;
      const updatedBatch = { ...batch, updatedAt: new Date().toISOString() };

      switch (actionData.type) {
        case 'watering': {
          const wateringRecord: WateringRecord = {
            id: newId(),
            ...(actionData.data as Omit<WateringRecord, 'id'>),
          };
          updatedBatch.watering = [...batch.watering, wateringRecord];
          break;
        }
        case 'note': {
          const note: BatchNote = {
            id: newId(),
            ...(actionData.data as Omit<BatchNote, 'id'>),
          };
          updatedBatch.notes = [...batch.notes, note];
          break;
        }
        case 'photo': {
          const photo: BatchPhoto = {
            id: newId(),
            ...(actionData.data as Omit<BatchPhoto, 'id'>),
          };
          updatedBatch.photos = [...batch.photos, photo];
          break;
        }
      }
      return updatedBatch;
    }));
  };

  // Dashboard sections: the most urgent first; lost and finished batches at the bottom, newest first.
  const batchSections = useMemo(() => {
    const sections: { key: string; label: string; batches: Batch[] }[] = (['harvest', 'growth', 'germination', 'sowing'] as const).map(stage => ({
      key: stage,
      label: stageConfig[stage].label,
      batches: batches.filter(b => b.stage === stage && isBatchGrowing(b))
        .sort((a, b) => a.expectedHarvestDate.localeCompare(b.expectedHarvestDate) || a.batchNumber - b.batchNumber),
    }));
    sections.push({
      key: 'completed',
      label: 'Completed',
      batches: batches.filter(b => b.stage === 'completed' && !isBatchLost(b))
        .sort((a, b) => b.sowingDate.localeCompare(a.sowingDate) || b.batchNumber - a.batchNumber),
    });
    sections.push({
      key: 'lost',
      label: 'Lost',
      batches: batches.filter(isBatchLost).sort((a, b) => b.batchNumber - a.batchNumber),
    });
    return sections.filter(s => s.batches.length > 0);
  }, [batches]);

  const allExpanded = batches.length > 0 && batches.every(b => expandedIds.has(b.id));

  const tabs: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = mode === 'farm'
    ? [
        { key: 'home', label: 'Home', icon: Home },
        { key: 'shelves', label: 'Shelves', icon: LayoutGrid },
        { key: 'batches', label: 'Batches', icon: Layers },
        { key: 'supplies', label: 'Supplies', icon: Package },
        { key: 'config', label: 'Settings', icon: Settings },
      ]
    : [
        { key: 'today', label: 'Today', icon: CalendarDays },
        { key: 'orders', label: 'Orders', icon: ClipboardList },
        { key: 'stock', label: 'Stock', icon: Boxes },
        { key: 'customers', label: 'Customers', icon: Users },
        { key: 'config', label: 'Settings', icon: Settings },
      ];
  // What to sow so the Shop's orders and subscriptions have enough (only when selling).
  const sowing = useMemo(
    () => (shopOn ? sowPlans(batches, stock, orders, subscriptions, cropTypes, todayLocal()) : { plans: [], short: [] }),
    [shopOn, batches, stock, orders, subscriptions, cropTypes]
  );
  // Work waiting on the other side of the switch: batches ready to harvest on the farm, and sowings due today.
  const farmBadge =
    batches.filter(b => b.stage === 'harvest' && isBatchGrowing(b)).length + sowing.plans.filter(p => p.sowBy <= todayLocal()).length;
  // Shop: deliveries due today (or overdue), and stock to sell today or tomorrow or past its use-by date.
  const shopBadge = useMemo(() => {
    const today = todayLocal();
    return deliveriesBetween(orders, subscriptions, today, today, true).length + stockAlerts(stock, today).length;
  }, [stock, orders, subscriptions]);
  const alerts = useMemo(() => supplyAlerts(supplies, todayLocal()), [supplies]);
  const saveCustomer = (c: Customer) =>
    update(d => ({ ...d, customers: d.customers.some(x => x.id === c.id) ? d.customers.map(x => (x.id === c.id ? c : x)) : [...d.customers, c] }));
  // A sale gets the next sale number and takes its microgreens from stock (earliest use-by first). A delivery also
  // marks its order delivered, or its subscription date.
  const saveSale = (sale: Omit<Sale, 'number'>) => {
    const start = saleForm;
    update(d => {
      const number = d.config.lastSaleNumber + 1;
      let nextStock = d.stock;
      for (const item of sale.items) nextStock = sellFromStock(nextStock, item.crop, item.grams, sale.date, sale.id).stock;
      return {
        ...d,
        sales: [...d.sales, { ...sale, number }],
        stock: nextStock,
        orders: start?.orderId ? d.orders.map(o => (o.id === start.orderId ? { ...o, status: 'delivered' as const, saleId: sale.id } : o)) : d.orders,
        subscriptions:
          start?.subscriptionId && start.date
            ? d.subscriptions.map(s => (s.id === start.subscriptionId ? { ...s, delivered: [...s.delivered, { date: start.date!, saleId: sale.id }] } : s))
            : d.subscriptions,
        config: { ...d.config, lastSaleNumber: number },
      };
    });
    setSaleForm(null);
    setSalePage(sale.id);
  };
  // Deleting a sale puts its stock back and reopens the order or subscription delivery it was for.
  const deleteSale = (saleId: string) =>
    update(d => ({
      ...d,
      sales: d.sales.filter(x => x.id !== saleId),
      stock: returnSaleStock(d.stock, saleId),
      orders: d.orders.map(o => (o.saleId === saleId ? { ...o, status: 'open' as const, saleId: undefined } : o)),
      subscriptions: d.subscriptions.map(s => (s.delivered.some(x => x.saleId === saleId) ? { ...s, delivered: s.delivered.filter(x => x.saleId !== saleId) } : s)),
    }));
  // A new order gets the next order number.
  const saveOrder = (o: Order) => {
    const isNew = !orders.some(x => x.id === o.id);
    update(d => {
      if (d.orders.some(x => x.id === o.id)) return { ...d, orders: d.orders.map(x => (x.id === o.id ? o : x)) };
      const number = d.config.lastOrderNumber + 1;
      return { ...d, orders: [...d.orders, { ...o, number }], config: { ...d.config, lastOrderNumber: number } };
    });
    setOrderForm(null);
    if (isNew) setOrderPage(o.id);
  };
  const updateSub = (id: string, fn: (s: Subscription) => Subscription) =>
    update(d => ({ ...d, subscriptions: d.subscriptions.map(s => (s.id === id ? fn(s) : s)) }));
  const saveSub = (s: Subscription) => {
    const isNew = !subscriptions.some(x => x.id === s.id);
    update(d => ({ ...d, subscriptions: isNew ? [...d.subscriptions, s] : d.subscriptions.map(x => (x.id === s.id ? s : x)) }));
    setSubForm(null);
    if (isNew) setSubPage(s.id);
  };
  const deliver = (d: Delivery) =>
    setSaleForm({ customerId: d.customerId, items: d.items, orderId: d.order?.id, subscriptionId: d.subscription?.id, date: d.date });
  const openDelivery = (d: Delivery) => (d.order ? setOrderPage(d.order.id) : d.subscription && setSubPage(d.subscription.id));
  const shareDeliveries = async (list: Delivery[]) => {
    const text = deliveryListText(list, customers, `Deliveries · ${formatDate(todayLocal())}`);
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch {
      return; // cancelled
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };
  const payCustomer = (customerId: string, amount: number, method: PaymentMethod) =>
    update(d => ({ ...d, sales: recordPayment(d.sales, customerId, paymentFor(amount, method)).sales }));
  const paySale = (saleId: string, amount: number, method: PaymentMethod) =>
    update(d => ({ ...d, sales: d.sales.map(s => (s.id === saleId ? { ...s, payments: [...s.payments, paymentFor(amount, method)] } : s)) }));

  // Opens a supply's page on the Supplies tab (from a care task, for example).
  const openSupply = (itemId: string) => {
    setShowTasks(false);
    setActiveTab('supplies');
    setSupplyId(itemId);
  };

  // Opens the Batches tab with one batch expanded and scrolled into view.
  const openBatch = (id: string) => {
    setActiveTab('batches');
    setSelectedTray(null);
    setShowTasks(false);
    setStageFilter('all');
    setBatchSearch('');
    setExpandedIds(new Set([id]));
    requestAnimationFrame(() => document.getElementById(`batch-${id}`)?.scrollIntoView({ block: 'start' }));
  };
  const openTray = (batchId: string, trayId: string) => setSelectedTray({ batchId, trayId });
  const trayBatch = batches.find(b => b.id === selectedTray?.batchId);
  const tray = trayBatch?.trays.find(t => t.id === selectedTray?.trayId);
  const matchesSearch = (b: Batch) =>
    !batchSearch ||
    `${b.cropType} B${String(b.batchNumber).padStart(3, '0')} ${b.trays.map(t => t.code).join(' ')}`
      .toLowerCase()
      .includes(batchSearch.toLowerCase());
  const matchesStage = (b: Batch, stage: StageFilter) =>
    stage === 'all' || (stage === 'lost' ? lostTrays(b).length > 0 : b.stage === stage && !isBatchLost(b));
  const visibleSections = batchSections
    .map(section => ({ ...section, batches: section.batches.filter(b => matchesSearch(b) && matchesStage(b, stageFilter)) }))
    .filter(section => section.batches.length > 0);

  const runBusy = async (message: string, task: () => Promise<void>) => {
    setBusyMessage(message);
    try {
      await task();
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyMessage(null);
    }
  };

  // Replaces all app data, keeping the current data as an on-phone snapshot first so it can be undone.
  const replaceData = async (next: AppData) => {
    await createSnapshot(data);
    update(() => next);
    setExpandedIds(new Set());
    setActiveTab(startTab(mode));
    setSettingsPage(null);
  };

  const handleSnapshotNow = () => runBusy('Saving a copy…', async () => {
    await snapshotNow();
    setBackups(await listSnapshots());
  });

  const handleRestore = (id: string) => {
    if (!window.confirm('Restore this backup? Your current data will be replaced (a copy of it is kept in this list).')) return;
    runBusy('Restoring…', async () => {
      await replaceData(await readSnapshot(id));
      setShowRestoreSheet(false);
    });
  };

  const handleDeleteBackup = async (id: string) => {
    await deleteSnapshot(id);
    setBackups(prev => prev.filter(b => b.id !== id));
  };

  const handleDownloadBackup = (id: string) =>
    runBusy('Preparing backup file…', async () => exportBackupFile(await readSnapshot(id)));

  const handleExportBackup = () => runBusy('Preparing backup file…', () => exportBackupFile(data));

  const handleImportFile = (file: File) => runBusy('Reading backup…', async () => {
    const backup = await parseBackupFile(file);
    const when = backup.createdAt ? ` from ${new Date(backup.createdAt).toLocaleString()}` : '';
    const count = backup.data.batches.length;
    if (!window.confirm(`Restore this backup${when}? It has ${count} batch${count === 1 ? '' : 'es'}. Your current data will be replaced (a copy of it is kept under Settings → Backup & restore → Restore).`)) return;
    setBusyMessage('Restoring…');
    await writeBackupPhotos(backup);
    await replaceData(backup.data);
  });

  const handleLoadTestData = () => {
    const confirmMsg = batches.length > 0
      ? 'This will replace all your current batches with test data. Continue?'
      : 'Load one month of sample batch data?';
    if (!window.confirm(confirmMsg)) return;
    update(d => {
      const test = generateTestBatches(d.config.totalTrays);
      return { ...d, batches: test, config: syncCounters({ ...d.config, lastBatchNumber: 0, lastTrayNumber: 0 }, test) };
    });
    setExpandedIds(new Set());
    setActiveTab(startTab(mode));
    setSettingsPage(null);
  };

  return (
    <div
      className={`farm-app mode-${mode} fixed inset-0 flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl`}
      // In Shop the app's accent colour (buttons, the bottom bar's bubble) becomes the chosen Shop colour.
      style={mode === 'shop' ? ({ '--farm-green': accentColor(config.shop.accent) } as React.CSSProperties) : undefined}
    >
      {/* App Header */}
      <header className="farm-app-header flex items-center justify-between gap-3 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <AppLogo className="w-9 h-9 shrink-0" />
          {shopOn ? (
            <ModeSwitch mode={mode} onChange={switchMode} farmBadge={farmBadge} shopBadge={shopBadge} />
          ) : (
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{appInfo.appName}</h1>
              {lastBackup && (
                <p className="text-[10px] text-gray-400 leading-tight">
                  Backup: {new Date(lastBackup).toLocaleDateString()} {new Date(lastBackup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowNotifications(true)}
          aria-label={`Notifications${notifications.length > 0 ? ` (${notifications.length})` : ''}`}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>
      </header>

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-xs shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Your last change couldn't be saved on this phone.</span>
          <button onClick={onRetrySave} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Main Content */}
      <main ref={mainRef} className="farm-main flex-1 overflow-y-auto no-scrollbar px-5 py-4 pb-8">
        {activeTab === 'home' && (
          <>
            <FarmHome
              batches={batches}
              cropTypes={cropTypes}
              onStage={stage => {
                setStageFilter(stage);
                setActiveTab('batches');
              }}
              onNew={() => setIsModalOpen(true)}
              onWater={id => handleQuickAction(id, 'watering')}
              onShelves={() => setActiveTab('shelves')}
              onBatch={openBatch}
              onAllTasks={() => setShowTasks(true)}
              alerts={alerts}
              onSupply={openSupply}
              sowSection={
                <SowForOrders plans={sowing.plans} short={sowing.short} freePositions={availableSlots.length} onSow={sowFor} onAll={() => setShowSowPlan(true)} />
              }
            />
            {batches.length === 0 && (
              <button className="farm-restore-link" onClick={() => importInputRef.current?.click()}>
                Restore from a backup file
              </button>
            )}
          </>
        )}

        {activeTab === 'shelves' && (
          <ShelvesPanel
            batches={batches}
            config={config}
            onTray={openTray}
            onNew={() => setIsModalOpen(true)}
            onConfig={() => {
              setActiveTab('config');
              setSettingsPage('layout');
            }}
            onBatch={openBatch}
          />
        )}

        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="farm-heading">
              <div>
                <p className="eyebrow">FROM SEED TO HARVEST</p>
                <h1>Your batches</h1>
                <p>One variety. Every tray together.</p>
              </div>
              <button className="farm-icon-button" onClick={() => setIsModalOpen(true)} aria-label="Add batch">
                <Plus />
              </button>
            </div>
            <label className="batch-search">
              <Search size={18} />
              <input placeholder="Search crop, batch or tray" value={batchSearch} onChange={e => setBatchSearch(e.target.value)} />
            </label>
            <div className="batch-filter-row" role="group" aria-label="Show batches">
              {(['all', 'sowing', 'germination', 'growth', 'harvest', 'completed', 'lost'] as const).map(stage => (
                <button key={stage} aria-pressed={stageFilter === stage} onClick={() => setStageFilter(stage)}>
                  {stage === 'all' ? 'All' : stage === 'lost' ? 'Lost' : stage === 'harvest' ? 'Ready' : stageConfig[stage].label}
                  <span>{batches.filter(b => matchesSearch(b) && matchesStage(b, stage)).length}</span>
                </button>
              ))}
            </div>
            {batches.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Sprout className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No batches yet</h3>
                <p className="text-sm text-gray-500 mb-6">Start by adding your first microgreen batch</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Batch
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="mt-3 text-emerald-700 px-6 py-2 rounded-xl hover:bg-emerald-50 transition-colors text-sm font-medium inline-flex items-center"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Restore from a backup file
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end -mb-2">
                  <button
                    onClick={() => setExpandedIds(allExpanded ? new Set() : new Set(batches.map(b => b.id)))}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>
                {visibleSections.length === 0 && <p className="farm-help">No batches match this search or stage.</p>}
                {visibleSections.map(section => (
                  <section key={section.key}>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                      {section.label} · {section.batches.length}
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                      {section.batches.map(batch => (
                        <div id={`batch-${batch.id}`} key={batch.id}>
                          <BatchCard
                            batch={batch}
                            expanded={expandedIds.has(batch.id)}
                            onToggle={() => toggleExpanded(batch.id)}
                            config={config}
                            onEdit={handleEdit}
                            onDelete={deleteBatch}
                            onStageChange={updateBatchStage}
                            onAddPhoto={(batchId) => handleQuickAction(batchId, 'photo')}
                            onAddNote={(batchId) => handleQuickAction(batchId, 'note')}
                            onAddWatering={(batchId) => handleQuickAction(batchId, 'watering')}
                            onOpenGallery={setGalleryBatchId}
                            onReportLoss={(batchId) => setLossSheet({ batchId, trayIds: [] })}
                            onDeleteNote={deleteNote}
                            onHarvest={setHarvestBatchId}
                            iconKey={config.categoryIcons[cropTypes.find(c => c.name === batch.cropType)?.category ?? '']}
                            onOpenTray={trayId => openTray(batch.id, trayId)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'supplies' && (
          <SuppliesPanel supplies={supplies} batches={batches} onOpen={setSupplyId} onAdd={kind => setSupplyForm({ mode: 'new', kind })} />
        )}

        {activeTab === 'today' && (
          <ShopToday
            stock={stock}
            sales={sales}
            customers={customers}
            orders={orders}
            subscriptions={subscriptions}
            currency={currency}
            onDeliver={deliver}
            onOpenDelivery={openDelivery}
            onShareDeliveries={shareDeliveries}
            onProfit={() => setSettingsPage('profit')}
            onOpenCrop={setStockCrop}
            onStock={() => setActiveTab('stock')}
            onNewSale={() => setSaleForm({})}
            onOpenCustomer={setCustomerPage}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersPanel
            orders={orders}
            subscriptions={subscriptions}
            sales={sales}
            customers={customers}
            currency={currency}
            onNewOrder={() => setOrderForm({})}
            onNewSubscription={() => setSubForm({})}
            onNewSale={() => setSaleForm({})}
            onOpenDelivery={openDelivery}
            onOpenOrder={setOrderPage}
            onOpenSubscription={setSubPage}
            onOpenSale={setSalePage}
          />
        )}
        {activeTab === 'stock' && <StockPanel stock={stock} onOpenCrop={setStockCrop} onAdd={() => setAddingStock(true)} />}
        {activeTab === 'customers' && (
          <CustomersPanel customers={customers} sales={sales} currency={currency} onOpen={setCustomerPage} onAdd={() => setCustomerForm({})} />
        )}

        {activeTab === 'config' && (
          <div className="farm-stack">
            <div className="farm-heading">
              <div>
                <p className="eyebrow">{mode === 'farm' ? 'MAKE IT YOUR FARM' : 'MAKE IT YOUR SHOP'}</p>
                <h1>Settings</h1>
                <p>Your space, crops and preferences.</p>
              </div>
            </div>
            <SettingsMenu config={config} cropTypes={cropTypes} lastBackup={lastBackup} mode={mode} pricedCrops={prices.length} onOpen={setSettingsPage} onOpenInfo={setInfoPage} />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav aria-label="Main navigation" className="farm-nav shrink-0">
        {/* A floating bar; the active tab sits in a circle in a notch that slides between tabs. */}
        <div className="farm-nav-bar" style={{ '--tab': tabs.findIndex(t => t.key === activeTab) } as React.CSSProperties}>
          <span className="farm-nav-indicator" aria-hidden="true" />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedTray(null);
                  mainRef.current?.scrollTo(0, 0);
                }}
                aria-current={activeTab === tab.key ? 'page' : undefined}
                className="farm-nav-item"
              >
                <Icon />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Screens pushed on top of the tabs; each slides in and goes back with a swipe from the left edge. */}
      {showTasks && (
        <SwipePage title="Today's care" onBack={() => setShowTasks(false)}>
          <AllTasks
            batches={batches}
            cropTypes={cropTypes}
            alerts={alerts}
            onSupply={openSupply}
            onWater={id => handleQuickAction(id, 'watering')}
            onBatch={openBatch}
          />
        </SwipePage>
      )}
      {showSowPlan && (
        <SwipePage title="Sow for orders" onBack={() => setShowSowPlan(false)}>
          <SowForOrdersPage plans={sowing.plans} short={sowing.short} onSow={sowFor} />
        </SwipePage>
      )}
      {settingsPage && (
        <SwipePage title={settingsTitles[settingsPage]} onBack={() => setSettingsPage(null)}>
          {settingsPage === 'layout' ? (
            <LayoutSettings key={JSON.stringify(config.farmLayout)} config={config} batches={batches} onSave={setConfig} />
          ) : settingsPage === 'insights' ? (
            <div className="farm-stack">
              <ReportExport batches={batches} />
              <ReportsPanel batches={batches} stats={stats} cropTypes={cropTypes} onOpenCropPhotos={setCropPhotos} />
            </div>
          ) : settingsPage === 'profit' ? (
            <ProfitReportPanel
              sales={sales}
              batches={batches}
              stock={stock}
              supplies={supplies}
              customers={customers}
              currency={currency}
              onOpenCustomer={id => {
                setSettingsPage(null);
                setCustomerPage(id);
              }}
            />
          ) : settingsPage === 'prices' ? (
            <PriceList prices={prices} cropTypes={cropTypes} currency={currency} onChange={next => update(d => ({ ...d, prices: next }))} />
          ) : settingsPage === 'shop' ? (
            <ShopSettingsPanel shop={config.shop} onChange={shop => update(d => ({ ...d, config: { ...d.config, shop } }))} />
          ) : (
            <ConfigPanel
              section={settingsPage}
              cropTypes={cropTypes}
              onUpdateCropTypes={setCropTypes}
              config={config}
              onUpdateConfig={setConfig}
              onRenameCategory={renameCategory}
              onAddStandardCrops={addStandardCrops}
              onDeleteCategory={deleteCategory}
              highestBatchNumber={highestBatchNumber(batches)}
              highestTrayNumber={highestTrayNumber(batches)}
              onBackupNow={handleSnapshotNow}
              onShowRestore={() => setShowRestoreSheet(true)}
              onExportBackup={handleExportBackup}
              onImportBackup={() => importInputRef.current?.click()}
              onLoadTestData={handleLoadTestData}
              hasBatches={batches.length > 0}
            />
          )}
        </SwipePage>
      )}
      {customerPage && (() => {
        const c = customers.find(x => x.id === customerPage);
        return c ? (
          <SwipePage title={c.name} onBack={() => setCustomerPage(null)}>
            <CustomerPage
              customer={c}
              sales={sales}
              currency={currency}
              onEdit={() => setCustomerForm({ id: c.id })}
              onNewSale={() => setSaleForm({ customerId: c.id })}
              orderSection={
                <CustomerOrders
                  customerId={c.id}
                  orders={orders}
                  subscriptions={subscriptions}
                  onNewOrder={() => setOrderForm({ customerId: c.id })}
                  onNewSubscription={() => setSubForm({ customerId: c.id })}
                  onOpenOrder={setOrderPage}
                  onOpenSubscription={setSubPage}
                />
              }
              onOpenSale={setSalePage}
              onPay={(amount, method) => payCustomer(c.id, amount, method)}
              onDelete={() => {
                if (customerDue(sales, c.id) > 0) return window.alert(`${c.name} still owes money. Record their payments first.`);
                const plans = orders.some(o => o.customerId === c.id && o.status === 'open') || subscriptions.some(s => s.customerId === c.id);
                const also = plans ? ' Their open orders and subscriptions are deleted too.' : '';
                if (!window.confirm(`Delete ${c.name}? Their past sales are kept, without the name.${also}`)) return;
                update(d => ({
                  ...d,
                  customers: d.customers.filter(x => x.id !== c.id),
                  orders: d.orders.filter(o => o.customerId !== c.id || o.status === 'delivered'),
                  subscriptions: d.subscriptions.filter(s => s.customerId !== c.id),
                }));
                setCustomerPage(null);
              }}
            />
          </SwipePage>
        ) : null;
      })()}
      {orderPage && (() => {
        const o = orders.find(x => x.id === orderPage);
        if (!o) return null;
        const c = customers.find(x => x.id === o.customerId);
        return (
          <SwipePage title={`Order ${orderCode(o.number)}`} onBack={() => setOrderPage(null)}>
            <OrderPage
              order={o}
              customer={c}
              sale={sales.find(s => s.id === o.saleId)}
              onDeliver={() => deliver({ key: o.id, date: o.deliverOn, customerId: o.customerId, items: o.items, order: o })}
              onEdit={() => setOrderForm({ id: o.id })}
              onStatus={status => update(d => ({ ...d, orders: d.orders.map(x => (x.id === o.id ? { ...x, status } : x)) }))}
              onOpenSale={() => o.saleId && setSalePage(o.saleId)}
              onOpenCustomer={() => {
                setOrderPage(null);
                if (c) setCustomerPage(c.id);
              }}
              onDelete={() => {
                const kept = o.status === 'delivered' ? ' Its sale is kept.' : '';
                if (!window.confirm(`Delete order ${orderCode(o.number)}?${kept}`)) return;
                update(d => ({ ...d, orders: d.orders.filter(x => x.id !== o.id) }));
                setOrderPage(null);
              }}
            />
          </SwipePage>
        );
      })()}
      {subPage && (() => {
        const sub = subscriptions.find(x => x.id === subPage);
        if (!sub) return null;
        const c = customers.find(x => x.id === sub.customerId);
        return (
          <SwipePage title={c ? `${c.name}'s subscription` : 'Subscription'} onBack={() => setSubPage(null)}>
            <SubscriptionPage
              subscription={sub}
              customer={c}
              sales={sales}
              currency={currency}
              onDeliver={date => deliver({ key: sub.id, date, customerId: sub.customerId, items: sub.items, subscription: sub })}
              onSkip={date =>
                updateSub(sub.id, s => ({ ...s, skipped: s.skipped.includes(date) ? s.skipped.filter(x => x !== date) : [...s.skipped, date] }))
              }
              onPause={until => updateSub(sub.id, s => ({ ...s, pausedUntil: until }))}
              onEnd={endOn => {
                if (endOn && !window.confirm('End this subscription? There are no more deliveries from today.')) return;
                updateSub(sub.id, s => ({ ...s, endOn }));
              }}
              onEdit={() => setSubForm({ id: sub.id })}
              onOpenSale={setSalePage}
              onOpenCustomer={() => {
                setSubPage(null);
                if (c) setCustomerPage(c.id);
              }}
              onDelete={() => {
                if (!window.confirm('Delete this subscription? Sales already delivered are kept.')) return;
                update(d => ({ ...d, subscriptions: d.subscriptions.filter(x => x.id !== sub.id) }));
                setSubPage(null);
              }}
            />
          </SwipePage>
        );
      })()}
      {salePage && (() => {
        const sale = sales.find(x => x.id === salePage);
        if (!sale) return null;
        const c = customers.find(x => x.id === sale.customerId);
        return (
          <SwipePage title={`Sale ${saleCode(sale.number)}`} onBack={() => setSalePage(null)}>
            <SalePage
              sale={sale}
              customer={c}
              currency={currency}
              onPay={(amount, method) => paySale(sale.id, amount, method)}
              onOpenCustomer={() => {
                if (!c) return;
                setSalePage(null);
                setCustomerPage(c.id);
              }}
              onDelete={() => {
                const linked = orders.some(o => o.saleId === sale.id) || subscriptions.some(s => s.delivered.some(x => x.saleId === sale.id));
                const reopen = linked ? ' The delivery goes back on the list.' : '';
                if (!window.confirm(`Delete this sale? Its microgreens go back into stock.${reopen}`)) return;
                deleteSale(sale.id);
                setSalePage(null);
              }}
            />
          </SwipePage>
        );
      })()}
      {orderForm && (
        <SwipePage title={orderForm.id ? 'Edit order' : 'New order'} onBack={() => setOrderForm(null)}>
          <OrderForm
            customers={customers}
            cropTypes={cropTypes}
            order={orders.find(o => o.id === orderForm.id)}
            customerId={orderForm.customerId}
            onAddCustomer={() => setCustomerForm({})}
            onSave={saveOrder}
          />
        </SwipePage>
      )}
      {subForm && (
        <SwipePage title={subForm.id ? 'Edit subscription' : 'New subscription'} onBack={() => setSubForm(null)}>
          <SubscriptionForm
            customers={customers}
            cropTypes={cropTypes}
            subscription={subscriptions.find(s => s.id === subForm.id)}
            customerId={subForm.customerId}
            onAddCustomer={() => setCustomerForm({})}
            onSave={saveSub}
          />
        </SwipePage>
      )}
      {customerForm && (
        <SwipePage title={customerForm.id ? 'Edit customer' : 'Add customer'} onBack={() => setCustomerForm(null)}>
          <CustomerForm
            customer={customers.find(c => c.id === customerForm.id)}
            existing={customers}
            onSave={c => {
              saveCustomer(c);
              setCustomerForm(null);
              // Added from an order or subscription form: choose them there; otherwise open their page.
              if (customerForm.id) return;
              if (subForm) setSubForm({ ...subForm, customerId: c.id });
              else if (orderForm) setOrderForm({ ...orderForm, customerId: c.id });
              else setCustomerPage(c.id);
            }}
          />
        </SwipePage>
      )}
      {saleForm && (
        <SwipePage title={saleForm.items ? `Deliver to ${customers.find(c => c.id === saleForm.customerId)?.name ?? 'customer'}` : 'New sale'} onBack={() => setSaleForm(null)}>
          <SaleForm
            customers={customers}
            prices={prices}
            stock={stock}
            cropTypes={cropTypes}
            currency={currency}
            customerId={saleForm.customerId}
            items={saleForm.items}
            delivery={!!saleForm.items}
            onSave={saveSale}
          />
        </SwipePage>
      )}
      {stockCrop && (
        <SwipePage title={`${stockCrop} stock`} onBack={() => setStockCrop(null)}>
          <StockCrop
            crop={stockCrop}
            stock={stock}
            batches={batches}
            onMove={(lotId, move) => update(d => ({ ...d, stock: moveStock(d.stock, lotId, move) }))}
          />
        </SwipePage>
      )}
      {addingStock && (
        <SwipePage title="Add stock" onBack={() => setAddingStock(false)}>
          <AddStock
            cropTypes={cropTypes}
            onSave={lot => {
              update(d => ({ ...d, stock: [...d.stock, lot] }));
              setAddingStock(false);
            }}
          />
        </SwipePage>
      )}
      {supplyId && (() => {
        const item = supplies.find(i => i.id === supplyId);
        return item ? (
          <SwipePage title={item.name} onBack={() => setSupplyId(null)}>
            <SupplyDetail
              item={item}
              batches={batches}
              currency={currency}
              onChange={saveSupply}
              onEdit={() => setSupplyForm({ mode: 'edit', id: item.id })}
              onAddLot={() => setSupplyForm({ mode: 'lot', itemId: item.id })}
              onEditLot={lotId => setSupplyForm({ mode: 'lot', itemId: item.id, lotId })}
              onDelete={() => {
                if (!window.confirm(`Delete ${item.name} and its purchases? Batches keep the record of what they used.`)) return;
                setSupplies(prev => prev.filter(i => i.id !== item.id));
                setSupplyId(null);
              }}
            />
          </SwipePage>
        ) : null;
      })()}
      {supplyForm && (() => {
        if (supplyForm.mode === 'lot') {
          const item = supplies.find(i => i.id === supplyForm.itemId);
          if (!item) return null;
          const lot = item.lots.find(l => l.id === supplyForm.lotId);
          return (
            <SwipePage title={lot ? 'Edit purchase' : `Add ${item.name}`} onBack={() => setSupplyForm(null)}>
              <LotForm
                item={item}
                lot={lot}
                currency={currency}
                onSave={saved => {
                  saveSupply({ ...item, lots: lot ? item.lots.map(l => (l.id === saved.id ? saved : l)) : [...item.lots, saved] });
                  setSupplyForm(null);
                }}
                onDelete={() => {
                  if (!window.confirm('Delete this purchase? Its stock is removed.')) return;
                  saveSupply({ ...item, lots: item.lots.filter(l => l.id !== lot?.id) });
                  setSupplyForm(null);
                }}
              />
            </SwipePage>
          );
        }
        const editing = supplyForm.mode === 'edit' ? supplies.find(i => i.id === supplyForm.id) : undefined;
        return (
          <SwipePage title={editing ? `Edit ${editing.name}` : 'Add supply'} onBack={() => setSupplyForm(null)}>
            <SupplyForm
              item={editing}
              kind={supplyForm.mode === 'new' ? supplyForm.kind : undefined}
              cropTypes={cropTypes}
              existing={supplies}
              currency={currency}
              onSave={item => {
                saveSupply(item);
                setSupplyForm(null);
                if (!editing) setSupplyId(item.id);
              }}
            />
          </SwipePage>
        );
      })()}
      {trayBatch && tray && (
        <SwipePage onBack={() => setSelectedTray(null)}>
          <TrayDetail
            batch={trayBatch}
            tray={tray}
            config={config}
            onClose={() => setSelectedTray(null)}
            onBatch={() => openBatch(trayBatch.id)}
            onWater={() => handleQuickAction(trayBatch.id, 'watering')}
            onNote={() => handleQuickAction(trayBatch.id, 'note')}
            onPhoto={() => handleQuickAction(trayBatch.id, 'photo', tray.id)}
            onLoss={() => setLossSheet({ batchId: trayBatch.id, trayIds: [tray.id] })}
          />
        </SwipePage>
      )}

      {/* Notifications Sheet */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNotifications(false)} />
          <div className="relative w-full max-w-md mx-auto lg:max-w-lg xl:max-w-xl bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No pending notifications</p>
              ) : (
                <NotificationPanel
                  notifications={notifications}
                  onComplete={completeReminder}
                  onDismiss={deleteReminder}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restore Sheet */}
      {showRestoreSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRestoreSheet(false)} />
          <div className="relative w-full max-w-md mx-auto lg:max-w-lg xl:max-w-xl bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Daily Backups</h2>
              <button
                onClick={() => setShowRestoreSheet(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                onClick={handleSnapshotNow}
                className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Backup Now
              </button>
              {backups.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No backups yet. A copy is saved on this phone automatically each day.</p>
              ) : (
                <div className="space-y-2">
                  {backups.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{b.label}</div>
                        <div className="text-xs text-gray-500">{(b.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDownloadBackup(b.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Save as backup file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestore(b.id)}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.json,application/zip,application/x-zip-compressed,application/json,application/octet-stream"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow picking the same file again
          if (file) handleImportFile(file);
        }}
      />

      {busyMessage && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 text-sm font-medium text-gray-900 shadow-lg">{busyMessage}</div>
        </div>
      )}

      {/* Photo screens, back to front */}
      {cropPhotos && (
        <SwipePage bare onBack={() => setCropPhotos(null)}>
          <CropPhotos crop={cropPhotos} batches={batches} onClose={() => setCropPhotos(null)} onOpenGallery={setGalleryBatchId} />
        </SwipePage>
      )}
      {galleryBatch && (
        <SwipePage bare onBack={() => setGalleryBatchId(null)}>
        <BatchGallery
          batch={galleryBatch}
          canCompare={canCompare(galleryBatch)}
          onClose={() => setGalleryBatchId(null)}
          onOpenPhoto={(photoId) => setViewerPhoto({ batchId: galleryBatch.id, photoId })}
          onAddPhoto={(trayId) => handleQuickAction(galleryBatch.id, 'photo', trayId)}
          onCompare={() => setCompareBatchId(galleryBatch.id)}
        />
        </SwipePage>
      )}
      {compareBatch && (
        <SwipePage bare onBack={() => setCompareBatchId(null)}>
          <PhotoCompare batch={compareBatch} batches={batches} onClose={() => setCompareBatchId(null)} />
        </SwipePage>
      )}
      {viewerBatch && viewerPhoto && (
        <SwipePage bare onBack={() => setViewerPhoto(null)}>
        <PhotoViewer
          key={viewerPhoto.photoId}
          batch={viewerBatch}
          photoId={viewerPhoto.photoId}
          onClose={() => setViewerPhoto(null)}
          onUpdateCaption={(photoId, caption) => updatePhotoCaption(viewerBatch.id, photoId, caption)}
          onDelete={(photoId) => deletePhoto(viewerBatch.id, photoId)}
        />
        </SwipePage>
      )}

      {/* Add/Edit Modal */}
      <AddBatchModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editBatch={editBatch}
        onSave={saveBatch}
        cropTypes={cropTypes}
        config={config}
        freeSlots={availableSlots}
        supplies={supplies}
        preset={batchPreset}
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={quickActionModal.isOpen}
        onClose={() => setQuickActionModal({ isOpen: false, batch: null, actionType: null })}
        batch={quickActionModal.batch}
        config={config}
        actionType={quickActionModal.actionType}
        trayId={quickActionModal.trayId}
        onSave={handleQuickActionSave}
      />

      {infoPage && (
        <SwipePage bare onBack={() => setInfoPage(null)}>
          <InfoPage kind={infoPage} onClose={() => setInfoPage(null)} />
        </SwipePage>
      )}

      {harvestBatchId && (() => {
        const harvesting = batches.find(b => b.id === harvestBatchId);
        return harvesting ? (
          <HarvestSheet
            batch={harvesting}
            config={config}
            onSave={(weights, date) => harvestBatch(harvesting.id, weights, date)}
            onClose={() => setHarvestBatchId(null)}
          />
        ) : null;
      })()}

      {lossSheet && (() => {
        const lossBatch = batches.find(b => b.id === lossSheet.batchId);
        return lossBatch ? (
          <LostTraySheet
            batch={lossBatch}
            config={config}
            initialTrayIds={lossSheet.trayIds}
            reasons={config.lossReasons}
            onSave={(trayIds, loss) => markTraysLost(lossBatch.id, trayIds, loss)}
            onClose={() => setLossSheet(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

// A rendering error would otherwise leave a blank white screen. Data is saved after every change,
// so reloading loses nothing.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('App crashed:', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        <h1 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-4">Your data is saved. Reload the app to continue.</p>
        <p className="text-xs text-gray-400 mb-4 break-all">{this.state.error.message}</p>
        <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium">
          Reload
        </button>
      </div>
    );
  }
}

function App() {
  const { data, loadError, saveError, retrySave, update } = useAppData();

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        <h1 className="text-base font-semibold text-gray-900 mb-1">Couldn't open your data</h1>
        <p className="text-sm text-gray-500">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <AppLogo className="w-16 h-16" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TrackerApp data={data} update={update} saveError={saveError} onRetrySave={retrySave} />
    </ErrorBoundary>
  );
}

export default App;
