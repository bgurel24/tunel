// Takım işlemleri — takımlarım / katıl / oluştur / sil / ayrıl / yönet / üyeler.

import { avatarUrlFrom } from '@/lib/profile';
import { displayName } from '@/lib/names';
import { supabase } from '@/lib/supabase';

/** coach → idman açar, yoklama ve katılım istatistiği görür; kaptan yetkisi yok. */
export type TeamRole = 'captain' | 'member' | 'coach';

export type MyTeam = {
  id: string;
  name: string;
  inviteCode: string;
  /** 'captain' → görev ve onay yetkisi. Yardımcı kaptanlarda da 'captain'. */
  role: TeamRole;
  /**
   * Takımın sahibi ben miyim (teams.captain_id). Yardımcı kaptanlarda false:
   * onay/görev işlerini yaparlar ama takım adı, davet kodu, takımı silme ve
   * yetki dağıtma yalnızca sahipte.
   */
  isOwner: boolean;
};

export type TeamMember = {
  id: string;
  username: string;
  /** Gösterilecek ad: gerçek ad varsa o, yoksa kullanıcı adı. */
  name: string;
  avatarUrl: string | null;
  role: TeamRole;
};

export async function getMyTeams(): Promise<MyTeam[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('team_members')
    .select('role, teams(id, name, invite_code, captain_id)')
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
      isOwner: r.teams.captain_id === uid,
    }));
}

export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_team', { p_team_id: teamId });
  return { error: error?.message ?? null };
}

/**
 * Davet kodu artık doğrudan üye yapmaz: istek açılır, kaptan onaylar.
 * pending=false yalnızca zaten üyeysen döner.
 */
export async function joinTeam(
  code: string
): Promise<{ error: string | null; teamName?: string; pending?: boolean }> {
  const { data, error } = await supabase.rpc('join_team_by_code', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) return { error: error.message };
  const row = (typeof data === 'string' ? JSON.parse(data) : data) as { name?: string; pending?: boolean } | null;
  return { error: null, teamName: row?.name ?? code.toUpperCase(), pending: !!row?.pending };
}

export type JoinRequest = { id: string; username: string; name: string; avatarUrl: string | null; createdAt: string };

/** Kaptan için: takıma katılmak isteyenler. RLS zaten yalnızca kaptana gösterir. */
export async function getJoinRequests(teamId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('team_join_requests')
    .select('created_at, profiles!team_join_requests_user_id_fkey(id, username, full_name, avatar_path)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as any[])
    .filter((r) => r.profiles)
    .map((r) => ({
      id: r.profiles.id as string,
      username: r.profiles.username as string,
      name: displayName(r.profiles),
      avatarUrl: avatarUrlFrom(r.profiles.avatar_path),
      createdAt: r.created_at as string,
    }));
}

export async function approveJoinRequest(teamId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('approve_join_request', { p_team_id: teamId, p_user_id: userId });
  return { error: error?.message ?? null };
}

export async function rejectJoinRequest(teamId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('reject_join_request', { p_team_id: teamId, p_user_id: userId });
  return { error: error?.message ?? null };
}

export async function createTeam(
  name: string
): Promise<{ error: string | null; inviteCode?: string }> {
  const { data, error } = await supabase.rpc('create_team', { p_name: name.trim() });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, inviteCode: row?.invite_code as string | undefined };
}

/**
 * Takımdan ayrılır. Kaptansan kaptanlık en eski üyeye geçer; takımdaki tek
 * kişiysen sunucu hata döner (ayrılmak yerine takımı silmen gerekir).
 */
export async function leaveTeam(teamId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('leave_team', { p_team_id: teamId });
  return { error: error?.message ?? null };
}

/** Davet kodunu yeniler (yalnızca kaptan) — eski kod geçersiz olur. */
export async function regenerateInviteCode(
  teamId: string
): Promise<{ error: string | null; inviteCode?: string }> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', { p_team_id: teamId });
  if (error) return { error: error.message };
  return { error: null, inviteCode: (data as string) ?? undefined };
}

/** Takım adını değiştirir (yalnızca kaptan). */
export async function renameTeam(teamId: string, name: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('rename_team', {
    p_team_id: teamId,
    p_name: name.trim(),
  });
  return { error: error?.message ?? null };
}

const ROLE_ORDER: Record<TeamRole, number> = { coach: 0, captain: 1, member: 2 };

/** Takımın üyeleri — koçlar, kaptanlar, sonra katılma sırasına göre üyeler. */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role, profiles!team_members_user_id_fkey(id, username, full_name, avatar_path)')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error || !data) return [];

  return (data as any[])
    .filter((r) => r.profiles)
    .map((r) => ({
      id: r.profiles.id as string,
      username: r.profiles.username as string,
      name: displayName(r.profiles),
      avatarUrl: avatarUrlFrom(r.profiles.avatar_path),
      role: r.role as TeamRole,
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}

/**
 * Takımın sahipliğini devreder — sen üyeliğe düşersin. Yardımcı kaptanlar
 * yardımcı kalmaya devam eder. Yalnızca sahip çağırabilir.
 */
export async function transferCaptaincy(
  teamId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('transfer_captaincy', {
    p_team_id: teamId,
    p_user_id: userId,
  });
  return { error: error?.message ?? null };
}

/**
 * Bir üyeye kaptan yetkisi verir ya da geri alır. Sayı sınırı yok.
 * Yalnızca takımın sahibi çağırabilir — yardımcı kaptanlar birbirinin
 * yetkisiyle oynayamasın diye.
 */
export async function setMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_member_role', {
    p_team_id: teamId,
    p_user_id: userId,
    p_role: role,
  });
  return { error: error?.message ?? null };
}

/** Üyeyi takımdan çıkarır (kaptan yetkisi olan herkes; sahip çıkarılamaz). */
export async function removeMember(
  teamId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_member', {
    p_team_id: teamId,
    p_user_id: userId,
  });
  return { error: error?.message ?? null };
}
