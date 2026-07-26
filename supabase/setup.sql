-- ============================================================
-- Tünel — TEK DOSYA KURULUM (Faz 0 + Faz 1)
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını
-- yapıştır > Run. Tekrar çalıştırılabilir (idempotent).
-- ============================================================

-- ========== profiles ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

-- Profil fotoğrafı: 'posts' bucket'ında <uid>/avatar-*.jpg yolu.
alter table public.profiles add column if not exists avatar_path text;

alter table public.profiles enable row level security;

drop policy if exists "profiles okunur" on public.profiles;
create policy "profiles okunur" on public.profiles for select using (true);

drop policy if exists "kendi profilini gunceller" on public.profiles;
create policy "kendi profilini gunceller" on public.profiles for update using (auth.uid() = id);

-- Yeni kullanıcı kaydında profili otomatik oluştur.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ========== teams ==========
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  captain_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

drop policy if exists "teams okunur" on public.teams;
create policy "teams okunur" on public.teams for select using (true);

-- ========== team_members ==========
create table if not exists public.team_members (
  team_id uuid references public.teams (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'captain')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

drop policy if exists "uyelikleri herkes okur" on public.team_members;
create policy "uyelikleri herkes okur" on public.team_members for select using (true);

drop policy if exists "kendi uyeligini ekler" on public.team_members;
create policy "kendi uyeligini ekler" on public.team_members for insert with check (auth.uid() = user_id);

drop policy if exists "kendi uyeligini siler" on public.team_members;
create policy "kendi uyeligini siler" on public.team_members for delete using (auth.uid() = user_id);

-- ========== RPC: takım oluştur (kaptan olarak) ==========
create or replace function public.create_team(p_name text)
returns table (team_id uuid, invite_code text)
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_id uuid;
begin
  -- Aynı kaptanın aynı isimde ikinci takımını engelle.
  if exists (
    select 1 from public.teams t
    where t.captain_id = auth.uid() and lower(t.name) = lower(trim(p_name))
  ) then
    raise exception 'Bu isimde bir takımın zaten var';
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.teams t where t.invite_code = v_code);
  end loop;

  insert into public.teams (name, invite_code, captain_id)
  values (trim(p_name), v_code, auth.uid())
  returning id into v_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_id, auth.uid(), 'captain');

  return query select v_id, v_code;
end; $$;

-- ========== RPC: takım sil (yalnızca kaptan) ==========
create or replace function public.delete_team(p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.teams where id = p_team_id and captain_id = auth.uid();
  if not found then
    raise exception 'Bu takımı silme yetkin yok';
  end if;
end; $$;

-- ========== RPC: davet koduyla katıl ==========
create or replace function public.join_team_by_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v_team public.teams%rowtype;
begin
  select * into v_team from public.teams where invite_code = upper(p_code);
  if not found then raise exception 'Geçersiz davet kodu'; end if;

  insert into public.team_members (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing;

  return v_team.name;
end; $$;

-- ========== posts (feed) ==========
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  image_path text,
  video_path text,
  caption text,
  gym text,
  is_live boolean not null default true,
  shared_social boolean not null default false,
  music_title text,
  music_artist text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  clap_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_social_idx on public.posts (shared_social, created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts okunur" on public.posts;
create policy "posts okunur" on public.posts for select using (true);

drop policy if exists "kendi postunu ekler" on public.posts;
create policy "kendi postunu ekler" on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "kendi postunu siler" on public.posts;
create policy "kendi postunu siler" on public.posts for delete using (auth.uid() = user_id);

-- ========== post_reactions ==========
create table if not exists public.post_reactions (
  post_id uuid references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'clap')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

alter table public.post_reactions enable row level security;

drop policy if exists "tepkiler okunur" on public.post_reactions;
create policy "tepkiler okunur" on public.post_reactions for select using (true);

drop policy if exists "kendi tepkisini ekler" on public.post_reactions;
create policy "kendi tepkisini ekler" on public.post_reactions for insert with check (auth.uid() = user_id);

drop policy if exists "kendi tepkisini siler" on public.post_reactions;
create policy "kendi tepkisini siler" on public.post_reactions for delete using (auth.uid() = user_id);

-- ========== post_comments ==========
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

drop policy if exists "yorumlar okunur" on public.post_comments;
create policy "yorumlar okunur" on public.post_comments for select using (true);

drop policy if exists "kendi yorumunu ekler" on public.post_comments;
create policy "kendi yorumunu ekler" on public.post_comments for insert with check (auth.uid() = user_id);

-- ========== Storage: 'posts' bucket ==========
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

drop policy if exists "post medyasi okunur" on storage.objects;
create policy "post medyasi okunur" on storage.objects for select using (bucket_id = 'posts');

drop policy if exists "kendi klasorune yukler" on storage.objects;
create policy "kendi klasorune yukler" on storage.objects for insert
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ========== Yetkiler (grants) ==========
-- anon/authenticated rollerine tablo erişimi (satır güvenliğini RLS sağlar).
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- Bundan sonra oluşturulacak tablolar için de varsayılan yetkiler.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;

-- ========== tasks (görevler) ==========
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  points integer not null default 10,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

drop policy if exists "tasks okunur" on public.tasks;
create policy "tasks okunur" on public.tasks for select using (true);

drop policy if exists "kaptan gorev ekler" on public.tasks;
create policy "kaptan gorev ekler" on public.tasks for insert with check (
  exists (select 1 from public.team_members m
          where m.team_id = tasks.team_id and m.user_id = auth.uid() and m.role = 'captain')
);

drop policy if exists "kaptan gorev siler" on public.tasks;
create policy "kaptan gorev siler" on public.tasks for delete using (
  exists (select 1 from public.team_members m
          where m.team_id = tasks.team_id and m.user_id = auth.uid() and m.role = 'captain')
);

-- ========== submissions (görev kanıtları) ==========
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_path text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);
alter table public.submissions enable row level security;

drop policy if exists "submissions okunur" on public.submissions;
create policy "submissions okunur" on public.submissions for select using (true);

drop policy if exists "kendi kanit ekler" on public.submissions;
create policy "kendi kanit ekler" on public.submissions for insert with check (auth.uid() = user_id);

drop policy if exists "kendi kanit gunceller" on public.submissions;
create policy "kendi kanit gunceller" on public.submissions for update using (auth.uid() = user_id);

drop policy if exists "kaptan kanit gunceller" on public.submissions;
create policy "kaptan kanit gunceller" on public.submissions for update using (
  exists (select 1 from public.tasks t
          join public.team_members m on m.team_id = t.team_id
          where t.id = submissions.task_id and m.user_id = auth.uid() and m.role = 'captain')
);

-- ========== Liderlik RPC'leri ==========
create or replace function public.team_leaderboard()
returns table (team_id uuid, name text, points bigint)
language sql security definer set search_path = public as $$
  select t.id, t.name,
         coalesce(sum(case when s.id is not null then tk.points else 0 end), 0)::bigint
  from public.teams t
  left join public.tasks tk on tk.team_id = t.id
  left join public.submissions s on s.task_id = tk.id and s.status = 'approved'
  group by t.id, t.name
  order by 3 desc, t.name;
$$;

create or replace function public.user_leaderboard(p_team_id uuid)
returns table (user_id uuid, username text, points bigint)
language sql security definer set search_path = public as $$
  select p.id, p.username, coalesce(sum(tk.points), 0)::bigint
  from public.team_members mm
  join public.profiles p on p.id = mm.user_id
  left join public.submissions s on s.user_id = p.id and s.status = 'approved'
  left join public.tasks tk on tk.id = s.task_id and tk.team_id = p_team_id
  where mm.team_id = p_team_id
  group by p.id, p.username
  order by 3 desc, p.username;
$$;

-- Yeni tablolara yetkiler (garanti olsun diye açıkça)
grant select on public.tasks, public.submissions to anon, authenticated;
grant insert, update, delete on public.tasks, public.submissions to authenticated;

-- ========== post sayaç trigger'ları (beğeni/alkış/yorum) ==========
create or replace function public.bump_post_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'post_reactions' then
    if tg_op = 'INSERT' then
      update public.posts set
        like_count = like_count + (case when new.kind = 'like' then 1 else 0 end),
        clap_count = clap_count + (case when new.kind = 'clap' then 1 else 0 end)
      where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set
        like_count = greatest(like_count - (case when old.kind = 'like' then 1 else 0 end), 0),
        clap_count = greatest(clap_count - (case when old.kind = 'clap' then 1 else 0 end), 0)
      where id = old.post_id;
    end if;
  elsif tg_table_name = 'post_comments' then
    if tg_op = 'INSERT' then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    end if;
  end if;
  return null;
end; $$;

create or replace trigger trg_reaction_counts
  after insert or delete on public.post_reactions
  for each row execute function public.bump_post_counts();

create or replace trigger trg_comment_counts
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_counts();

-- ========== gym_sessions (antrenman çağrısı) ==========
-- "Yarım saate ana gymdeyim, gelen gelsin" — takıma açılan çağrı.
create table if not exists public.gym_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym text,
  note text,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists gym_sessions_team_idx on public.gym_sessions (team_id, starts_at desc);
alter table public.gym_sessions enable row level security;

-- ========== gym_session_rsvps (geliyorum / yokum) ==========
create table if not exists public.gym_session_rsvps (
  session_id uuid not null references public.gym_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('in', 'out')),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.gym_session_rsvps enable row level security;

-- Politikalar: "drop policy" yazmadan idempotent kur (Supabase yıkıcı işlem uyarısı çıkmasın).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_sessions' and policyname = 'cagrilar okunur') then
    create policy "cagrilar okunur" on public.gym_sessions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_sessions' and policyname = 'uye cagri acar') then
    create policy "uye cagri acar" on public.gym_sessions for insert with check (
      auth.uid() = user_id and exists (
        select 1 from public.team_members m
        where m.team_id = gym_sessions.team_id and m.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_sessions' and policyname = 'kendi cagrisini siler') then
    create policy "kendi cagrisini siler" on public.gym_sessions for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_session_rsvps' and policyname = 'yanitlar okunur') then
    create policy "yanitlar okunur" on public.gym_session_rsvps for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_session_rsvps' and policyname = 'kendi yanitini yazar') then
    create policy "kendi yanitini yazar" on public.gym_session_rsvps for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_session_rsvps' and policyname = 'kendi yanitini gunceller') then
    create policy "kendi yanitini gunceller" on public.gym_session_rsvps for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gym_session_rsvps' and policyname = 'kendi yanitini siler') then
    create policy "kendi yanitini siler" on public.gym_session_rsvps for delete using (auth.uid() = user_id);
  end if;
end $$;

grant select on public.gym_sessions, public.gym_session_rsvps to anon, authenticated;
grant insert, update, delete on public.gym_sessions, public.gym_session_rsvps to authenticated;

-- ========== personal_records (PR) ==========
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  movement text not null,
  weight numeric not null,
  reps integer not null default 1,
  achieved_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists pr_user_idx on public.personal_records (user_id, movement, achieved_at desc);
alter table public.personal_records enable row level security;
create policy "pr okunur" on public.personal_records for select using (true);
create policy "kendi pr ekler" on public.personal_records for insert with check (auth.uid() = user_id);
create policy "kendi pr siler" on public.personal_records for delete using (auth.uid() = user_id);

grant select on public.personal_records to anon, authenticated;
grant insert, update, delete on public.personal_records to authenticated;
