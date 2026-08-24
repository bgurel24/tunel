-- ============================================================
-- Tünel — Faz 1 tamamlama
--   1) Görev–paylaşım bağı + red sebebi
--   2) Gerçek roller (sunucu tarafı zorlama + kaptanlık devri / üye çıkarma)
--   3) Bildirimler (gelen kutusu + trigger'lar + push token)
--
-- Supabase panelinde: SQL Editor > New query > tamamını yapıştır > Run.
-- setup.sql'den SONRA çalıştır. Tekrar çalıştırılabilir (idempotent).
-- ============================================================


-- ============================================================
-- 1) GÖREV – PAYLAŞIM BAĞI
-- ============================================================

-- Kanıt videosu feed'e de düştüğünde post hangi göreve ait, artık belli.
alter table public.posts
  add column if not exists task_id uuid references public.tasks (id) on delete set null;

create index if not exists posts_task_idx on public.posts (task_id);

-- Red sebebi + kararın kim/ne zaman verildiği.
alter table public.submissions add column if not exists reject_note text;
alter table public.submissions add column if not exists decided_at timestamptz;
alter table public.submissions
  add column if not exists decided_by uuid references public.profiles (id) on delete set null;

-- Karar damgası: onay/red anında kim-ne zaman yazılır; yeniden gönderimde
-- (status yeniden 'pending') eski karar ve red notu temizlenir.
create or replace function public.stamp_submission_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    new.decided_at := now();
    new.decided_by := auth.uid();
  elsif new.status = 'pending' and old.status is distinct from 'pending' then
    new.decided_at := null;
    new.decided_by := null;
    new.reject_note := null;
  end if;
  return new;
end; $$;

create or replace trigger trg_submission_decision
  before update on public.submissions
  for each row execute function public.stamp_submission_decision();


-- ============================================================
-- 2) GERÇEK ROLLER — sunucu tarafı zorlama
-- ============================================================

-- ÖNEMLİ GÜVENLİK DÜZELTMESİ
-- Eskiden üye kendi submission satırını serbestçe güncelleyebiliyordu; yani
-- istemciden status'ü 'approved' yapıp kaptanı atlayarak puan alabilirdi.
-- Artık üyenin yazabildiği tek durum 'pending'; onay/red sadece kaptanda.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'submissions' and policyname = 'kendi kanit ekler'
  ) then
    execute 'alter policy "kendi kanit ekler" on public.submissions
               with check (auth.uid() = user_id and status = ''pending'')';
  else
    execute 'create policy "kendi kanit ekler" on public.submissions for insert
               with check (auth.uid() = user_id and status = ''pending'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'submissions' and policyname = 'kendi kanit gunceller'
  ) then
    execute 'alter policy "kendi kanit gunceller" on public.submissions
               using (auth.uid() = user_id)
               with check (auth.uid() = user_id and status = ''pending'')';
  else
    execute 'create policy "kendi kanit gunceller" on public.submissions for update
               using (auth.uid() = user_id)
               with check (auth.uid() = user_id and status = ''pending'')';
  end if;

  -- Kaptan tarafı: okuma koşulu neyse yazma koşulu da o olsun (açıkça yazalım).
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'submissions' and policyname = 'kaptan kanit gunceller'
  ) then
    execute 'alter policy "kaptan kanit gunceller" on public.submissions
               using (exists (select 1 from public.tasks t
                              join public.team_members m on m.team_id = t.team_id
                              where t.id = submissions.task_id
                                and m.user_id = auth.uid() and m.role = ''captain''))
               with check (exists (select 1 from public.tasks t
                                   join public.team_members m on m.team_id = t.team_id
                                   where t.id = submissions.task_id
                                     and m.user_id = auth.uid() and m.role = ''captain''))';
  end if;
end $$;

-- ========== RPC: kaptanlığı devret (yalnızca mevcut kaptan) ==========
create or replace function public.transfer_captaincy(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.teams where id = p_team_id and captain_id = auth.uid()) then
    raise exception 'Bu takımın kaptanı değilsin';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Kaptanlık zaten sende';
  end if;

  if not exists (
    select 1 from public.team_members where team_id = p_team_id and user_id = p_user_id
  ) then
    raise exception 'Bu kişi takımda değil';
  end if;

  update public.team_members set role = 'member'
   where team_id = p_team_id and user_id = auth.uid();
  update public.team_members set role = 'captain'
   where team_id = p_team_id and user_id = p_user_id;
  update public.teams set captain_id = p_user_id where id = p_team_id;
end; $$;

-- ========== RPC: üyeyi takımdan çıkar (yalnızca kaptan) ==========
create or replace function public.remove_member(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.teams where id = p_team_id and captain_id = auth.uid()) then
    raise exception 'Bu takımın kaptanı değilsin';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Kendini çıkaramazsın — takımdan ayrıl ya da kaptanlığı devret';
  end if;

  delete from public.team_members where team_id = p_team_id and user_id = p_user_id;
  if not found then
    raise exception 'Bu kişi takımda değil';
  end if;
end; $$;

grant execute on function public.transfer_captaincy(uuid, uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;


-- ============================================================
-- 3) BİLDİRİMLER
-- ============================================================

-- ========== push_tokens ==========
-- Ayrı tablo: profiles herkese okunur olduğu için token'ı oraya koymuyoruz.
create table if not exists public.push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null,
  platform text,
  -- Push metnini hangi dilde göndereceğimiz (uygulamadaki dil tercihi).
  lang text not null default 'tr',
  updated_at timestamptz not null default now()
);
alter table public.push_tokens add column if not exists lang text not null default 'tr';
alter table public.push_tokens enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'kendi tokenini gorur') then
    create policy "kendi tokenini gorur" on public.push_tokens for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'kendi tokenini yazar') then
    create policy "kendi tokenini yazar" on public.push_tokens for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'kendi tokenini gunceller') then
    create policy "kendi tokenini gunceller" on public.push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'kendi tokenini siler') then
    create policy "kendi tokenini siler" on public.push_tokens for delete using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.push_tokens to authenticated;

-- ========== notifications ==========
-- Metin istemcide üretilir (TR/EN) — burada sadece tür + referanslar durur.
--   kind      : reaction · comment · submission · decision · task · session
--   detail    : reaction -> like/clap · decision -> approved/rejected
--   subject   : görev/takım adının o anki kopyası (join olmadan göstermek için)
--   pushed_at : Expo push gönderildi mi (Edge Function işaretler)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('reaction', 'comment', 'submission', 'decision', 'task', 'session')),
  detail text,
  subject text,
  post_id uuid references public.posts (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;
create index if not exists notifications_unpushed_idx
  on public.notifications (created_at) where pushed_at is null;

alter table public.notifications enable row level security;

-- Yazma yalnızca trigger'lardan (security definer) — istemci insert edemez.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'kendi bildirimini gorur') then
    create policy "kendi bildirimini gorur" on public.notifications for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'kendi bildirimini okudu isaretler') then
    create policy "kendi bildirimini okudu isaretler" on public.notifications for update
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'kendi bildirimini siler') then
    create policy "kendi bildirimini siler" on public.notifications for delete using (auth.uid() = user_id);
  end if;
end $$;

grant select, update, delete on public.notifications to authenticated;

-- İki kullanıcı arasında engel var mı (iki yön de sayılır).
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ---------- beğeni / alkış ----------
create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind, detail, post_id)
  select p.user_id, new.user_id, 'reaction', new.kind, new.post_id
  from public.posts p
  where p.id = new.post_id
    and p.user_id <> new.user_id
    and not public.is_blocked_pair(p.user_id, new.user_id);
  return null;
end; $$;

create or replace trigger trg_notify_reaction
  after insert on public.post_reactions
  for each row execute function public.notify_reaction();

-- ---------- yorum ----------
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind, post_id, subject)
  select p.user_id, new.user_id, 'comment', new.post_id, left(new.body, 80)
  from public.posts p
  where p.id = new.post_id
    and p.user_id <> new.user_id
    and not public.is_blocked_pair(p.user_id, new.user_id);
  return null;
end; $$;

create or replace trigger trg_notify_comment
  after insert on public.post_comments
  for each row execute function public.notify_comment();

-- ---------- kanıt geldi (kaptana) / karar verildi (üyeye) ----------
create or replace function public.notify_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_new_proof boolean;
begin
  v_new_proof := tg_op = 'INSERT'
                 or (new.status = 'pending' and old.status is distinct from 'pending');

  if v_new_proof then
    -- Yeni/yenilenmiş kanıt → takımın kaptan(lar)ına
    insert into public.notifications (user_id, actor_id, kind, task_id, team_id, subject)
    select m.user_id, new.user_id, 'submission', new.task_id, t.team_id, t.title
    from public.tasks t
    join public.team_members m on m.team_id = t.team_id and m.role = 'captain'
    where t.id = new.task_id and m.user_id <> new.user_id;

  elsif tg_op = 'UPDATE'
        and new.status is distinct from old.status
        and new.status in ('approved', 'rejected') then
    -- Onay/red → kanıtı yükleyen üyeye
    insert into public.notifications (user_id, actor_id, kind, detail, task_id, team_id, subject)
    select new.user_id, auth.uid(), 'decision', new.status, new.task_id, t.team_id, t.title
    from public.tasks t
    where t.id = new.task_id and new.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  return null;
end; $$;

create or replace trigger trg_notify_submission
  after insert or update on public.submissions
  for each row execute function public.notify_submission();

-- ---------- yeni görev (takıma) ----------
create or replace function public.notify_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind, task_id, team_id, subject)
  select m.user_id, new.created_by, 'task', new.id, new.team_id, new.title
  from public.team_members m
  where m.team_id = new.team_id and m.user_id is distinct from new.created_by;
  return null;
end; $$;

create or replace trigger trg_notify_task
  after insert on public.tasks
  for each row execute function public.notify_task();

-- ---------- antrenman çağrısı (takıma) ----------
create or replace function public.notify_session()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind, team_id, subject)
  select m.user_id, new.user_id, 'session', new.team_id, coalesce(new.gym, new.note)
  from public.team_members m
  where m.team_id = new.team_id and m.user_id <> new.user_id;
  return null;
end; $$;

create or replace trigger trg_notify_session
  after insert on public.gym_sessions
  for each row execute function public.notify_session();

-- ---------- okundu işaretle ----------
create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null;
$$;

grant execute on function public.mark_notifications_read() to authenticated;

-- ---------- Realtime ----------
-- Uygulama açıkken bildirim anında düşsün (Expo Go'da da çalışır).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;
