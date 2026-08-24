// Görev veri katmanı — takım görevleri + kanıt (submission). Gerçek Supabase.
//
// Görevler haftalık: her görevin son tarihi vardır (verildiği an + 7 gün, kaptan
// uzatabilir). Süre dolunca görev kapanmaz — kanıt yine yüklenebilir ama "geç"
// sayılır ve haftalık raporda öyle görünür.

import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { removeOrphanFiles } from '@/lib/storage';
import { extFor, uploadToStorage } from '@/lib/upload';

export type SubmissionStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Görev verildikten sonraki süre — tek yerden değişsin. */
export const TASK_WEEK_DAYS = 7;

export function defaultDueAt(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + TASK_WEEK_DAYS);
  return d.toISOString();
}

export type TeamTask = {
  id: string;
  title: string;
  points: number;
  myStatus: SubmissionStatus;
  /** Kaptan reddettiyse sebebi — üye neyi düzelteceğini bilsin. */
  rejectNote: string | null;
  /** Görevin son tarihi. Eski kayıtlarda boş olabilir. */
  dueAt: string | null;
  /** Son tarih geçti mi (kanıt verilmiş olsun olmasın). */
  overdue: boolean;
  /** Kanıtım son tarihten sonra mı gitti. */
  submittedLate: boolean;
};

export function isOverdue(dueAt: string | null | undefined): boolean {
  return !!dueAt && new Date(dueAt).getTime() < Date.now();
}

/** Kanıt son tarihten sonra geldiyse geç sayılır. */
export function isLate(submittedAt: string | null | undefined, dueAt: string | null | undefined) {
  if (!submittedAt || !dueAt) return false;
  return new Date(submittedAt).getTime() > new Date(dueAt).getTime();
}

export async function getTeamTasks(teamId: string, userId: string): Promise<TeamTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, points, due_at, submissions(user_id, status, reject_note, submitted_at)')
    .eq('team_id', teamId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const mine = (row.submissions ?? []).find((s: any) => s.user_id === userId);
    const dueAt = row.due_at ?? null;
    return {
      id: String(row.id),
      title: row.title,
      points: row.points ?? 10,
      myStatus: (mine?.status ?? 'none') as SubmissionStatus,
      rejectNote: mine?.status === 'rejected' ? (mine.reject_note ?? null) : null,
      dueAt,
      overdue: isOverdue(dueAt),
      submittedLate: !!mine && isLate(mine.submitted_at, dueAt),
    };
  });
}

export async function createTask(
  teamId: string,
  title: string,
  points = 10,
  dueAt: string = defaultDueAt()
): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('tasks').insert({
    team_id: teamId,
    title: title.trim(),
    points,
    due_at: dueAt,
    created_by: u.user?.id,
  });
  return { error: error?.message ?? null };
}

/**
 * Süreyi bugünden itibaren bir hafta ileri atar. Süresi dolmuş göreve ikinci bir
 * hafta vermek için — geçmiş bir tarihe 7 gün eklemek işe yaramazdı.
 */
export async function extendTask(
  taskId: string,
  days = TASK_WEEK_DAYS
): Promise<{ error: string | null; dueAt: string | null }> {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const iso = d.toISOString();
  const { error } = await supabase.from('tasks').update({ due_at: iso }).eq('id', taskId);
  return { error: error?.message ?? null, dueAt: error ? null : iso };
}

/**
 * Görevi ve ona yüklenmiş kanıtları siler.
 *
 * Dosyalar görev silinmeden ÖNCE temizleniyor: görev gidince submissions
 * satırları cascade ile siliniyor ve kaptanın depolamadaki silme yetkisi
 * (o satırlar üzerinden tanımlı) ortadan kalkıyor — sonra silmeye çalışsak
 * dosyalar öksüz kalırdı.
 */
export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  const { data: subs } = await supabase
    .from('submissions')
    .select('video_path')
    .eq('task_id', taskId);

  const paths = ((subs ?? []) as any[]).map((s) => s.video_path as string | null);

  // Feed'e de paylaşılmış kanıtların dosyası kalır — orayı bozmayalım.
  const stillUsed = new Set<string>();
  const adaylar = paths.filter((p): p is string => !!p);
  if (adaylar.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('video_path')
      .in('video_path', adaylar);
    for (const p of (posts ?? []) as any[]) if (p.video_path) stillUsed.add(p.video_path);

    const silinecek = adaylar.filter((p) => !stillUsed.has(p));
    if (silinecek.length > 0) {
      // Temizlik başarısız olsa da görev silme devam etsin.
      try {
        await supabase.storage.from('posts').remove(silinecek);
      } catch {
        /* sessiz */
      }
    }
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return { error: error?.message ?? null };
}

/**
 * Videoyu 'posts' bucket'ına yükler, storage yolunu döner (bir kez yükle, hem
 * kanıt hem paylaşım için kullan).
 *
 * `mimeType` seçiciden gelir. Eskiden her dosya `.mp4` / `video/mp4` diye
 * yazılıyordu; iPhone `.mov` çektiği için tarayıcıda oynatma bozuluyordu.
 */
export async function uploadVideo(
  uri: string,
  mimeType?: string | null
): Promise<{ path: string | null; error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { path: null, error: t('err.noSession') };

  const type = mimeType || 'video/mp4';
  const path = `${uid}/proof_${Date.now()}.${extFor(type, 'mp4')}`;

  const { error } = await uploadToStorage(uri, path, type);
  return error ? { path: null, error } : { path, error: null };
}

// Yüklenmiş video yolundan submission kaydı (pending).
export async function submitProof(
  taskId: string,
  videoPath: string,
  note: string
): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: t('err.noSession') };

  // Reddedilen kanıtın yeniden yüklenmesinde eski video kayıtta yerini yenisine
  // bırakıyor; temizlemezsek depolamada öksüz kalırdı.
  const { data: onceki } = await supabase
    .from('submissions')
    .select('video_path')
    .eq('task_id', taskId)
    .eq('user_id', uid)
    .maybeSingle();

  const { error } = await supabase.from('submissions').upsert(
    { task_id: taskId, user_id: uid, video_path: videoPath, note: note || null, status: 'pending' },
    { onConflict: 'task_id,user_id' }
  );
  if (error) return { error: error.message };

  const eski = (onceki as any)?.video_path as string | undefined;
  if (eski && eski !== videoPath) await removeOrphanFiles([eski]);

  return { error: null };
}
