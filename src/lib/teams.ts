// Takım işlemleri — takımlarım / katıl / oluştur / sil.

import { supabase } from '@/lib/supabase';

export type MyTeam = {
  id: string;
  name: string;
  inviteCode: string;
  role: 'captain' | 'member';
};

export async function getMyTeams(): Promise<MyTeam[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('team_members')
    .select('role, teams(id, name, invite_code)')
    .eq('user_id', uid)
    .order('joined_at', { ascending: false });

  if (error || !data) return [];

  return (data as any[])
    .filter((r) => r.teams)
    .map((r) => ({
      id: r.teams.id,
      name: r.teams.name,
      inviteCode: r.teams.invite_code,
      role: r.role,
    }));
}

export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_team', { p_team_id: teamId });
  return { error: error?.message ?? null };
}

export async function joinTeam(code: string): Promise<{ error: string | null; teamName?: string }> {
  const { data, error } = await supabase.rpc('join_team_by_code', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) return { error: error.message };
  return { error: null, teamName: (data as string) ?? code.toUpperCase() };
}

export async function createTeam(
  name: string
): Promise<{ error: string | null; inviteCode?: string }> {
  const { data, error } = await supabase.rpc('create_team', { p_name: name.trim() });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, inviteCode: row?.invite_code as string | undefined };
}
