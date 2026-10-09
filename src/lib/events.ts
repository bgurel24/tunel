// Etkinlik / katılım (yoklama) altyapısı — supabase/faz9_etkinlik_katilim.sql.
//
// Bugün koçların açtığı idmanlar ('training') için kullanılıyor; maç ve diğer
// etkinlikler ('match', 'event') aynı tablo ve aynı katılım akışıyla çalışır.
// Yetki sunucuda: etkinliği yalnızca takımın koçu açar/düzenler/siler, herkes
// yalnızca kendi cevabını yazar (RLS).

import { avatarUrlFrom } from '@/lib/profile';
import { displayName } from '@/lib/names';
import { getPrefs } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';

export type EventKind = 'training' | 'match' | 'event';
export type AttendanceStatus = 'going' | 'not_going' | 'maybe';

export type TeamEvent = {
  id: string;
  teamId: string;
  teamName: string;
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  rsvpDeadline: string | null;
  /** Ben bu takımın koçu muyum (düzenle/sil/yoklama). */
  amCoach: boolean;
  myStatus: AttendanceStatus | null;
  counts: Record<AttendanceStatus, number>;
};

export type AttendancePerson = {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  status: AttendanceStatus | null;
  late: boolean;
  updatedAt: string | null;
};

export type EventDetail = TeamEvent & {
  /** Takımın sporcuları (koçlar hariç) — cevap vermeyenler status=null. */
  people: AttendancePerson[];
};

export type AttendanceStat = {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  going: number;
  notGoing: number;
  maybe: number;
  noResponse: number;
  late: number;
  /** Yüzde (0–100); hiç etkinlik yoksa null. */
  rate: number | null;
};

/** Etkinlik bittikten sonra bu kadar süre daha "yaklaşan" listesinde kalır. */
const DEFAULT_LENGTH_MS = 3 * 60 * 60 * 1000;

const EVENT_SELECT =
  'id, team_id, kind, title, starts_at, ends_at, location, description, rsvp_deadline, ' +
  'teams!events_team_id_fkey(name), event_attendance(user_id, status)';

async function myContext() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  if (!uid) return { uid: null, roles: new Map<string, string>() };
  const { data } = await supabase.from('team_members').select('team_id, role').eq('user_id', uid);
  const roles = new Map<string, string>();
  (data ?? []).forEach((r: any) => roles.set(r.team_id, r.role));
  return { uid, roles };
}

function emptyCounts(): Record<AttendanceStatus, number> {
  return { going: 0, not_going: 0, maybe: 0 };
}

function mapEvent(row: any, uid: string, roles: Map<string, string>): TeamEvent {
  const att = (row.event_attendance ?? []) as { user_id: string; status: AttendanceStatus }[];
  const counts = emptyCounts();
  att.forEach((a) => {
    counts[a.status] += 1;
  });
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.teams?.name ?? t('events.team'),
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    description: row.description,
    rsvpDeadline: row.rsvp_deadline,
    amCoach: roles.get(row.team_id) === 'coach',
    myStatus: att.find((a) => a.user_id === uid)?.status ?? null,
    counts,
  };
}

/** Etkinlik bitti mi (bitiş yoksa başlangıç + 3 saat). */
export function isOver(e: Pick<TeamEvent, 'startsAt' | 'endsAt'>): boolean {
  const end = e.endsAt ? new Date(e.endsAt).getTime() : new Date(e.startsAt).getTime() + DEFAULT_LENGTH_MS;
  return end <= Date.now();
}

/** Son bildirim zamanı geçti mi. */
export function isPastDeadline(e: Pick<TeamEvent, 'rsvpDeadline'>): boolean {
  return !!e.rsvpDeadline && new Date(e.rsvpDeadline).getTime() < Date.now();
}

/** Üye olduğum takımların etkinlikleri. upcoming: bitmemişler (yakın önce), past: bitenler (yeni önce). */
export async function getEvents(
  scope: 'upcoming' | 'past',
  opts: { teamId?: string; limit?: number } = {}
): Promise<TeamEvent[]> {
  const { uid, roles } = await myContext();
  if (!uid || roles.size === 0) return [];
  const teamIds = opts.teamId ? [opts.teamId] : [...roles.keys()];
  const pivot = new Date(Date.now() - DEFAULT_LENGTH_MS).toISOString();

  let q = supabase.from('events').select(EVENT_SELECT).in('team_id', teamIds);
  q =
    scope === 'upcoming'
      ? q.gte('starts_at', pivot).order('starts_at', { ascending: true })
      : q.lt('starts_at', pivot).order('starts_at', { ascending: false });
  const { data, error } = await q.limit(opts.limit ?? 50);
  if (error || !data) return [];
  return (data as any[]).map((r) => mapEvent(r, uid, roles)).filter((e) =>
    scope === 'upcoming' ? !isOver(e) : true
  );
}

/** Ana sayfadaki "Sonraki idman" kartı için en yakın, bitmemiş etkinlik. */
export async function getNextEvent(): Promise<TeamEvent | null> {
  const list = await getEvents('upcoming', { limit: 5 });
  return list[0] ?? null;
}

/** Koç olduğum takımlar (idman açma / istatistik girişleri için). */
export async function getCoachTeamIds(): Promise<string[]> {
  const { roles } = await myContext();
  return [...roles.entries()].filter(([, r]) => r === 'coach').map(([id]) => id);
}

export async function getEventDetail(id: string): Promise<EventDetail | null> {
  const { uid, roles } = await myContext();
  if (!uid) return null;

  const { data, error } = await supabase
    .from('events')
    .select(
      'id, team_id, kind, title, starts_at, ends_at, location, description, rsvp_deadline, ' +
        'teams!events_team_id_fkey(name), ' +
        'event_attendance(user_id, status, late, updated_at)'
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;

  const base = mapEvent(data, uid, roles);
  const { data: members } = await supabase
    .from('team_members')
    .select('role, profiles!team_members_user_id_fkey(id, username, full_name, avatar_path)')
    .eq('team_id', base.teamId);

  const att = new Map<string, any>();
  ((data as any).event_attendance ?? []).forEach((a: any) => att.set(a.user_id, a));

  const people: AttendancePerson[] = ((members ?? []) as any[])
    .filter((m) => m.profiles && m.role !== 'coach')
    .map((m) => {
      const a = att.get(m.profiles.id);
      return {
        userId: m.profiles.id,
        name: displayName(m.profiles),
        username: m.profiles.username,
        avatarUrl: avatarUrlFrom(m.profiles.avatar_path),
        status: (a?.status as AttendanceStatus) ?? null,
        late: !!a?.late,
        updatedAt: a?.updated_at ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, getPrefs().lang === 'tr' ? 'tr' : 'en'));

  return { ...base, people };
}

/** Kendi cevabım. null → cevabı geri al. */
export async function setAttendance(
  eventId: string,
  status: AttendanceStatus | null
): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: t('err.noSession') };

  if (status === null) {
    const { error } = await supabase
      .from('event_attendance')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', uid);
    return { error: error ? friendly(error.message) : null };
  }
  const { error } = await supabase
    .from('event_attendance')
    .upsert({ event_id: eventId, user_id: uid, status }, { onConflict: 'event_id,user_id' });
  return { error: error ? friendly(error.message) : null };
}

export type EventInput = {
  teamId: string;
  kind: EventKind;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string;
  description: string;
  rsvpDeadline: Date | null;
};

function toRow(input: EventInput) {
  return {
    team_id: input.teamId,
    kind: input.kind,
    title: input.title.trim(),
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt?.toISOString() ?? null,
    location: input.location.trim() || null,
    description: input.description.trim() || null,
    rsvp_deadline: input.rsvpDeadline?.toISOString() ?? null,
  };
}

export async function createEvent(input: EventInput): Promise<{ id: string | null; error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { id: null, error: t('err.noSession') };
  const { data, error } = await supabase
    .from('events')
    .insert({ ...toRow(input), created_by: uid })
    .select('id')
    .single();
  if (error) return { id: null, error: friendly(error.message) };
  return { id: data.id as string, error: null };
}

export async function updateEvent(id: string, input: EventInput): Promise<{ error: string | null }> {
  const { team_id: _team, ...row } = toRow(input);
  const { data, error } = await supabase.from('events').update(row).eq('id', id).select('id');
  if (error) return { error: friendly(error.message) };
  if (!data || data.length === 0) return { error: t('events.coachOnly') };
  return { error: null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');
  if (error) return { error: friendly(error.message) };
  if (!data || data.length === 0) return { error: t('events.coachOnly') };
  return { error: null };
}

/** Koç için sporcu bazında katılım özeti (geçmiş etkinlikler). */
export async function getAttendanceStats(
  teamId: string,
  kind: EventKind | null = 'training'
): Promise<{ rows: AttendanceStat[]; error: string | null }> {
  const { data, error } = await supabase.rpc('event_attendance_stats', {
    p_team_id: teamId,
    p_kind: kind,
  });
  if (error) return { rows: [], error: friendly(error.message) };
  const stats = (data ?? []) as any[];
  if (stats.length === 0) return { rows: [], error: null };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_path')
    .in('id', stats.map((s) => s.user_id));
  const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

  const rows = stats
    .map((s) => {
      const p = byId.get(s.user_id);
      return {
        userId: s.user_id,
        name: displayName(p),
        username: p?.username ?? '',
        avatarUrl: avatarUrlFrom(p?.avatar_path),
        total: s.total,
        going: s.going,
        notGoing: s.not_going,
        maybe: s.maybe,
        noResponse: s.no_response,
        late: s.late,
        rate: s.rate === null ? null : Number(s.rate),
      };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || a.name.localeCompare(b.name));
  return { rows, error: null };
}

/** Koç yoklama ekranındayken cevaplar anında düşsün. Dönen fonksiyon aboneliği kapatır. */
export function subscribeAttendance(eventId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`event-attendance-${eventId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_attendance', filter: `event_id=eq.${eventId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

function friendly(message: string): string {
  if (message.includes('row-level security')) return t('events.notAllowed');
  if (message.includes('events_end_after_start')) return t('events.endBeforeStart');
  if (message.includes('events_deadline_before_start')) return t('events.deadlineAfterStart');
  return message;
}

// ---------- Biçimlendirme ----------

const LOCALE = { tr: 'tr-TR', en: 'en-US' } as const;

/** "Salı, 13 Ekim" */
export function eventDayLabel(iso: string): string {
  const locale = LOCALE[getPrefs().lang];
  return new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "20:00 – 22:00" ya da "20:00" */
export function eventTimeRange(e: Pick<TeamEvent, 'startsAt' | 'endsAt'>): string {
  const locale = LOCALE[getPrefs().lang];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return e.endsAt ? `${fmt(e.startsAt)} – ${fmt(e.endsAt)}` : fmt(e.startsAt);
}

/** "13 Eki 15:00" */
export function shortDateTime(iso: string): string {
  const locale = LOCALE[getPrefs().lang];
  const d = new Date(iso);
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
