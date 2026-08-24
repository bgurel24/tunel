// Kaptan paneli veri katmanı — kanıtlar (video linkli) + üye/görev ızgarası. Gerçek Supabase.
//
// Onay ekranı yalnızca BEKLEYEN kanıtları gösterir (bkz. pendingSubmissions):
// karar verilen kanıt buradan düşer, üyenin profilinde durmaya devam eder.

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
  statuses: GridStatus[];
};

export type CaptainTask = {
  id: string;
  title: string;
  points: number;
  /** Kaç üye bu görevi onaylattı — kaptan listede tek bakışta görsün. */
  approvedCount: number;
  dueAt: string | null;
  overdue: boolean;
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
    .select('id, title, points, due_at')
    .eq('team_id', teamId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  const tasks = (tasksData ?? []) as {
    id: string;
    title: string;
    points: number | null;
    due_at: string | null;
  }[];
  const taskIds = tasks.map((t) => t.id);

  const { data: membersData } = await supabase
    .from('team_members')
    .select('profiles!team_members_user_id_fkey(id, username)')
    .eq('team_id', teamId);
  const members = ((membersData ?? []) as any[])
    .filter((m) => m.profiles)
    .map((m) => ({ id: m.profiles.id as string, name: m.profiles.username as string }));

  let subs: any[] = [];
  if (taskIds.length) {
    const { data } = await supabase
      .from('submissions')
      .select(
        'id, task_id, user_id, status, note, reject_note, video_path, submitted_at, created_at, ' +
          'profiles!submissions_user_id_fkey(username)'
      )
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
        rejectNote: s.reject_note ?? null,
        status: s.status as SubStatus,
        videoUrl: s.video_path
          ? supabase.storage.from('posts').getPublicUrl(s.video_path).data.publicUrl
          : null,
        late: isLate(s.submitted_at ?? s.created_at, task?.due_at ?? null),
      };
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const memberRows: MemberRow[] = members.map((mem) => ({
    id: mem.id,
    name: mem.name,
    statuses: tasks.map((t) => {
      const sub = subs.find((s) => s.task_id === t.id && s.user_id === mem.id);
      return (sub?.status ?? 'missing') as GridStatus;
    }),
  }));

  return {
    taskCols: tasks.map((t) => t.title.slice(0, 4)),
    tasks: tasks.map((t) => ({
      id: String(t.id),
      title: t.title,
      points: t.points ?? 10,
      approvedCount: subs.filter((s) => s.task_id === t.id && s.status === 'approved').length,
      dueAt: t.due_at ?? null,
      overdue: isOverdue(t.due_at),
    })),
    memberCount: members.length,
    submissions,
    members: memberRows,
  };
}

/**
 * Kanıtı onaylar ya da reddeder. Red sebebi (rejectNote) üyenin Görevler
 * ekranında görünür — neyi düzelteceğini bilsin diye.
 */
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
