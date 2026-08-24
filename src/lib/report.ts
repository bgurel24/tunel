// Haftalık rapor — hafta bitince kim görevini yaptı, kim yarım bıraktı, kim hiç
// kımıldamadı. Kaptan panelindeki "Rapor" sekmesi bunu gösterir.
//
// Hafta = Pazartesi 00:00'dan Pazar 23:59'a. Bir görev, SON TARİHİ o haftanın
// içinde kalıyorsa o haftanın görevidir (görevler kişiye verildiği an + 7 gün
// aldığı için hafta ortasında verilen görev bir sonraki haftaya düşebilir).

import { avatarUrlFrom } from '@/lib/profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isLate } from '@/lib/tasks';
import { weekRangeLabel, weekStart } from '@/lib/time';

/** full: hepsini onaylattı · partial: yarım · none: hiç kımıldamadı */
export type MemberReportStatus = 'full' | 'partial' | 'none';

export type MemberReport = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Haftanın görev sayısı (herkes için aynı). */
  total: number;
  done: number;
  pending: number;
  rejected: number;
  missing: number;
  /** Son tarihten sonra yüklenen kanıt sayısı. */
  late: number;
  /** Hiç kanıt gelmeyen görevlerin adları — kaptan neyi soracağını bilsin. */
  missedTitles: string[];
  status: MemberReportStatus;
};

export type WeeklyReport = {
  /** Haftanın Pazartesi'si (ISO). */
  weekStart: string;
  rangeLabel: string;
  taskCount: number;
  /** Hafta kapandı mı — açık haftada "yapmadı" değil "henüz yapmadı". */
  closed: boolean;
  members: MemberReport[];
};

function emptyReport(offset: number): WeeklyReport {
  const start = weekStart(offset);
  return {
    weekStart: start.toISOString(),
    rangeLabel: weekRangeLabel(start),
    taskCount: 0,
    closed: offset < 0,
    members: [],
  };
}

/** offset 0 = bu hafta, -1 = geçen hafta, -2 = ondan önceki… */
export async function getWeeklyReport(teamId: string, offset = 0): Promise<WeeklyReport> {
  if (!isSupabaseConfigured || !teamId) return emptyReport(offset);

  const start = weekStart(offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const [{ data: tasksData }, { data: membersData }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, due_at')
      .eq('team_id', teamId)
      .gte('due_at', start.toISOString())
      .lt('due_at', end.toISOString())
      .order('due_at', { ascending: true }),
    supabase
      .from('team_members')
      .select('profiles!team_members_user_id_fkey(id, username, avatar_path)')
      .eq('team_id', teamId),
  ]);

  const tasks = ((tasksData ?? []) as any[]).map((t) => ({
    id: String(t.id),
    title: t.title as string,
    dueAt: (t.due_at ?? null) as string | null,
  }));

  const members = ((membersData ?? []) as any[])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: String(m.profiles.id),
      name: m.profiles.username as string,
      avatarUrl: avatarUrlFrom(m.profiles.avatar_path),
    }));

  let subs: any[] = [];
  if (tasks.length > 0) {
    const { data } = await supabase
      .from('submissions')
      .select('task_id, user_id, status, submitted_at, created_at')
      .in(
        'task_id',
        tasks.map((t) => t.id)
      );
    subs = data ?? [];
  }

  const rows: MemberReport[] = members.map((mem) => {
    let done = 0;
    let pending = 0;
    let rejected = 0;
    let late = 0;
    const missedTitles: string[] = [];

    for (const task of tasks) {
      const sub = subs.find((s) => String(s.task_id) === task.id && String(s.user_id) === mem.id);
      if (!sub) {
        missedTitles.push(task.title);
        continue;
      }
      if (sub.status === 'approved') done++;
      else if (sub.status === 'pending') pending++;
      else rejected++;
      if (isLate(sub.submitted_at ?? sub.created_at, task.dueAt)) late++;
    }

    const touched = done + pending + rejected;
    const status: MemberReportStatus =
      tasks.length > 0 && done === tasks.length ? 'full' : touched === 0 ? 'none' : 'partial';

    return {
      userId: mem.id,
      name: mem.name,
      avatarUrl: mem.avatarUrl,
      total: tasks.length,
      done,
      pending,
      rejected,
      missing: missedTitles.length,
      late,
      missedTitles,
      status,
    };
  });

  // Kötü durumdan iyiye: kaptan kimi dürteceğini en üstte görsün.
  rows.sort((a, b) => b.missing - a.missing || a.done - b.done || a.name.localeCompare(b.name));

  return {
    weekStart: start.toISOString(),
    rangeLabel: weekRangeLabel(start),
    taskCount: tasks.length,
    closed: end.getTime() <= Date.now(),
    members: rows,
  };
}
