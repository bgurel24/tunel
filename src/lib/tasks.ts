// Görev veri katmanı — takım görevleri + kanıt (submission). Gerçek Supabase.

import { supabase } from '@/lib/supabase';

export type SubmissionStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type TeamTask = {
  id: string;
  title: string;
  points: number;
  myStatus: SubmissionStatus;
};

export async function getTeamTasks(teamId: string, userId: string): Promise<TeamTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, points, submissions(user_id, status)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((t) => {
    const mine = (t.submissions ?? []).find((s: any) => s.user_id === userId);
    return {
      id: String(t.id),
      title: t.title,
      points: t.points ?? 10,
      myStatus: (mine?.status ?? 'none') as SubmissionStatus,
    };
  });
}

export async function createTask(
  teamId: string,
  title: string,
  points = 10
): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('tasks').insert({
    team_id: teamId,
    title: title.trim(),
    points,
    created_by: u.user?.id,
  });
  return { error: error?.message ?? null };
}

export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return { error: error?.message ?? null };
}

// Videoyu 'posts' bucket'ına yükler, storage yolunu döner (bir kez yükle, hem kanıt hem paylaşım için kullan).
export async function uploadVideo(
  uri: string
): Promise<{ path: string | null; error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { path: null, error: 'Oturum bulunamadı.' };
  try {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    const path = `${uid}/proof_${Date.now()}.mp4`;
    const { error } = await supabase.storage
      .from('posts')
      .upload(path, buf, { contentType: 'video/mp4', upsert: false });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : 'Video yüklenemedi.' };
  }
}

// Yüklenmiş video yolundan submission kaydı (pending).
export async function submitProof(
  taskId: string,
  videoPath: string,
  note: string
): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.from('submissions').upsert(
    { task_id: taskId, user_id: uid, video_path: videoPath, note: note || null, status: 'pending' },
    { onConflict: 'task_id,user_id' }
  );
  return { error: error?.message ?? null };
}
