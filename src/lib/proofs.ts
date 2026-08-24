// Bir kişinin görev kanıtları — profilde duran geçmiş.
//
// Kaptan onay ekranından karar verince kanıt oradan düşer ama buradan kalkmaz:
// kaptan kişinin profiline girip videoyu tekrar açıp izleyebilir.
//
// Görünürlük: yalnızca benimle ortak takımdaki görevlerin kanıtları. Ortak takım
// yoksa liste boş döner — başkasının takım içi kanıtı dışarı sızmasın.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isLate } from '@/lib/tasks';
import { getMyTeams } from '@/lib/teams';

export type ProofStatus = 'pending' | 'approved' | 'rejected';

export type UserProof = {
  id: string;
  taskId: string;
  taskTitle: string;
  teamId: string;
  teamName: string;
  points: number;
  status: ProofStatus;
  note: string | null;
  rejectNote: string | null;
  videoUrl: string | null;
  submittedAt: string | null;
  dueAt: string | null;
  /** Kanıt son tarihten sonra mı gitti. */
  late: boolean;
};

const SELECT =
  'id, task_id, status, note, reject_note, video_path, submitted_at, created_at, ' +
  'tasks!inner(id, title, points, due_at, team_id)';

export async function getUserProofs(userId: string, limit = 40): Promise<UserProof[]> {
  if (!isSupabaseConfigured || !userId) return [];

  const teams = await getMyTeams();
  if (teams.length === 0) return [];
  const teamNames = new Map(teams.map((t) => [t.id, t.name]));

  const { data, error } = await supabase
    .from('submissions')
    .select(SELECT)
    .eq('user_id', userId)
    .in('tasks.team_id', [...teamNames.keys()])
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as any[])
    .filter((row) => row.tasks)
    .map((row) => {
      const submittedAt = row.submitted_at ?? row.created_at ?? null;
      const dueAt = row.tasks.due_at ?? null;
      return {
        id: String(row.id),
        taskId: String(row.tasks.id),
        taskTitle: row.tasks.title,
        teamId: String(row.tasks.team_id),
        teamName: teamNames.get(String(row.tasks.team_id)) ?? '',
        points: row.tasks.points ?? 10,
        status: row.status as ProofStatus,
        note: row.note ?? null,
        rejectNote: row.status === 'rejected' ? (row.reject_note ?? null) : null,
        videoUrl: row.video_path
          ? supabase.storage.from('posts').getPublicUrl(row.video_path).data.publicUrl
          : null,
        submittedAt,
        dueAt,
        late: isLate(submittedAt, dueAt),
      };
    });
}
