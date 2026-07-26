// Yerel bildirimler — günlük antrenman hatırlatması + test bildirimi.
// Not: Expo Go'da yerel/zamanlanmış bildirimler çalışır. Sunucudan gerçek push
// (beğeni/yorum bildirimi vb.) için ileride development build gerekir.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SETTINGS_KEY = 'notif_daily';
const REMINDER_ID_KEY = 'notif_daily_id';

export type DailySettings = { enabled: boolean; hour: number; minute: number };

const DEFAULT: DailySettings = { enabled: false, hour: 18, minute: 0 };

export async function getDailySettings(): Promise<DailySettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hatırlatmalar',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function setDailyReminder(
  enabled: boolean,
  hour: number,
  minute = 0
): Promise<{ error: string | null }> {
  const prevId = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (prevId) {
    await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {});
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }

  if (enabled) {
    const ok = await ensurePermission();
    if (!ok) return { error: 'Bildirim izni verilmedi. Ayarlardan açman gerekiyor.' };
    await ensureAndroidChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tünel 💪',
        body: 'Antrenman zamanı! Bugünkü pump fotonu paylaşmayı unutma.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  }

  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, hour, minute }));
  return { error: null };
}

export async function sendTestNotification(): Promise<{ error: string | null }> {
  const ok = await ensurePermission();
  if (!ok) return { error: 'Bildirim izni verilmedi.' };
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Tünel test 🔔', body: 'Bildirimler çalışıyor! 🎉' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
  return { error: null };
}
