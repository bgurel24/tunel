// Antrenman çağrısı — "yarım saate ana gymdeyim, gelen gelsin".
// Takıma çağrı aç, üyeler geliyorum/yokum işaretlesin.

import { supabase } from '@/lib/supabase';

export type RsvpStatus = 'in' | 'out';

export type SessionPerson = { userId: string; username: string };

export type GymSession = {
  id: string;
  teamId: string;
  teamName: string;
  hostId: string;
  hostName: string;
  gym: string | null;
  note: string | null;
  startsAt: string;
  isMine: boolean;
  myStatus: RsvpStatus | null;
  going: SessionPerson[];
  outCount: number;
};

/** Çağrı başladıktan sonra bu kadar süre daha listede kalır (antrenman sürüyor sayılır). */
const STILL_ON_MS = 2 * 60 * 60 * 1000;

type Row = {
  id: string;
  team_id: string;
  user_id: string;
  gym: string | null;
  note: string | null;
  starts_at: string;
  teams: { name: string } | null;
  profiles: { username: string } | null;
  gym_session_rsvps: {
    user_id: string;
    status: RsvpStatus;
    profiles: { username: string } | null;
  }[] | null;
};

/** Üyesi olduğum takımların hâlâ geçerli çağrıları — en yakın zaman önce. */
export async function getActiveSessions(): Promise<GymSession[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', uid);

  const teamIds = (memberships ?? []).map((m) => m.team_id as string);
  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .from('gym_sessions')
    .select(
      `id, team_id, user_id, gym, note, starts_at,
       teams!gym_sessions_team_id_fkey(name),
       profiles!gym_sessions_user_id_fkey(username),
       gym_session_rsvps(user_id, status, profiles!gym_session_rsvps_user_id_fkey(username))`
    )
    .in('team_id', teamIds)
    .gte('starts_at', new Date(Date.now() - STILL_ON_MS).toISOString())
    .order('starts_at', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as Row[]).map((r) => {
    const rsvps = r.gym_session_rsvps ?? [];
    return {
      id: r.id,
      teamId: r.team_id,
      teamName: r.teams?.name ?? 'Takım',
      hostId: r.user_id,
      hostName: r.profiles?.username ?? 'birisi',
      gym: r.gym,
      note: r.note,
      startsAt: r.starts_at,
      isMine: r.user_id === uid,
      myStatus: rsvps.find((v) => v.user_id === uid)?.status ?? null,
      going: rsvps
        .filter((v) => v.status === 'in')
        .map((v) => ({ userId: v.user_id, username: v.profiles?.username ?? '?' })),
      outCount: rsvps.filter((v) => v.status === 'out').length,
    };
  });
}

export async function createSession(params: {
  teamId: string;
  startsAt: Date;
  gym: string;
  note: string;
}): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: 'Oturum bulunamadı' };

  const { data, error } = await supabase
    .from('gym_sessions')
    .insert({
      team_id: params.teamId,
      user_id: uid,
      gym: params.gym.trim() || null,
      note: params.note.trim() || null,
      starts_at: params.startsAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Çağrıyı açan zaten geliyor sayılır.
  await supabase
    .from('gym_session_rsvps')
    .upsert({ session_id: data.id, user_id: uid, status: 'in' }, { onConflict: 'session_id,user_id' });

  return { error: null };
}

/** Aynı yanıta tekrar basmak yanıtı geri alır (kararsız kalma hakkı). */
export async function setRsvp(
  sessionId: string,
  status: RsvpStatus | null
): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: 'Oturum bulunamadı' };

  if (status === null) {
    const { error } = await supabase
      .from('gym_session_rsvps')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', uid);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from('gym_session_rsvps')
    .upsert({ session_id: sessionId, user_id: uid, status }, { onConflict: 'session_id,user_id' });
  return { error: error?.message ?? null };
}

export async function deleteSession(sessionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('gym_sessions').delete().eq('id', sessionId);
  return { error: error?.message ?? null };
}
