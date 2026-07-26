// Kişisel rekorlar (PR) — hareket bazında kilo kaydı + ilerleme.

import { supabase } from '@/lib/supabase';

export type PRRecord = {
  id: string;
  movement: string;
  weight: number;
  reps: number;
  achievedAt: string; // YYYY-MM-DD
};

export type MovementGroup = {
  movement: string;
  best: number;
  latest: number;
  gain: number; // en iyi - en eski (ilerleme)
  entries: PRRecord[]; // tarihe göre yeniden eskiye
};

export async function getMyRecords(): Promise<MovementGroup[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  return getUserRecords(uid);
}

export async function getUserRecords(uid: string): Promise<MovementGroup[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('id, movement, weight, reps, achieved_at')
    .eq('user_id', uid)
    .order('achieved_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const groups: Record<string, PRRecord[]> = {};
  (data as any[]).forEach((r) => {
    const rec: PRRecord = {
      id: String(r.id),
      movement: r.movement,
      weight: Number(r.weight),
      reps: r.reps ?? 1,
      achievedAt: r.achieved_at,
    };
    (groups[r.movement] ??= []).push(rec);
  });

  return Object.entries(groups)
    .map(([movement, entries]) => {
      const weights = entries.map((e) => e.weight);
      const best = Math.max(...weights);
      const earliest = entries[entries.length - 1].weight;
      return {
        movement,
        best,
        latest: entries[0].weight,
        gain: Math.round((best - earliest) * 10) / 10,
        entries,
      };
    })
    .sort((a, b) => b.best - a.best);
}

export async function addRecord(
  movement: string,
  weight: number,
  reps: number
): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.from('personal_records').insert({
    user_id: uid,
    movement: movement.trim(),
    weight,
    reps,
  });
  return { error: error?.message ?? null };
}

export async function deleteRecord(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('personal_records').delete().eq('id', id);
  return { error: error?.message ?? null };
}
