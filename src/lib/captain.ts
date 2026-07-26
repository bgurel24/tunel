// Kaptan paneli veri katmanı — kanıtlar (video linkli) + üye/görev ızgarası. Gerçek Supabase.

import { supabase } from '@/lib/supabase';

export type GridStatus = 'approved' | 'pending' | 'rejected' | 'missing';
export type SubStatus = 'pending' | 'approved' | 'rejected';

export type Submission = {
  id: string;
  member: string;
  taskTitle: string;
  note: string | null;
  status: SubStatus;
  videoUrl: string | null;
};

export type MemberRow = {
  name: string;
  statuses: GridStatus[];
};

export type CaptainData = {
  taskCols: string[];
  memberCount: number;
  submissions: Submission[];
  members: MemberRow[];
};

const ORDER: Record<SubStatus, number> = { pending: 0, approved: 1, rejected: 2 };

export async function getCaptainData(teamId: string): Promise<CaptainData> {
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });
  const tasks = (tasksData ?? []) as { id: string; title: string }[];
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
      .select('id, task_id, user_id, status, note, video_path, profiles!submissions_user_id_fkey(username)')
      .in('task_id', taskIds);
    subs = data ?? [];
  }

  const submissions: Submission[] = subs
    .map((s) => ({
      id: String(s.id),
      member: s.profiles?.username ?? '—',
      taskTitle: tasks.find((t) => t.id === s.task_id)?.title ?? 'Görev',
      note: s.note ?? null,
      status: s.status as SubStatus,
      videoUrl: s.video_path
        ? supabase.storage.from('posts').getPublicUrl(s.video_path).data.publicUrl
        : null,
    }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const memberRows: MemberRow[] = members.map((mem) => ({
    name: mem.name,
    statuses: tasks.map((t) => {
      const sub = subs.find((s) => s.task_id === t.id && s.user_id === mem.id);
      return (sub?.status ?? 'missing') as GridStatus;
    }),
  }));

  return {
    taskCols: tasks.map((t) => t.title.slice(0, 4)),
    memberCount: members.length,
    submissions,
    members: memberRows,
  };
}

export async function decideSubmission(
  id: string,
  approve: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('submissions')
    .update({ status: approve ? 'approved' : 'rejected' })
    .eq('id', id);
  return { error: error?.message ?? null };
}
