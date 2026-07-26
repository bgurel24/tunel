// Topluluk güvenliği — kullanıcı engelleme ve içerik şikayeti.
//
// App Store kuralı (1.2 Kullanıcı üretimli içerik): şikayet yolu, engelleme
// yolu ve engellenenlerin içeriğinin gizlenmesi zorunlu.
//
// Engel çift yönlü gizler: engellediklerim + beni engelleyenler akıştan düşer.

import { avatarUrlFrom } from '@/lib/profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { t, type TranslationKey } from '@/lib/i18n';

export type ReportReason = 'spam' | 'harassment' | 'nudity' | 'violence' | 'hate' | 'other';

export const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'nudity',
  'violence',
  'hate',
  'other',
];

export function reasonKey(reason: ReportReason): TranslationKey {
  return `report.${reason}` as TranslationKey;
}

export type BlockedUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

// Akış her açılışta engel listesini sormasın diye küçük bir bellek önbelleği.
let hiddenCache: string[] | null = null;

export function clearHiddenCache() {
  hiddenCache = null;
}

/** Akıştan düşecek kullanıcılar: engellediklerim + beni engelleyenler. */
export async function getHiddenUserIds(force = false): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  if (!force && hiddenCache) return hiddenCache;

  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);

  if (error || !data) return hiddenCache ?? [];

  const ids = new Set<string>();
  (data as any[]).forEach((r) => {
    ids.add(r.blocker_id === uid ? r.blocked_id : r.blocker_id);
  });
  ids.delete(uid);

  hiddenCache = [...ids];
  return hiddenCache;
}

/** Bir kullanıcıyı görmüyor muyum? (profil ekranı için) */
export async function isHidden(userId: string): Promise<boolean> {
  return (await getHiddenUserIds()).includes(userId);
}

export async function blockUser(userId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: t('err.noSession') };
  if (uid === userId) return { error: t('block.self') };

  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: uid, blocked_id: userId });
  clearHiddenCache();
  // 23505: zaten engellenmiş — kullanıcı için hata değil.
  if (error && error.code !== '23505') return { error: error.message };
  return { error: null };
}

export async function unblockUser(userId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: t('err.noSession') };

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', uid)
    .eq('blocked_id', userId);
  clearHiddenCache();
  return { error: error?.message ?? null };
}

/** Ayarlar > Engellenen kullanıcılar listesi (yalnızca benim engellediklerim). */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  if (!isSupabaseConfigured) return [];
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id, profiles!blocked_users_blocked_id_fkey(username, avatar_path)')
    .eq('blocker_id', uid)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.blocked_id,
    username: r.profiles?.username ?? t('user.fallbackName'),
    avatarUrl: avatarUrlFrom(r.profiles?.avatar_path),
  }));
}

async function insertReport(row: {
  post_id?: string | null;
  reported_user_id?: string | null;
  reason: ReportReason;
  note?: string | null;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: t('err.noSession') };

  const { error } = await supabase.from('reports').insert({
    reporter_id: uid,
    post_id: row.post_id ?? null,
    reported_user_id: row.reported_user_id ?? null,
    reason: row.reason,
    note: row.note ?? null,
  });
  return { error: error?.message ?? null };
}

export async function reportPost(
  postId: string,
  authorId: string | null,
  reason: ReportReason,
  note?: string
) {
  return insertReport({ post_id: postId, reported_user_id: authorId, reason, note });
}

export async function reportUser(userId: string, reason: ReportReason, note?: string) {
  return insertReport({ reported_user_id: userId, reason, note });
}
