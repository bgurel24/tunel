-- ============================================================
-- Tünel — Faz 9: Koç rolü + idman/etkinlik katılım (yoklama) sistemi
--
--   1) team_members.role'a 'coach' eklenir. Koçlar ve kaptanlar ayrı kişiler:
--        coach   → idman/etkinlik açar, düzenler, siler; yoklamayı ve
--                  katılım istatistiklerini görür. Kaptan yetkileri YOK.
--        captain → eskisi gibi (görevler, onaylar, üye çıkarma). İdman açamaz.
--      Koç atamayı takımın sahibi yapar (set_member_role).
--   2) events: genel etkinlik tablosu. Bugün 'training' (idman) için
--      kullanılıyor; 'match' ve 'event' ileride aynı altyapıyla çalışır.
--   3) event_attendance: sporcunun cevabı (going / not_going / maybe).
--      Son bildirim zamanından sonra verilen cevap silinmez, "geç" işaretlenir.
--   4) Yeni idmanda takıma bildirim; cevapsızlara hatırlatma fonksiyonu.
--   5) event_attendance_stats: koç için sporcu bazında katılım özeti.
--
-- faz8_gercek_ad_ve_onay.sql'den SONRA çalıştır. Tekrar çalıştırılabilir.
-- ============================================================


-- ========== 1) Koç rolü ==========
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('member', 'captain', 'coach'));

create or replace function public.set_member_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('captain', 'member', 'coach') then
    raise exception 'Geçersiz rol';
  end if;

  if not exists (
    select 1 from public.teams where id = p_team_id and captain_id = auth.uid()
  ) then
    raise exception 'Bu takımın sahibi değilsin';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Kendi yetkini buradan değiştiremezsin';
  end if;

  update public.team_members
     set role = p_role
   where team_id = p_team_id and user_id = p_user_id;

  if not found then
    raise exception 'Bu kişi takımda değil';
  end if;
end; $$;

grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

create or replace function public.is_team_coach(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_team_id is not null and exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = auth.uid() and m.role = 'coach'
  );
$$;

grant execute on function public.is_team_coach(uuid) to authenticated;


-- ========== 2) events ==========
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  kind text not null default 'training' check (kind in ('training', 'match', 'event')),
  title text not null check (char_length(trim(title)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (location is null or char_length(location) <= 120),
  description text check (description is null or char_length(description) <= 1000),
  rsvp_deadline timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at),
  constraint events_deadline_before_start check (rsvp_deadline is null or rsvp_deadline <= starts_at)
);

create index if not exists events_team_start_idx on public.events (team_id, starts_at);

alter table public.events enable row level security;

create or replace function public.events_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  -- Saat değişirse hatırlatma yeniden gidebilsin.
  if new.starts_at is distinct from old.starts_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_events_touch on public.events;
create trigger trg_events_touch
  before update on public.events
  for each row execute function public.events_touch();


-- ========== 3) event_attendance ==========
create table if not exists public.event_attendance (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'not_going', 'maybe')),
  -- Son bildirim zamanı geçtikten sonra verildi / değiştirildi mi.
  late boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_attendance_user_idx on public.event_attendance (user_id);

alter table public.event_attendance enable row level security;

-- Zaman damgası ve "geç" işareti sunucuda hesaplanır; istemci yazamaz.
create or replace function public.event_attendance_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_deadline timestamptz;
begin
  select rsvp_deadline into v_deadline from public.events where id = new.event_id;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.late := v_deadline is not null and now() > v_deadline;
  return new;
end; $$;

drop trigger if exists trg_event_attendance_stamp on public.event_attendance;
create trigger trg_event_attendance_stamp
  before insert or update on public.event_attendance
  for each row execute function public.event_attendance_stamp();

-- Cevap verilebilir mi: takımın sporcusu (koç değil) ve etkinlik bitmemiş.
create or replace function public.can_respond_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.events e
    join public.team_members m on m.team_id = e.team_id
    where e.id = p_event_id
      and m.user_id = auth.uid()
      and m.role <> 'coach'
      and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
  );
$$;

create or replace function public.event_team(p_event_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.events where id = p_event_id;
$$;

grant execute on function public.can_respond_event(uuid) to authenticated;
grant execute on function public.event_team(uuid) to authenticated;


-- ========== 4) Politikalar ==========
do $$
begin
  -- events: takım üyeleri görür, yalnızca o takımın koçları yönetir.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'takim etkinlikleri gorur') then
    create policy "takim etkinlikleri gorur" on public.events
      for select using (public.is_team_member(team_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'koc etkinlik acar') then
    create policy "koc etkinlik acar" on public.events
      for insert with check (public.is_team_coach(team_id) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'koc etkinlik duzenler') then
    create policy "koc etkinlik duzenler" on public.events
      for update using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'koc etkinlik siler') then
    create policy "koc etkinlik siler" on public.events
      for delete using (public.is_team_coach(team_id));
  end if;

  -- event_attendance: takım içi herkes görür ("18 kişi geliyor");
  -- herkes yalnızca KENDİ cevabını yazar/değiştirir/siler.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_attendance' and policyname = 'takim katilimi gorur') then
    create policy "takim katilimi gorur" on public.event_attendance
      for select using (public.is_team_member(public.event_team(event_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_attendance' and policyname = 'kendi katilimini yazar') then
    create policy "kendi katilimini yazar" on public.event_attendance
      for insert with check (user_id = auth.uid() and public.can_respond_event(event_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_attendance' and policyname = 'kendi katilimini gunceller') then
    create policy "kendi katilimini gunceller" on public.event_attendance
      for update using (user_id = auth.uid())
      with check (user_id = auth.uid() and public.can_respond_event(event_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_attendance' and policyname = 'kendi katilimini siler') then
    create policy "kendi katilimini siler" on public.event_attendance
      for delete using (user_id = auth.uid() and public.can_respond_event(event_id));
  end if;
end $$;

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_attendance to authenticated;


-- ========== 5) Bildirimler ==========
alter table public.notifications
  add column if not exists event_id uuid references public.events (id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('reaction', 'comment', 'submission', 'decision', 'task', 'session', 'join', 'event'));

-- subject: "Salı İdmanı · 13.10 20:00" — push metni ve gelen kutusu bunu gösterir.
create or replace function public.event_subject(e public.events)
returns text language sql stable as $$
  select e.title || ' · ' || to_char(e.starts_at at time zone 'Europe/Istanbul', 'DD.MM HH24:MI');
$$;

create or replace function public.notify_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Geçmişe dönük girilen etkinlik için kimseyi rahatsız etme.
  if new.starts_at <= now() then
    return null;
  end if;
  insert into public.notifications (user_id, actor_id, kind, detail, team_id, event_id, subject)
  select m.user_id, new.created_by, 'event', 'new', new.team_id, new.id, public.event_subject(new)
  from public.team_members m
  where m.team_id = new.team_id and m.user_id is distinct from new.created_by;
  return null;
end; $$;

drop trigger if exists trg_notify_event on public.events;
create trigger trg_notify_event
  after insert on public.events
  for each row execute function public.notify_event();

-- Hatırlatma: başlamasına p_within kalmış ve henüz hatırlatılmamış etkinliklerde
-- cevap vermemiş sporculara bildirim düşer. İstemci çağıramaz; zamanlayıcı
-- (pg_cron) ya da servis anahtarıyla çağrılır. Örnek (Supabase → Database → Cron):
--   select cron.schedule('etkinlik-hatirlatma', '*/15 * * * *',
--     $$select public.send_event_reminders(interval '3 hours')$$);
create or replace function public.send_event_reminders(p_within interval default interval '3 hours')
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v_rows integer;
  e public.events;
begin
  for e in
    select * from public.events
    where reminder_sent_at is null
      and starts_at > now()
      and starts_at <= now() + p_within
    for update skip locked
  loop
    insert into public.notifications (user_id, actor_id, kind, detail, team_id, event_id, subject)
    select m.user_id, e.created_by, 'event', 'reminder', e.team_id, e.id, public.event_subject(e)
    from public.team_members m
    where m.team_id = e.team_id
      and m.role <> 'coach'
      and not exists (
        select 1 from public.event_attendance a
        where a.event_id = e.id and a.user_id = m.user_id
      );
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;

    update public.events set reminder_sent_at = now() where id = e.id;
  end loop;
  return v_count;
end; $$;

revoke execute on function public.send_event_reminders(interval) from public, anon, authenticated;


-- ========== 6) İstatistik ==========
-- Sporcu bazında: o kişi takıma girdikten sonra başlamış (geçmiş) etkinlikler
-- üzerinden. "Katıldı" = going cevabı. Yalnızca takımın koçu çağırabilir.
create or replace function public.event_attendance_stats(
  p_team_id uuid,
  p_kind text default 'training'
)
returns table (
  user_id uuid,
  total integer,
  going integer,
  not_going integer,
  maybe integer,
  no_response integer,
  late integer,
  rate numeric
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_team_coach(p_team_id) then
    raise exception 'Bu takımın koçu değilsin';
  end if;

  return query
  with athletes as (
    select m.user_id, m.joined_at
    from public.team_members m
    where m.team_id = p_team_id and m.role <> 'coach'
  ),
  past as (
    select e.id, e.starts_at
    from public.events e
    where e.team_id = p_team_id
      and (p_kind is null or e.kind = p_kind)
      and e.starts_at <= now()
  ),
  grid as (
    select a.user_id, p.id as event_id, att.status, coalesce(att.late, false) as late
    from athletes a
    join past p on p.starts_at >= a.joined_at
    left join public.event_attendance att on att.event_id = p.id and att.user_id = a.user_id
  )
  select
    a.user_id,
    count(g.event_id)::int,
    count(*) filter (where g.status = 'going')::int,
    count(*) filter (where g.status = 'not_going')::int,
    count(*) filter (where g.status = 'maybe')::int,
    count(*) filter (where g.event_id is not null and g.status is null)::int,
    count(*) filter (where g.late)::int,
    case when count(g.event_id) = 0 then null
         else round(100.0 * count(*) filter (where g.status = 'going') / count(g.event_id), 0)
    end
  from athletes a
  left join grid g on g.user_id = a.user_id
  group by a.user_id;
end; $$;

grant execute on function public.event_attendance_stats(uuid, text) to authenticated;


-- ========== 7) Realtime ==========
-- Koç yoklama ekranındayken cevaplar anında düşsün.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_attendance'
     ) then
    execute 'alter publication supabase_realtime add table public.event_attendance';
  end if;
end $$;
