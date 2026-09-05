// Kaptan paneli veri katmanı — kanıtlar (video linkli) + üye/görev ızgarası. Gerçek Supabase.

import { supabase } from '@/lib/supabase';
import { isLate, isOverdue } from '@/lib/tasks';

export type GridStatus = 'approved' | 'pending' | 'rejected' | 'missing';
export type SubStatus = 'pending' | 'approved' | 'rejected';

export type Submission = {
  id: string;
  /** Üyenin profiline gitmek için — kaptan videoyu sonra oradan da izler. */
  memberId: string | null;
  member: string;
  taskTitle: string;
  note: string | null;
  status: SubStatus;
  videoUrl: string | null;
  /** Reddedildiyse kaptanın yazdığı sebep. */
  rejectNote: string | null;
  /** Kanıt son tarihten sonra mı geldi. */
  late: boolean;
};

export type MemberRow = {
  id: string;
  name: string;
  isRookie: boolean;
  statuses: GridStatus[];
};

export type CaptainTask = {
  id: string;
  title: string;
  points: number;
  /** Kaç üye bu görevi onaylattı — kaptan listede tek bakışta görsün. */
  approvedCount: number;
  /** Kişiye özel atananların id listesi; null = tüm takım. */
  assignedTo: string[] | null;
  dueAt: string | null;
  /** Son tarih geçti mi. */
  overdue: boolean;
  /** Görevden sorumlu üyelerin durum satırları (atama varsa yalnız onlar). */
  rows: { userId: string; name: string; isRookie: boolean; status: GridStatus; submissionId: string | null; videoUrl: string | null }[];
};

export type CaptainData = {
  taskCols: string[];
  tasks: CaptainTask[];
  memberCount: number;
  submissions: Submission[];
  members: MemberRow[];
};

const ORDER: Record<SubStatus, number> = { pending: 0, approved: 1, rejected: 2 };

export async function getCaptainData(teamId: string): Promise<CaptainData> {
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title, points, assigned_to, due_at')
    .eq('team_id', teamId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  const tasks = (tasksData ?? []) as {
    id: string;
    title: string;
    points: number | null;
    assigned_to: string[] | null;
    due_at: string | null;
  }[];
  const taskIds = tasks.map((t) => t.id);

  const { data: membersData } = await supabase
    .from('team_members')
    .select('is_rookie, profiles!team_members_user_id_fkey(id, username)')
    .eq('team_id', teamId);
  const members = ((membersData ?? []) as any[])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.profiles.id as string,
      name: m.profiles.username as string,
      isRookie: !!m.is_rookie,
    }));

  let subs: any[] = [];
  if (taskIds.length) {
    const { data } = await supabase
      .from('submissions')
      .select('id, task_id, user_id, status, note, reject_note, submitted_at, video_path, profiles!submissions_user_id_fkey(username)')
      .in('task_id', taskIds);
    subs = data ?? [];
  }

  const submissions: Submission[] = subs
    .map((s) => {
      const task = tasks.find((t) => t.id === s.task_id);
      return {
        id: String(s.id),
        memberId: s.user_id ? String(s.user_id) : null,
        member: s.profiles?.username ?? '—',
        taskTitle: task?.title ?? 'Görev',
        note: s.note ?? null,
        status: s.status as SubStatus,
        videoUrl: s.video_path
          ? supabase.storage.from('posts').getPublicUrl(s.video_path).data.publicUrl
          : null,
        rejectNote: s.reject_note ?? null,
        late: isLate(s.submitted_at ?? s.created_at, task?.due_at ?? null),
      };
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const memberRows: MemberRow[] = members.map((mem) => ({
    id: mem.id,
    name: mem.name,
    isRookie: mem.isRookie,
    statuses: tasks.map((t) => {
      const sub = subs.find((s) => s.task_id === t.id && s.user_id === mem.id);
      return (sub?.status ?? 'missing') as GridStatus;
    }),
  }));

  return {
    taskCols: tasks.map((t) => t.title.slice(0, 4)),
    tasks: tasks.map((t) => {
      const responsible = t.assigned_to?.length
        ? members.filter((m) => t.assigned_to!.includes(m.id))
        : members;
      return {
        id: String(t.id),
        title: t.title,
        points: t.points ?? 10,
        approvedCount: subs.filter((s) => s.task_id === t.id && s.status === 'approved').length,
        assignedTo: t.assigned_to?.length ? t.assigned_to : null,
        dueAt: t.due_at ?? null,
        overdue: isOverdue(t.due_at),
        rows: responsible.map((m) => {
          const sub = subs.find((s) => s.task_id === t.id && s.user_id === m.id);
          return {
            userId: m.id,
            name: m.name,
            isRookie: m.isRookie,
            status: (sub?.status ?? 'missing') as GridStatus,
            submissionId: sub ? String(sub.id) : null,
            videoUrl: sub?.video_path
              ? supabase.storage.from('posts').getPublicUrl(sub.video_path).data.publicUrl
              : null,
          };
        }),
      };
    }),
    memberCount: members.length,
    submissions,
    members: memberRows,
  };
}

export async function decideSubmission(
  id: string,
  approve: boolean,
  rejectNote?: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('submissions')
    .update({
      status: approve ? 'approved' : 'rejected',
      reject_note: approve ? null : rejectNote?.trim() || null,
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}


// ========== Takım aktivitesi: üye başına seri ve son aktivite ==========
// "Aktivite" = paylaşım VEYA onaylı görev kanıtı olan gün.

export type MemberActivity = {
  userId: string;
  name: string;
  isRookie: boolean;
  /** Güncel seri (bugün ya da dün aktifse devam ediyor sayılır). */
  streak: number;
  /** Son aktiviteden bu yana geçen gün; hiç aktivite yoksa null. */
  daysSince: number | null;
  lastActive: string | null; // YYYY-MM-DD
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function streakOf(days: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const key = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  // Seri bugün ya da dünden başlayabilir.
  const start = new Date(today);
  if (!days.has(key(start))) start.setDate(start.getDate() - 1);
  if (!days.has(key(start))) return 0;
  let run = 0;
  const cur = new Date(start);
  while (days.has(key(cur))) {
    run += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return run;
}

export async function getTeamActivity(teamId: string): Promise<MemberActivity[]> {
  const { data: membersData } = await supabase
    .from('team_members')
    .select('is_rookie, profiles!team_members_user_id_fkey(id, username)')
    .eq('team_id', teamId);
  const members = ((membersData ?? []) as any[])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.profiles.id as string,
      name: m.profiles.username as string,
      isRookie: !!m.is_rookie,
    }));
  if (!members.length) return [];
  const ids = members.map((m) => m.id);

  const [postsRes, subsRes] = await Promise.all([
    supabase.from('posts').select('user_id, created_at').in('user_id', ids),
    supabase
      .from('submissions')
      .select('user_id, created_at')
      .in('user_id', ids)
      .eq('status', 'approved'),
  ]);

  const daysByUser = new Map<string, Set<string>>();
  for (const r of [...(postsRes.data ?? []), ...(subsRes.data ?? [])] as any[]) {
    const set = daysByUser.get(r.user_id) ?? new Set<string>();
    set.add(dayKey(r.created_at));
    daysByUser.set(r.user_id, set);
  }

  const todayMs = new Date().setHours(0, 0, 0, 0);
  return members
    .map((m) => {
      const days = daysByUser.get(m.id) ?? new Set<string>();
      const last = days.size ? [...days].sort().at(-1)! : null;
      const daysSince = last
        ? Math.max(0, Math.round((todayMs - new Date(last).setHours(0, 0, 0, 0)) / 86400000))
        : null;
      return {
        userId: m.id,
        name: m.name,
        isRookie: m.isRookie,
        streak: streakOf(days),
        daysSince,
        lastActive: last,
      };
    })
    .sort((a, b) => b.streak - a.streak || (a.daysSince ?? 999) - (b.daysSince ?? 999));
}

// ========== Üye analizi (kaptan görünümü) ==========

export type MemberAnalysis = {
  days: string[]; // aktif günler (YYYY-MM-DD) — ısı haritası için
  streak: number;
  longest: number;
  monthCount: number; // bu takvim ayındaki aktif gün sayısı
  lastActive: string | null;
  daysSince: number | null;
};

export async function getMemberAnalysis(userId: string): Promise<MemberAnalysis> {
  const [postsRes, subsRes] = await Promise.all([
    supabase.from('posts').select('created_at').eq('user_id', userId),
    supabase
      .from('submissions')
      .select('created_at')
      .eq('user_id', userId)
      .eq('status', 'approved'),
  ]);

  const days = new Set<string>();
  for (const r of [...(postsRes.data ?? []), ...(subsRes.data ?? [])] as any[]) {
    days.add(dayKey(r.created_at));
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && (new Date(d).getTime() - new Date(prev).getTime()) / 86400000 === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthCount = sorted.filter((d) => d.startsWith(monthPrefix)).length;

  const last = sorted.at(-1) ?? null;
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const daysSince = last
    ? Math.max(0, Math.round((todayMs - new Date(last).setHours(0, 0, 0, 0)) / 86400000))
    : null;

  return { days: sorted, streak: streakOf(days), longest, monthCount, lastActive: last, daysSince };
}
