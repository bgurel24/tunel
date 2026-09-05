// Tünel — Expo push gönderici (Supabase Edge Function)
//
// Ne yapar: notifications tablosunda pushed_at boş olan satırları alır, alıcının
// push_tokens kaydına bakar, Expo Push API'sine yollar, sonra pushed_at damgalar.
//
// KURULUM
//   supabase functions deploy push --no-verify-jwt
//   supabase secrets set CRON_SECRET=<uzun-rastgele-bir-dize>
// Sonra Supabase panelinde SQL Editor'den dakikada bir çağır (pg_cron + pg_net):
//
//   create extension if not exists pg_cron;
//   create extension if not exists pg_net;
//   select cron.schedule('tunel-push', '* * * * *', $$
//     select net.http_post(
//       url     := 'https://<PROJE-REF>.supabase.co/functions/v1/push',
//       headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
//     );
//   $$);
//
// NOT: Uzaktan push, Expo Go'da SDK 53+ ile ÇALIŞMAZ — development build gerekir.
// Uygulama açıkken bildirimler realtime + yerel bildirim yoluyla zaten düşüyor.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

type Lang = 'tr' | 'en';

type NotificationRow = {
  id: string;
  user_id: string;
  kind: 'reaction' | 'comment' | 'submission' | 'decision' | 'task' | 'session';
  detail: string | null;
  subject: string | null;
  actor: { username: string } | null;
};

const TITLE: Record<Lang, string> = { tr: 'Tünel', en: 'Tünel' };

function bodyFor(row: NotificationRow, lang: Lang): string {
  const who = row.actor?.username ?? (lang === 'tr' ? 'Biri' : 'Someone');
  const subject = row.subject ?? '';

  switch (row.kind) {
    case 'reaction':
      if (row.detail === 'clap') {
        return lang === 'tr' ? `${who} paylaşımını alkışladı 🔥` : `${who} gave your post a flame 🔥`;
      }
      return lang === 'tr' ? `${who} paylaşımını beğendi ❤️` : `${who} liked your post ❤️`;
    case 'comment':
      return lang === 'tr' ? `${who} yorum yaptı: ${subject}` : `${who} commented: ${subject}`;
    case 'submission':
      return lang === 'tr'
        ? `${who} kanıt yükledi — "${subject}" onayını bekliyor`
        : `${who} uploaded proof — "${subject}" needs your approval`;
    case 'decision':
      if (row.detail === 'approved') {
        return lang === 'tr' ? `"${subject}" onaylandı 🎉` : `"${subject}" was approved 🎉`;
      }
      return lang === 'tr' ? `"${subject}" reddedildi — tekrar dene` : `"${subject}" was rejected — try again`;
    case 'task':
      return lang === 'tr' ? `Yeni görev: ${subject}` : `New task: ${subject}`;
    case 'session':
      return lang === 'tr'
        ? `${who} antrenman çağrısı açtı${subject ? ` — ${subject}` : ''}`
        : `${who} opened a training call${subject ? ` — ${subject}` : ''}`;
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: rows, error } = await supabase
    .from('notifications')
    .select('id, user_id, kind, detail, subject, actor:profiles!notifications_actor_id_fkey(username)')
    .is('pushed_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json({ sent: 0 });

  const notifications = rows as unknown as NotificationRow[];
  const userIds = [...new Set(notifications.map((n) => n.user_id))];

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token, lang')
    .in('user_id', userIds);

  const byUser = new Map((tokens ?? []).map((t) => [t.user_id, t]));

  const messages = notifications
    .map((n) => {
      const target = byUser.get(n.user_id);
      if (!target) return null;
      const lang: Lang = target.lang === 'en' ? 'en' : 'tr';
      return {
        to: target.token,
        title: TITLE[lang],
        body: bodyFor(n, lang),
        sound: 'default',
        data: { notificationId: n.id, kind: n.kind },
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (messages.length) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      return Response.json({ error: `expo ${res.status}: ${await res.text()}` }, { status: 502 });
    }
  }

  // Token'ı olmayan alıcıların satırlarını da damgalıyoruz — kuyruk büyümesin.
  await supabase
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .in('id', notifications.map((n) => n.id));

  return Response.json({ sent: messages.length, processed: notifications.length });
});
