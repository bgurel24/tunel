// Takım sohbeti veri katmanı — mesajlar + canlı (realtime) abonelik.
// Sadece takım üyeleri okuyup yazabilir; kuralı veritabanı (RLS) uygular.

import { displayName } from '@/lib/names';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string; // ISO
  isMine: boolean;
};

const PAGE = 60;

export async function getMessages(teamId: string): Promise<ChatMessage[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;

  const { data, error } = await supabase
    .from('team_messages')
    .select('id, user_id, body, created_at, profiles!team_messages_user_id_fkey(username, full_name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(PAGE);

  if (error || !data) return [];

  return (data as any[]).map((m) => ({
    id: String(m.id),
    userId: m.user_id,
    username: displayName(m.profiles, 'kullanıcı'),
    body: m.body,
    createdAt: m.created_at,
    isMine: m.user_id === uid,
  }));
}

export async function sendMessage(teamId: string, body: string): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return { error: t('err.noSession') };

  const text = body.trim();
  if (!text) return { error: null };

  const { error } = await supabase
    .from('team_messages')
    .insert({ team_id: teamId, user_id: uid, body: text.slice(0, 1000) });
  return { error: error?.message ?? null };
}

/**
 * Yeni mesajları canlı dinler; aboneliği kesen fonksiyonu döner.
 * Kullanıcı adını ayrıca çeker (realtime yükünde join yoktur).
 */
export function subscribeMessages(
  teamId: string,
  onNew: (msg: ChatMessage) => void
): () => void {
  let uid: string | null = null;
  supabase.auth.getUser().then(({ data }) => {
    uid = data.user?.id ?? null;
  });

  const channel = supabase
    .channel(`team-chat-${teamId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
      async (payload) => {
        const row = payload.new as any;
        let username = 'kullanıcı';
        const { data } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', row.user_id)
          .single();
        if (data) username = displayName(data, 'kullanıcı');
        onNew({
          id: String(row.id),
          userId: row.user_id,
          username,
          body: row.body,
          createdAt: row.created_at,
          isMine: row.user_id === uid,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
