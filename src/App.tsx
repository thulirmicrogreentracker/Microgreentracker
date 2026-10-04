import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Sprout, Settings, BarChart3, Home, Bell, X } from 'lucide-react';
import { Batch, BatchStats, CropType, AppConfig, WateringRecord, BatchNote, BatchPhoto } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useReminders } from './hooks/useReminders';
import { useDailyBackup, listBackups, restoreBackup, deleteBackup, downloadBackup, BackupInfo } from './hooks/useBackup';
import { defaultCropTypes } from './data/cropTypes';
import BatchCard from './components/BatchCard';
import AddBatchModal from './components/AddBatchModal';
import Dashboard from './components/Dashboard';
import NotificationPanel from './components/NotificationPanel';
import QuickActionModal from './components/QuickActionModal';
import ConfigPanel from './components/ConfigPanel';
import ReportsPanel from './components/ReportsPanel';
import { getDaysSince } from './utils/dateUtils';
import { generateTestBatches } from './utils/generateTestData';

type Tab = 'home' | 'reports' | 'config';

function App() {
  const [batches, setBatches] = useLocalStorage<Batch[]>('microgreen-batches', []);
  const [cropTypes, setCropTypes] = useLocalStorage<CropType[]>('microgreen-crop-types', defaultCropTypes);
  const [config, setConfig] = useLocalStorage<AppConfig>('microgreen-config', { totalTrays: 10, trayNumberPrefix: 'Tray' });
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRestoreSheet, setShowRestoreSheet] = useState(false);

  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    batch: Batch | null;
    actionType: 'watering' | 'photo' | 'note' | null;
  }>({
    isOpen: false,
    batch: null,
    actionType: null
  });

  const { notifications, completeReminder, deleteReminder } = useReminders(batches);
  const { lastBackup, backupNow } = useDailyBackup();
  const [backups, setBackups] = useState<BackupInfo[]>([]);

  useEffect(() => {
    if (showRestoreSheet) {
      listBackups().then(setBackups).catch(() => setBackups([]));
    }
  }, [showRestoreSheet]);

  const availableTrayNumbers = useMemo(() => {
    const usedNumbers = new Set(
      batches
        .filter(b => b.stage !== 'completed' && b.trayNumber != null)
        .map(b => b.trayNumber)
    );
    const all = Array.from({ length: config.totalTrays }, (_, i) => i + 1);
    return all.filter(n => !usedNumbers.has(n));
  }, [batches, config.totalTrays]);

  const usedTrayCount = config.totalTrays - availableTrayNumbers.length;

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
    };

    let totalDays = 0;
    let harvestedCount = 0;
    let totalYield = 0;

    batches.forEach(batch => {
      s[batch.stage]++;

      if (batch.stage === 'completed' && batch.actualHarvestDate) {
        const days = getDaysSince(batch.sowingDate) - getDaysSince(batch.actualHarvestDate);
        totalDays += Math.abs(days);
        harvestedCount++;
      }

      if (batch.yieldAmount) {
        let yieldInGrams = batch.yieldAmount;
        if (batch.yieldUnit === 'ounces') yieldInGrams *= 28.35;
        if (batch.yieldUnit === 'pounds') yieldInGrams *= 453.59;
        totalYield += yieldInGrams;
      }
    });

    s.avgDaysToHarvest = harvestedCount > 0 ? totalDays / harvestedCount : 0;
    s.totalYield = totalYield;

    return s;
  }, [batches]);

  const addBatch = (newBatch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>) => {
    const batch: Batch = {
      ...newBatch,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBatches([...batches, batch]);
  };

  const updateBatch = (updatedBatch: Batch) => {
    setBatches(batches.map(batch =>
      batch.id === updatedBatch.id ? { ...updatedBatch, updatedAt: new Date().toISOString() } : batch
    ));
    setEditBatch(null);
  };

  const deleteBatch = (id: string) => {
    if (window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      setBatches(batches.filter(batch => batch.id !== id));
      if (selectedBatch?.id === id) setSelectedBatch(null);
    }
  };

  const updateBatchStage = (id: string, stage: Batch['stage']) => {
    setBatches(batches.map(batch =>
      batch.id === id
        ? {
            ...batch,
            stage,
            actualHarvestDate: stage === 'completed' ? new Date().toISOString().split('T')[0] : batch.actualHarvestDate,
            updatedAt: new Date().toISOString()
          }
        : batch
    ));
  };

  const handleEdit = (batch: Batch) => {
    setEditBatch(batch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditBatch(null);
  };

  const handleQuickAction = (batchId: string, actionType: 'watering' | 'photo' | 'note') => {
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      setQuickActionModal({ isOpen: true, batch, actionType });
    }
  };

  const handleQuickActionSave = (batchId: string, actionData: { type: string; data: Record<string, unknown> }) => {
    setBatches(batches.map(batch => {
      if (batch.id !== batchId) return batch;
      const updatedBatch = { ...batch, updatedAt: new Date().toISOString() };

      switch (actionData.type) {
        case 'watering': {
          const wateringRecord: WateringRecord = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...(actionData.data as Omit<WateringRecord, 'id'>),
          };
          updatedBatch.watering = [...batch.watering, wateringRecord];
          break;
        }
        case 'note': {
          const note: BatchNote = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...(actionData.data as Omit<BatchNote, 'id'>),
          };
          updatedBatch.notes = [...batch.notes, note];
          break;
        }
        case 'photo': {
          const photo: BatchPhoto = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...(actionData.data as Omit<BatchPhoto, 'id'>),
          };
          updatedBatch.photos = [...batch.photos, photo];
          break;
        }
      }
      return updatedBatch;
    }));
  };

  const activeBatchesByStage = useMemo(() => {
    const stageOrder: Batch['stage'][] = ['harvest', 'growth', 'germination', 'sowing', 'completed'];
    const grouped = batches.reduce((acc, batch) => {
      if (!acc[batch.stage]) acc[batch.stage] = [];
      acc[batch.stage].push(batch);
      return acc;
    }, {} as Record<Batch['stage'], Batch[]>);

    Object.keys(grouped).forEach(stage => {
      grouped[stage as Batch['stage']].sort((a, b) => {
        const dateA = new Date(a.sowingDate).getTime();
        const dateB = new Date(b.sowingDate).getTime();
        return stage === 'completed' ? dateA - dateB : dateB - dateA;
      });
    });

    return stageOrder.flatMap(stage => grouped[stage] || []);
  }, [batches]);

  const tabs: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'config', label: 'Config', icon: Settings },
  ];

  const handleRestore = async (id: string) => {
    if (!window.confirm('Restore this backup? Current data will be replaced.')) return;
    await restoreBackup(id);
    window.location.reload();
  };

  const handleDeleteBackup = async (id: string) => {
    await deleteBackup(id);
    setBackups(backups.filter(b => b.id !== id));
  };

  const handleLoadTestData = () => {
    const confirmMsg = batches.length > 0
      ? 'This will replace all your current batches with test data. Continue?'
      : 'Load one month of sample batch data?';
    if (!window.confirm(confirmMsg)) return;
    setBatches(generateTestBatches());
    setActiveTab('home');
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      {/* App Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Sprout className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Microgreen Manager</h1>
            {lastBackup && (
              <p className="text-[10px] text-gray-400 leading-tight">
                Backup: {new Date(lastBackup).toLocaleDateString()} {new Date(lastBackup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowNotifications(true)}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-28">
        {activeTab === 'home' && (
          <div className="space-y-4">
            <Dashboard stats={stats} />
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
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeBatchesByStage.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)}
                    className={`cursor-pointer transition-all ${
                      selectedBatch?.id === batch.id ? 'ring-2 ring-emerald-500 rounded-xl' : ''
                    }`}
                  >
                    <BatchCard
                      batch={batch}
                      onEdit={handleEdit}
                      onDelete={deleteBatch}
                      onStageChange={updateBatchStage}
                      onAddPhoto={(batchId) => handleQuickAction(batchId, 'photo')}
                      onAddNote={(batchId) => handleQuickAction(batchId, 'note')}
                      onAddWatering={(batchId) => handleQuickAction(batchId, 'watering')}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportsPanel batches={batches} stats={stats} cropTypes={cropTypes} />
        )}

        {activeTab === 'config' && (
          <ConfigPanel
            cropTypes={cropTypes}
            onUpdateCropTypes={setCropTypes}
            config={config}
            onUpdateConfig={setConfig}
            usedTrayCount={usedTrayCount}
            onBackupNow={backupNow}
            onShowRestore={() => setShowRestoreSheet(true)}
            onLoadTestData={handleLoadTestData}
            hasBatches={batches.length > 0}
          />
        )}
      </main>

      {/* Floating Action Button */}
      {activeTab === 'home' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-20 right-4 max-w-md:w-auto lg:max-w-lg:w-auto xl:max-w-xl:w-auto z-30 bg-emerald-600 text-white rounded-full p-4 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
          style={{ right: 'max(1rem, calc((100vw - 100%) / 2 + 1rem))' }}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors ${
                isActive ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

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
            <div className="overflow-y-auto p-4">
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
            <div className="overflow-y-auto p-4">
              <button
                onClick={() => { backupNow(); listBackups().then(setBackups); }}
                className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Backup Now
              </button>
              {backups.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No backups yet. Backups are created automatically each day.</p>
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
                          onClick={() => downloadBackup(b.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Settings className="w-4 h-4" />
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

      {/* Add/Edit Modal */}
      <AddBatchModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={addBatch}
        editBatch={editBatch}
        onUpdate={updateBatch}
        cropTypes={cropTypes}
        availableTrayNumbers={availableTrayNumbers}
        totalTrays={config.totalTrays}
        trayNumberPrefix={config.trayNumberPrefix}
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={quickActionModal.isOpen}
        onClose={() => setQuickActionModal({ isOpen: false, batch: null, actionType: null })}
        batch={quickActionModal.batch}
        actionType={quickActionModal.actionType}
        onSave={handleQuickActionSave}
      />
    </div>
  );
}

export default App;
