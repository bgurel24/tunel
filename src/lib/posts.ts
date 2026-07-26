// Feed veri katmanı — Supabase bağlıysa oradan, değilse demo veriden okur.


import { avatarUrlFrom } from '@/lib/profile';
import { getMyReactions } from '@/lib/social';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/time';
import type { FeedKind, Post, PostMusic } from '@/lib/types';

const DEMO_TEAM: Post[] = [
  {
    id: 't1', authorId: '', username: 'burak_g', gym: 'Ironworks Gym', isLive: true, imageUrl: null,
    caption: 'leg day bitti, pump tavan 🔥', likeCount: 128, commentCount: 14, clapCount: 32,
    myLiked: false, myClapped: false, streakWeeks: 3,
    music: { title: 'Till I Collapse', artist: 'Eminem' }, timeLabel: 'az önce',
  },
  {
    id: 't2', authorId: '', username: 'mert_lift', gym: 'MacFit Levent', isLive: true, imageUrl: null,
    caption: 'bench 100kg ilk kez ✅', likeCount: 86, commentCount: 9, clapCount: 21,
    myLiked: false, myClapped: false, streakWeeks: 5, music: null, timeLabel: '12 dk',
  },
  {
    id: 't3', authorId: '', username: 'ece_fit', gym: null, isLive: false, imageUrl: null,
    caption: 'deadlift formu üzerine çalışıyoruz', likeCount: 54, commentCount: 6, clapCount: 11,
    myLiked: false, myClapped: false, streakWeeks: 2,
    music: { title: 'Stronger', artist: 'Kanye West' }, timeLabel: '1 sa',
  },
];

const DEMO_SOCIAL: Post[] = [
  {
    id: 's1', authorId: '', username: 'canavar_can', gym: 'Gold’s Gym', isLive: true, imageUrl: null,
    caption: 'sabah 6 antrenmanı, kim var? 💪', likeCount: 340, commentCount: 41, clapCount: 96,
    myLiked: false, myClapped: false, streakWeeks: 8,
    music: { title: "Can't Hold Us", artist: 'Macklemore' }, timeLabel: '3 dk',
  },
  {
    id: 's2', authorId: '', username: 'zeynep.pr', gym: 'Vega Fitness', isLive: false, imageUrl: null,
    caption: 'yeni PR: squat 90kg 🎉', likeCount: 212, commentCount: 27, clapCount: 63,
    myLiked: false, myClapped: false, streakWeeks: 4, music: null, timeLabel: '20 dk',
  },
];

function mapRow(row: any): Post {
  const imageUrl = row.image_path
    ? supabase.storage.from('posts').getPublicUrl(row.image_path).data.publicUrl
    : null;
  const music: PostMusic | null =
    row.music_title && row.music_artist
      ? { title: row.music_title, artist: row.music_artist }
      : null;
  const videoUrl = row.video_path
    ? supabase.storage.from('posts').getPublicUrl(row.video_path).data.publicUrl
    : null;
  return {
    id: String(row.id),
    authorId: row.user_id,
    username: row.profiles?.username ?? 'kullanıcı',
    avatarUrl: avatarUrlFrom(row.profiles?.avatar_path),
    gym: row.gym ?? null,
    workoutTag: row.workout_tag ?? null,
    isLive: !!row.is_live,
    imageUrl,
    videoUrl,
    caption: row.caption ?? null,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    clapCount: row.clap_count ?? 0,
    myLiked: false,
    myClapped: false,
    streakWeeks: null,
    music,
    timeLabel: row.created_at ? timeAgo(row.created_at) : 'yeni',
  };
}

const SELECT =
  'id, user_id, caption, image_path, video_path, is_live, gym, workout_tag, like_count, comment_count, clap_count, music_title, music_artist, created_at, profiles!posts_user_id_fkey(username, avatar_path)';

async function markReactions(posts: Post[]): Promise<Post[]> {
  const reactions = await getMyReactions(posts.map((p) => p.id));
  posts.forEach((p) => {
    p.myLiked = reactions[p.id]?.like ?? false;
    p.myClapped = reactions[p.id]?.clap ?? false;
  });
  return posts;
}

async function myTeamIds(): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data } = await supabase.from('team_members').select('team_id').eq('user_id', uid);
  return (data ?? []).map((r: any) => r.team_id);
}

export async function getFeed(kind: FeedKind): Promise<Post[]> {
  if (!isSupabaseConfigured) {
    return kind === 'takim' ? DEMO_TEAM : DEMO_SOCIAL;
  }
  const query = supabase.from('posts').select(SELECT).order('created_at', { ascending: false }).limit(50);

  if (kind === 'sosyal') {
    query.eq('shared_social', true);
  } else {
    const ids = await myTeamIds();
    if (!ids.length) return [];
    query.in('team_id', ids);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return markReactions((data as any[]).map(mapRow));
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('posts')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return markReactions((data as any[]).map(mapRow));
}

export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  return { error: error?.message ?? null };
}

export type NewPost = {
  caption: string;
  imageUri: string;
  addToSocial: boolean;
  workoutTag?: string | null;
  gym?: string | null;
  music?: PostMusic | null;
};

export async function createPost(input: NewPost): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Oturum bulunamadı.' };
  const teamId = (await myTeamIds())[0] ?? null;

  try {
    const res = await fetch(input.imageUri);
    const arrayBuffer = await res.arrayBuffer();
    const path = `${userId}/${Date.now()}.jpg`;

    const { error: upErr } = await supabase.storage
      .from('posts')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
    if (upErr) return { error: upErr.message };

    const { error: insErr } = await supabase.from('posts').insert({
      user_id: userId,
      team_id: teamId,
      image_path: path,
      caption: input.caption || null,
      workout_tag: input.workoutTag || null,
      gym: input.gym || null,
      is_live: true,
      shared_social: input.addToSocial,
      music_title: input.music?.title ?? null,
      music_artist: input.music?.artist ?? null,
    });
    if (insErr) return { error: insErr.message };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Yükleme başarısız.' };
  }
}

// Zaten yüklenmiş bir video yolundan feed paylaşımı oluşturur (görev kanıtını feed'e taşımak için).
export async function createVideoPost(
  videoPath: string,
  caption: string,
  teamId: string | null,
  addToSocial: boolean
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Oturum bulunamadı.' };
  const { error } = await supabase.from('posts').insert({
    user_id: userId,
    team_id: teamId,
    video_path: videoPath,
    caption: caption || null,
    is_live: true,
    shared_social: addToSocial,
  });
  return { error: error?.message ?? null };
}
