import { useState, useEffect } from 'react';
import { Reminder, Batch } from '../types';
import { addDaysToDate, isDateToday, isDateTomorrow, getDaysFromNow, todayLocal } from '../utils/dateUtils';
import { batchCode, isBatchGrowing } from '../utils/batches';

export const useReminders = (
  batches: Batch[],
  reminders: Reminder[],
  setReminders: (fn: (prev: Reminder[]) => Reminder[]) => void
) => {
  const [notifications, setNotifications] = useState<Reminder[]>([]);

  // Generate automatic reminders based on batch data
  useEffect(() => {
    const autoReminders: Reminder[] = [];
    
    batches.forEach(batch => {
      if (!isBatchGrowing(batch)) return;
      const label = `${batchCode(batch.batchNumber)} (${batch.trays.filter(t => t.status === 'active').length} trays)`;

      // Watering reminders (daily for active batches)
      if (batch.stage !== 'sowing') {
        const lastWatering = batch.watering[batch.watering.length - 1];
        const daysSinceWatering = lastWatering ? 
          Math.abs(getDaysFromNow(lastWatering.timestamp)) : 1;
        
        if (daysSinceWatering >= 1) {
          autoReminders.push({
            id: `water-${batch.id}`,
            batchId: batch.id,
            type: 'watering',
            title: `Water ${batch.cropType}`,
            message: `${label} needs watering`,
            scheduledFor: todayLocal(),
            completed: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Germination check reminder
      if (batch.stage === 'sowing') {
        const germinationDate = addDaysToDate(batch.sowingDate, 2);
        if (getDaysFromNow(germinationDate) <= 0) {
          autoReminders.push({
            id: `germination-${batch.id}`,
            batchId: batch.id,
            type: 'germination',
            title: `Check Germination`,
            message: `${batch.cropType} ${label} should be germinating`,
            scheduledFor: germinationDate,
            completed: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Harvest reminder
      if (batch.stage === 'growth') {
        const harvestDate = batch.expectedHarvestDate;
        if (getDaysFromNow(harvestDate) <= 1) {
          autoReminders.push({
            id: `harvest-${batch.id}`,
            batchId: batch.id,
            type: 'harvest',
            title: `Ready to Harvest`,
            message: `${batch.cropType} ${label} is ready for harvest`,
            scheduledFor: harvestDate,
            completed: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Merge with existing reminders, avoiding duplicates
    const existingIds = reminders.map(r => r.id);
    const newReminders = autoReminders.filter(r => !existingIds.includes(r.id));
    
    if (newReminders.length > 0) {
      setReminders(prev => [...prev, ...newReminders]);
    }
  }, [batches, reminders, setReminders]);

  // Update notifications for today and tomorrow
  useEffect(() => {
    const todayAndTomorrowReminders = reminders.filter(reminder => 
      !reminder.completed && 
      (isDateToday(reminder.scheduledFor) || isDateTomorrow(reminder.scheduledFor))
    );
    setNotifications(todayAndTomorrowReminders);
  }, [reminders]);

  const completeReminder = (id: string) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id ? { ...reminder, completed: true } : reminder
    ));
  };

  const addCustomReminder = (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setReminders(prev => [...prev, newReminder]);
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  };

  return {
    reminders,
    notifications,
    completeReminder,
    addCustomReminder,
    deleteReminder
  };
};