// Kişisel istatistikler — seri (streak) + rozetler. Gerçek verilerden hesaplanır.

import { supabase } from '@/lib/supabase';

export type Badge = { icon: string; label: string };

export type MyStats = {
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  prCount: number;
  approvedTasks: number;
  badges: Badge[];
  // Paylaşım yapılan günler (YYYY-MM-DD) — profildeki aktivite ısı haritası için.
  activeDays: string[];
};

const EMPTY: MyStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalPosts: 0,
  prCount: 0,
  approvedTasks: 0,
  badges: [],
  activeDays: [],
};

function dayString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function computeStreak(isoDates: string[]): { current: number; longest: number } {
  const days = [...new Set(isoDates.map((d) => d.slice(0, 10)))].sort();
  if (!days.length) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff =
      (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (diff > 1) {
      run = 1;
    }
  }

  const today = dayString(new Date());
  const yesterday = dayString(new Date(Date.now() - 86400000));
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const diff =
        (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
      if (diff === 1) current += 1;
      else break;
    }
  }
  return { current, longest };
}

function buildBadges(s: Omit<MyStats, 'badges' | 'activeDays'>): Badge[] {
  const b: Badge[] = [];
  if (s.totalPosts >= 1) b.push({ icon: 'sparkles', label: 'İlk paylaşım' });
  if (s.totalPosts >= 10) b.push({ icon: 'flame', label: 'Aktif paylaşımcı' });
  if (s.currentStreak >= 3) b.push({ icon: 'flame', label: `${s.currentStreak} gün seri` });
  if (s.longestStreak >= 7) b.push({ icon: 'trophy', label: '7 gün kesintisiz' });
  if (s.prCount >= 1) b.push({ icon: 'barbell', label: 'Rekor avcısı' });
  if (s.approvedTasks >= 1) b.push({ icon: 'checkmark-done', label: 'Görev tamamladı' });
  if (s.approvedTasks >= 5) b.push({ icon: 'medal', label: 'Görev canavarı' });
  return b;
}

export async function getMyStats(): Promise<MyStats> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return EMPTY;
  return getUserStats(uid);
}

export async function getUserStats(uid: string): Promise<MyStats> {
  const [postsRes, prRes, subRes] = await Promise.all([
    supabase.from('posts').select('created_at').eq('user_id', uid),
    supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('status', 'approved'),
  ]);

  const dates = (postsRes.data ?? []).map((r: any) => r.created_at as string);
  const { current, longest } = computeStreak(dates);
  const base = {
    currentStreak: current,
    longestStreak: longest,
    totalPosts: dates.length,
    prCount: prRes.count ?? 0,
    approvedTasks: subRes.count ?? 0,
  };
  const activeDays = [...new Set(dates.map((d) => d.slice(0, 10)))];
  return { ...base, badges: buildBadges(base), activeDays };
}
