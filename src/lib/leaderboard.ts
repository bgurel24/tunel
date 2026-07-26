// Liderlik veri katmanı — gerçek RPC'ler (team_leaderboard / user_leaderboard).

import { supabase } from '@/lib/supabase';

export type LeaderKind = 'takim' | 'bireysel';

export type LeaderRow = {
  rank: number;
  name: string;
  points: number;
  isMe?: boolean;
};

export async function getLeaderboard(kind: LeaderKind, teamId?: string): Promise<LeaderRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;

  if (kind === 'takim') {
    const { data, error } = await supabase.rpc('team_leaderboard');
    if (error || !data) return [];

    // Kullanıcının takımlarını işaretle.
    let myTeamIds = new Set<string>();
    if (uid) {
      const { data: mine } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', uid);
      myTeamIds = new Set((mine ?? []).map((r: any) => r.team_id));
    }

    return (data as any[]).map((r, i) => ({
      rank: i + 1,
      name: r.name,
      points: Number(r.points),
      isMe: myTeamIds.has(r.team_id),
    }));
  }

  if (!teamId) return [];
  const { data, error } = await supabase.rpc('user_leaderboard', { p_team_id: teamId });
  if (error || !data) return [];

  return (data as any[]).map((r, i) => ({
    rank: i + 1,
    name: r.username,
    points: Number(r.points),
    isMe: r.user_id === uid,
  }));
}
