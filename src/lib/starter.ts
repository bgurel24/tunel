// Yeni kullanıcının kurulum durumu — feed bomboş açılmasın, ne yapacağını görsün.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type StarterState = {
  hasTeam: boolean;
  hasAvatar: boolean;
  hasPost: boolean;
  /** Hepsi tamamsa liste tamamen gizlenir. */
  done: boolean;
};

const ALL_DONE: StarterState = { hasTeam: true, hasAvatar: true, hasPost: true, done: true };

export async function getStarterState(): Promise<StarterState> {
  if (!isSupabaseConfigured) return ALL_DONE;

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return ALL_DONE;

  const [teams, profile, posts] = await Promise.all([
    supabase.from('team_members').select('team_id', { count: 'exact', head: true }).eq('user_id', uid),
    supabase.from('profiles').select('avatar_path').eq('id', uid).single(),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', uid),
  ]);

  const state = {
    hasTeam: (teams.count ?? 0) > 0,
    hasAvatar: !!profile.data?.avatar_path,
    hasPost: (posts.count ?? 0) > 0,
  };

  return { ...state, done: state.hasTeam && state.hasAvatar && state.hasPost };
}
