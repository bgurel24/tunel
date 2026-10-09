// Bildirimler — üç parça:
//   1) Yerel günlük antrenman hatırlatması (Expo Go dahil her yerde çalışır)
//   2) Gelen kutusu: notifications tablosu + okundu işaretleme + okunmadı sayısı
//   3) Push: Expo push token kaydı (uzaktan push için development build şart;
//      uygulama açıkken realtime + yerel bildirim zaten devrede)
//
// WEB: expo-notifications tarayıcıda çalışmıyor. İşletim sistemi bildirimi
// üreten her şey (1 ve 3) web'de sessizce devre dışı; gelen kutusu (2) Supabase
// üzerinden yürüdüğü için aynen çalışır — zil ikonu ve okunmadı sayısı canlı
// kalır, yalnızca telefon kapalıyken gelen banner yok.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { t } from '@/lib/i18n';
import { getPrefs } from '@/lib/prefs';
import { avatarUrlFrom } from '@/lib/profile';
import { displayName } from '@/lib/names';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/time';

/** Tarayıcıda mıyız — OS bildirimi üreten her yol burada kesilir. */
export const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ============================================================
// 1) Yerel günlük hatırlatma
// ============================================================

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
  if (isWeb) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function ensureAndroidChannel() {
  if (isWeb) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: t('notif.channel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function setDailyReminder(
  enabled: boolean,
  hour: number,
  minute = 0
): Promise<{ error: string | null }> {
  if (isWeb) return { error: t('notif.webUnsupported') };

  const prevId = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (prevId) {
    await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {});
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }

  if (enabled) {
    const ok = await ensurePermission();
    if (!ok) return { error: t('notif.permission') };
    await ensureAndroidChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.pushTitle'),
        body: t('notif.pushBody'),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  }

  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, hour, minute }));
  return { error: null };
}

export async function sendTestNotification(): Promise<{ error: string | null }> {
  if (isWeb) return { error: t('notif.webUnsupported') };
  const ok = await ensurePermission();
  if (!ok) return { error: t('notif.permissionShort') };
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Tünel test 🔔', body: 'Bildirimler çalışıyor! 🎉' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
  return { error: null };
}

/** Uygulama açıkken gelen bildirimi hemen banner olarak gösterir. */
export async function presentLocal(body: string): Promise<void> {
  // Web'de banner yok; gelen kutusu ve okunmadı sayısı yine güncellenir.
  if (isWeb) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notif.pushTitle'), body },
    trigger: null,
  }).catch(() => {});
}

// ============================================================
// 2) Gelen kutusu
// ============================================================

export type NotificationKind =
  | 'reaction'
  | 'comment'
  | 'submission'
  | 'decision'
  | 'task'
  | 'session'
  | 'join'
  | 'event';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  detail: string | null;
  subject: string | null;
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  postId: string | null;
  teamId: string | null;
  taskId: string | null;
  eventId: string | null;
  read: boolean;
  timeLabel: string;
};

const INBOX_SELECT =
  'id, kind, detail, subject, actor_id, post_id, team_id, task_id, event_id, read_at, created_at, ' +
  'actor:profiles!notifications_actor_id_fkey(username, full_name, avatar_path)';

function mapNotification(row: any): AppNotification {
  return {
    id: String(row.id),
    kind: row.kind as NotificationKind,
    detail: row.detail ?? null,
    subject: row.subject ?? null,
    actorId: row.actor_id ?? null,
    actorName: row.actor ? displayName(row.actor) : null,
    actorAvatarUrl: avatarUrlFrom(row.actor?.avatar_path),
    postId: row.post_id ?? null,
    teamId: row.team_id ?? null,
    taskId: row.task_id ?? null,
    eventId: row.event_id ?? null,
    read: !!row.read_at,
    timeLabel: row.created_at ? timeAgo(row.created_at) : '',
  };
}

export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select(INBOX_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map(mapNotification);
}

export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return error ? 0 : count ?? 0;
}

export async function markAllRead(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.rpc('mark_notifications_read');
  if (!error) emitChanged();
  return { error: error?.message ?? null };
}

/** Bildirim satırını okunabilir metne çevirir — TR/EN sözlüğünden. */
export function notificationText(n: AppNotification): string {
  const who = n.actorName ?? t('inbox.someone');
  const subject = n.subject ?? '';

  switch (n.kind) {
    case 'reaction':
      return t(n.detail === 'clap' ? 'inbox.clap' : 'inbox.like', { who });
    case 'comment':
      return t('inbox.comment', { who, text: subject });
    case 'submission':
      return t('inbox.submission', { who, task: subject });
    case 'decision':
      return t(n.detail === 'approved' ? 'inbox.approved' : 'inbox.rejected', { task: subject });
    case 'task':
      return t('inbox.task', { task: subject });
    case 'session':
      return subject ? t('inbox.sessionAt', { who, gym: subject }) : t('inbox.session', { who });
    case 'join':
      if (n.detail === 'approved') return t('inbox.joinApproved', { team: subject });
      if (n.detail === 'rejected') return t('inbox.joinRejected', { team: subject });
      return t('inbox.joinRequest', { who, team: subject });
    case 'event':
      return t(n.detail === 'reminder' ? 'inbox.eventReminder' : 'inbox.eventNew', { event: subject });
  }
}

// Gelen kutusu değişince (yeni bildirim / okundu) dinleyicileri uyar —
// akış başlığındaki okunmadı noktası anında güncellensin.
type Listener = () => void;
const listeners = new Set<Listener>();

function emitChanged() {
  listeners.forEach((fn) => fn());
}

export function onNotificationsChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Okunmamış bildirim sayısı — değişimlerde kendini tazeler. */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    getUnreadCount().then(setCount);
  }, []);

  useEffect(() => {
    refresh();
    return onNotificationsChanged(refresh);
  }, [refresh]);

  return count;
}

/**
 * Kendi bildirimlerimi canlı dinler. Yeni satır düşünce yerel bildirim gösterir
 * ve dinleyicileri uyarır. Uygulama açıkken bu yol Expo Go'da da çalışır.
 */
export function subscribeToNotifications(userId: string): () => void {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        emitChanged();
        const row = payload.new as any;
        // Satırda actor adı yok (realtime join yapmaz) — metni adsız kuruyoruz.
        presentLocal(notificationText(mapNotification(row)));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// 3) Push token
// ============================================================

/** Expo Go'da uzaktan push desteklenmiyor (SDK 53+) — token istemeyi atlıyoruz. */
export const isExpoGo =
  !isWeb && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Push için elverişli ortam mı — web ve Expo Go dışarıda. */
export const canUsePush = !isWeb && !isExpoGo;

/**
 * Expo push token'ı alır ve push_tokens tablosuna yazar. Token yalnızca
 * kullanıcının kendisi tarafından okunabilir; gönderimi Edge Function yapar.
 */
export async function registerPushToken(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  if (isWeb) return { error: t('notif.webUnsupported') };
  if (isExpoGo) return { error: t('notif.expoGo') };

  const ok = await ensurePermission();
  if (!ok) return { error: t('notif.permissionShort') };
  await ensureAndroidChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return { error: t('err.noSession') };

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: uid,
        token,
        platform: Platform.OS,
        lang: getPrefs().lang,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : t('notif.tokenFailed') };
  }
}
