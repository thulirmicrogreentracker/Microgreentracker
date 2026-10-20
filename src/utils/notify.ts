// Scheduling the daily reminders as phone notifications (Android and iPhone; nothing in a browser).
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppData } from '../types';
import { daySummary, plannedNotifications } from './dailySummary';
import { SowPlan } from './plan';

export const CHANNEL_ID = 'daily';
const MORNING_ID = 1000;
const LAST_ID = 2099;

const native = () => Capacitor.isNativePlatform();

export const notificationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  if (!native()) return 'denied';
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
};

export const askNotificationPermission = async (): Promise<boolean> => {
  if (!native()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
};

let channelReady = false;
const ensureChannel = async () => {
  if (channelReady || Capacitor.getPlatform() !== 'android') return;
  await LocalNotifications.createChannel({ id: CHANNEL_ID, name: 'Daily summary', description: 'Morning summary and evening reminder', importance: 3 });
  channelReady = true;
};

// Replaces the scheduled reminders with the ones for the coming week (or removes them when turned off).
export const scheduleReminders = async (data: AppData, plans: SowPlan[], today: string) => {
  if (!native()) return;
  const settings = data.config.notifications;
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter(n => n.id >= MORNING_ID && n.id <= LAST_ID);
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
  if (!settings.enabled || (await notificationPermission()) !== 'granted') return;
  await ensureChannel();
  const list = plannedNotifications(data, plans, settings, new Date(), today);
  if (!list.length) return;
  await LocalNotifications.schedule({
    notifications: list.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      largeBody: n.body,
      channelId: CHANNEL_ID,
      smallIcon: 'ic_stat_notify',
      schedule: { at: n.at, allowWhileIdle: true },
      // A few minutes late is fine for a daily summary: no exact alarm, so Android never asks for that permission.
      isExactNotification: false,
      extra: { tab: n.tab },
    })),
  });
};

// A notification with today's summary in a few seconds, to check they arrive.
export const sendTestNotification = async (data: AppData, plans: SowPlan[], today: string) => {
  if (!native()) return;
  await ensureChannel();
  const day = daySummary(data, plans, { ...data.config.notifications, watering: true, deliveries: true, sowHarvest: true, stock: true }, today, today);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 3000,
        title: 'Thulir reminders are on',
        body: day.lines.length ? day.lines.join('\n') : 'Nothing to do today. Your morning summary will list watering, deliveries and more.',
        largeBody: day.lines.join('\n') || undefined,
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_notify',
        schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
        isExactNotification: false,
        extra: { tab: 'home' },
      },
    ],
  });
};
