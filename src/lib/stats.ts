// Kişisel istatistikler — seri (streak) + rozetler. Gerçek verilerden hesaplanır.

import type { TranslationKey } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export type Badge = { icon: string; key: TranslationKey };

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
  if (s.totalPosts >= 1) b.push({ icon: 'sparkles', key: 'badge.firstPost' });
  if (s.totalPosts >= 10) b.push({ icon: 'flame', key: 'badge.activePoster' });
  if (s.currentStreak >= 3) b.push({ icon: 'flame', key: 'badge.streak3' });
  if (s.longestStreak >= 7) b.push({ icon: 'trophy', key: 'badge.streak7' });
  if (s.prCount >= 1) b.push({ icon: 'barbell', key: 'badge.record' });
  if (s.approvedTasks >= 1) b.push({ icon: 'checkmark-done', key: 'badge.task1' });
  if (s.approvedTasks >= 5) b.push({ icon: 'medal', key: 'badge.task5' });
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

// ========== Panel: takımın haftalık pump sayısı ==========
// Hafta pazartesi başlar; hedef üye sayısı × 4 (en az 10).

export async function getTeamWeek(teamId: string): Promise<{ pumps: number; goal: number }> {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const [postsRes, membersRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', monday.toISOString()),
    supabase
      .from('team_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('team_id', teamId),
  ]);

  const members = membersRes.count ?? 0;
  return { pumps: postsRes.count ?? 0, goal: Math.max(10, members * 4) };
}
