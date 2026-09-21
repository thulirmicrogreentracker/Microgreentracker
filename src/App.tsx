import React, { useState, useMemo } from 'react';
import { Plus, Sprout, Settings, Download, BarChart3 } from 'lucide-react';
import { Batch, BatchStats, CropType, AppConfig, WateringRecord, BatchNote, BatchPhoto } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useReminders } from './hooks/useReminders';
import { defaultCropTypes } from './data/cropTypes';
import BatchCard from './components/BatchCard';
import AddBatchModal from './components/AddBatchModal';
import Dashboard from './components/Dashboard';
import NotificationPanel from './components/NotificationPanel';
import QuickActionModal from './components/QuickActionModal';
import ExportPanel from './components/ExportPanel';
import SidePanel from './components/SidePanel';
import ConfigPanel from './components/ConfigPanel';
import ReportsPanel from './components/ReportsPanel';
import { getDaysSince } from './utils/dateUtils';

function App() {
  const [batches, setBatches] = useLocalStorage<Batch[]>('microgreen-batches', []);
  const [cropTypes, setCropTypes] = useLocalStorage<CropType[]>('microgreen-crop-types', defaultCropTypes);
  const [config, setConfig] = useLocalStorage<AppConfig>('microgreen-config', { totalTrays: 10, trayNumberPrefix: 'Tray' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [sidePanelView, setSidePanelView] = useState<'config' | 'reports' | null>(null);
  
  // Quick action modal state
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

  // Tray numbers: completed batches free up their tray for reuse
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
    const stats = {
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
      stats[batch.stage]++;
      
      if (batch.stage === 'completed' && batch.actualHarvestDate) {
        const days = getDaysSince(batch.sowingDate) - getDaysSince(batch.actualHarvestDate);
        totalDays += Math.abs(days);
        harvestedCount++;
      }
      
      if (batch.yieldAmount) {
        // Convert all to grams for consistency
        let yieldInGrams = batch.yieldAmount;
        if (batch.yieldUnit === 'ounces') yieldInGrams *= 28.35;
        if (batch.yieldUnit === 'pounds') yieldInGrams *= 453.59;
        totalYield += yieldInGrams;
      }
    });

    stats.avgDaysToHarvest = harvestedCount > 0 ? totalDays / harvestedCount : 0;
    stats.totalYield = totalYield;

    return stats;
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
      if (selectedBatch?.id === id) {
        setSelectedBatch(null);
      }
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
      setQuickActionModal({
        isOpen: true,
        batch,
        actionType
      });
    }
  };

  const handleQuickActionSave = (batchId: string, actionData: any) => {
    setBatches(batches.map(batch => {
      if (batch.id !== batchId) return batch;

      const updatedBatch = { ...batch, updatedAt: new Date().toISOString() };

      switch (actionData.type) {
        case 'watering':
          const wateringRecord: WateringRecord = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...actionData.data
          };
          updatedBatch.watering = [...batch.watering, wateringRecord];
          break;

        case 'note':
          const note: BatchNote = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...actionData.data
          };
          updatedBatch.notes = [...batch.notes, note];
          break;

        case 'photo':
          const photo: BatchPhoto = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...actionData.data
          };
          updatedBatch.photos = [...batch.photos, photo];
          break;
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

    // Sort each stage group by sowing date (newest first for active, oldest first for completed)
    Object.keys(grouped).forEach(stage => {
      grouped[stage as Batch['stage']].sort((a, b) => {
        const dateA = new Date(a.sowingDate).getTime();
        const dateB = new Date(b.sowingDate).getTime();
        return stage === 'completed' ? dateA - dateB : dateB - dateA;
      });
    });

    return stageOrder.flatMap(stage => grouped[stage] || []);
  }, [batches]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="bg-emerald-100 p-3 rounded-xl mr-4">
              <Sprout className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Microgreen Manager</h1>
              <p className="text-gray-600 mt-1">Professional microgreen batch tracking system</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSidePanelView(sidePanelView === 'reports' ? null : 'reports')}
              className={`px-4 py-3 rounded-xl transition-colors font-medium flex items-center shadow-sm ${
                sidePanelView === 'reports' ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              data-panel-trigger
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Reports
            </button>
            <button
              onClick={() => setSidePanelView(sidePanelView === 'config' ? null : 'config')}
              className={`px-4 py-3 rounded-xl transition-colors font-medium flex items-center shadow-sm ${
                sidePanelView === 'config' ? 'bg-gray-800 text-white' : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
              data-panel-trigger
            >
              <Settings className="w-5 h-5 mr-2" />
              Config
            </button>
            <button
              onClick={() => setShowExportPanel(!showExportPanel)}
              className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center shadow-sm"
            >
              <Download className="w-5 h-5 mr-2" />
              Export
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Batch
            </button>
          </div>
        </div>

        {/* Notifications */}
        <NotificationPanel
          notifications={notifications}
          onComplete={completeReminder}
          onDismiss={deleteReminder}
        />

        {/* Dashboard */}
        <Dashboard stats={stats} />

        {/* Export Panel */}
        {showExportPanel && (
          <div className="mb-8">
            <ExportPanel batches={batches} selectedBatch={selectedBatch} />
          </div>
        )}

        {/* Batches Grid */}
        {batches.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Sprout className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No batches yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first microgreen batch</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Batch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeBatchesByStage.map((batch) => (
              <div
                key={batch.id}
                onClick={() => setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)}
                className={`cursor-pointer transition-all ${
                  selectedBatch?.id === batch.id ? 'ring-2 ring-emerald-500' : ''
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

        {/* Side Panel */}
        <SidePanel view={sidePanelView} onClose={() => setSidePanelView(null)}>
          {sidePanelView === 'config' && (
            <ConfigPanel
              cropTypes={cropTypes}
              onUpdateCropTypes={setCropTypes}
              config={config}
              onUpdateConfig={setConfig}
              usedTrayCount={usedTrayCount}
            />
          )}
          {sidePanelView === 'reports' && (
            <ReportsPanel batches={batches} stats={stats} cropTypes={cropTypes} />
          )}
        </SidePanel>
      </div>
    </div>
  );
}

export default App;