// Akış üstündeki "ekip şeridi" verisi — takım arkadaşların ve bugün antrenman yapanlar.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type CrewMember = {
  id: string;
  username: string;
  activeToday: boolean;
  isMe: boolean;
};

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getCrew(): Promise<CrewMember[]> {
  if (!isSupabaseConfigured) return [];

  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];

  const { data: mine } = await supabase.from('team_members').select('team_id').eq('user_id', uid);
  const teamIds = (mine ?? []).map((r: any) => r.team_id);
  if (!teamIds.length) return [];

  const { data: rows } = await supabase
    .from('team_members')
    .select('user_id, profiles!team_members_user_id_fkey(username)')
    .in('team_id', teamIds);
  if (!rows?.length) return [];

  // Aynı kişi birden çok takımda olabilir — tekilleştir.
  const byId = new Map<string, string>();
  for (const r of rows as any[]) {
    if (!byId.has(r.user_id)) byId.set(r.user_id, r.profiles?.username ?? 'kullanıcı');
  }

  const ids = [...byId.keys()];
  const { data: todays } = await supabase
    .from('posts')
    .select('user_id')
    .in('user_id', ids)
    .gte('created_at', startOfToday());
  const active = new Set((todays ?? []).map((r: any) => r.user_id));

  const members: CrewMember[] = ids.map((id) => ({
    id,
    username: byId.get(id)!,
    activeToday: active.has(id),
    isMe: id === uid,
  }));

  // Sıra: önce ben, sonra bugün antrenman yapanlar, sonra kalanlar.
  return members.sort((a, b) => {
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    if (a.activeToday !== b.activeToday) return a.activeToday ? -1 : 1;
    return a.username.localeCompare(b.username, 'tr');
  });
}
