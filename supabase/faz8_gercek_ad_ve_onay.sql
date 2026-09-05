-- ============================================================
-- Tünel — Faz 8: Gerçek ad + kaptan onaylı katılım
--   1) profiles.full_name: kayıtta zorunlu "Ad Soyad". Takım ekranlarında
--      kullanıcı adı yerine bu görünür (rastgele takma adlar karışıklık
--      yaratıyordu).
--   2) Davet koduyla giren kişi doğrudan üye olmaz; team_join_requests'e
--      düşer, kaptan onaylar/reddeder. Bekleyenler team_members'da olmadığı
--      için mevcut RLS politikaları dokunulmadan geçerli kalır.
--
-- faz7_sohbet.sql'den SONRA çalıştır. Tekrar çalıştırılabilir.
-- ============================================================

-- ========== 1) Gerçek ad ==========
alter table public.profiles add column if not exists full_name text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- Liderlik tablosu gerçek adı da döndürsün (dönüş tipi değiştiği için drop).
drop function if exists public.user_leaderboard(uuid);
create or replace function public.user_leaderboard(p_team_id uuid)
returns table (user_id uuid, username text, full_name text, points bigint)
language sql security definer set search_path = public as $$
  select p.id, p.username, p.full_name, coalesce(sum(tk.points), 0)::bigint
  from public.team_members mm
  join public.profiles p on p.id = mm.user_id
  left join public.submissions s on s.user_id = p.id and s.status = 'approved'
  left join public.tasks tk on tk.id = s.task_id and tk.team_id = p_team_id
  where mm.team_id = p_team_id
  group by p.id, p.username, p.full_name
  order by 4 desc, p.username;
$$;
grant execute on function public.user_leaderboard(uuid) to anon, authenticated;

-- ========== 2) Katılım istekleri ==========
create table if not exists public.team_join_requests (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_join_requests enable row level security;
grant select, insert, delete on public.team_join_requests to authenticated;

-- Kendi isteğini görür/geri çeker; takımın kaptanları (role='captain') hepsini görür.
drop policy if exists "istek: kendi" on public.team_join_requests;
create policy "istek: kendi" on public.team_join_requests
  for select using (user_id = auth.uid());
drop policy if exists "istek: kaptan gorur" on public.team_join_requests;
create policy "istek: kaptan gorur" on public.team_join_requests
  for select using (exists (
    select 1 from public.team_members m
    where m.team_id = team_join_requests.team_id and m.user_id = auth.uid() and m.role = 'captain'));
drop policy if exists "istek: kendi geri ceker" on public.team_join_requests;
create policy "istek: kendi geri ceker" on public.team_join_requests
  for delete using (user_id = auth.uid());

-- Bildirim türlerine 'join' eklendi (istek geldi / onaylandı / reddedildi).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('reaction', 'comment', 'submission', 'decision', 'task', 'session', 'join'));

-- Davet kodu: artık üye yapmaz, istek açar. Dönüş: {name, pending}.
drop function if exists public.join_team_by_code(text);
create or replace function public.join_team_by_code(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams%rowtype;
  v_captain uuid;
begin
  select * into v_team from public.teams where invite_code = upper(p_code);
  if not found then raise exception 'Geçersiz davet kodu'; end if;

  -- Zaten üye
  if exists (select 1 from public.team_members where team_id = v_team.id and user_id = auth.uid()) then
    return json_build_object('name', v_team.name, 'pending', false);
  end if;

  insert into public.team_join_requests (team_id, user_id)
  values (v_team.id, auth.uid())
  on conflict (team_id, user_id) do nothing;

  -- Takımın tüm kaptanlarına haber ver
  for v_captain in
    select user_id from public.team_members where team_id = v_team.id and role = 'captain'
  loop
    insert into public.notifications (user_id, actor_id, kind, detail, team_id, subject)
    values (v_captain, auth.uid(), 'join', 'request', v_team.id, v_team.name);
  end loop;

  return json_build_object('name', v_team.name, 'pending', true);
end; $$;
grant execute on function public.join_team_by_code(text) to authenticated;

-- Kaptan onaylar: üye olur, istek silinir, kişiye haber gider.
create or replace function public.approve_join_request(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not exists (select 1 from public.team_members
                 where team_id = p_team_id and user_id = auth.uid() and role = 'captain') then
    raise exception 'Bu takımın kaptanı değilsin';
  end if;
  if not exists (select 1 from public.team_join_requests where team_id = p_team_id and user_id = p_user_id) then
    raise exception 'Böyle bir istek yok';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, p_user_id, 'member')
  on conflict (team_id, user_id) do nothing;
  delete from public.team_join_requests where team_id = p_team_id and user_id = p_user_id;

  select name into v_name from public.teams where id = p_team_id;
  insert into public.notifications (user_id, actor_id, kind, detail, team_id, subject)
  values (p_user_id, auth.uid(), 'join', 'approved', p_team_id, v_name);
end; $$;

create or replace function public.reject_join_request(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not exists (select 1 from public.team_members
                 where team_id = p_team_id and user_id = auth.uid() and role = 'captain') then
    raise exception 'Bu takımın kaptanı değilsin';
  end if;
  delete from public.team_join_requests where team_id = p_team_id and user_id = p_user_id;
  if not found then raise exception 'Böyle bir istek yok'; end if;

  select name into v_name from public.teams where id = p_team_id;
  insert into public.notifications (user_id, actor_id, kind, detail, team_id, subject)
  values (p_user_id, auth.uid(), 'join', 'rejected', p_team_id, v_name);
end; $$;

grant execute on function public.approve_join_request(uuid, uuid) to authenticated;
grant execute on function public.reject_join_request(uuid, uuid) to authenticated;
