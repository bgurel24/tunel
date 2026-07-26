// Sosyal etkileşim — beğeni/alkış tepkileri + yorumlar (gerçek Supabase).

import { supabase } from '@/lib/supabase';

export type ReactionKind = 'like' | 'clap';

export async function getMyReactions(
  postIds: string[]
): Promise<Record<string, { like: boolean; clap: boolean }>> {
  const map: Record<string, { like: boolean; clap: boolean }> = {};
  if (!postIds.length) return map;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return map;

  const { data } = await supabase
    .from('post_reactions')
    .select('post_id, kind')
    .eq('user_id', uid)
    .in('post_id', postIds);

  (data ?? []).forEach((r: any) => {
    map[r.post_id] ??= { like: false, clap: false };
    if (r.kind === 'like') map[r.post_id].like = true;
    if (r.kind === 'clap') map[r.post_id].clap = true;
  });
  return map;
}

export async function toggleReaction(
  postId: string,
  kind: ReactionKind,
  on: boolean
): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: 'Oturum bulunamadı.' };

  if (on) {
    const { error } = await supabase
      .from('post_reactions')
      .insert({ post_id: postId, user_id: uid, kind });
    return { error: error?.message ?? null };
  }
  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', uid)
    .eq('kind', kind);
  return { error: error?.message ?? null };
}

export type Comment = { id: string; username: string; body: string };

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, body, profiles!post_comments_user_id_fkey(username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as any[]).map((c) => ({
    id: String(c.id),
    username: c.profiles?.username ?? 'kullanıcı',
    body: c.body,
  }));
}

export async function addComment(postId: string, body: string): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: uid, body: body.trim() });
  return { error: error?.message ?? null };
}
