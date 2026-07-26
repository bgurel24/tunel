-- Tünel — Faz 0 veritabanı şeması (Supabase / Postgres)
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştırın.
-- İçerik: profiles, teams, team_members + davet koduyla katılma RPC'si + RLS.

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles herkes okuyabilir"
  on public.profiles for select using (true);

create policy "kendi profilini gunceller"
  on public.profiles for update using (auth.uid() = id);

-- Yeni kullanıcı kaydında profili otomatik oluştur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ teams ============
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  captain_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "teams herkes okuyabilir"
  on public.teams for select using (true);

-- ============ team_members ============
create table if not exists public.team_members (
  team_id uuid references public.teams (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'captain')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

create policy "uyelikleri herkes okuyabilir"
  on public.team_members for select using (true);

create policy "kendi uyeligini ekler"
  on public.team_members for insert with check (auth.uid() = user_id);

create policy "kendi uyeligini siler"
  on public.team_members for delete using (auth.uid() = user_id);

-- ============ RPC: davet koduyla takıma katıl ============
create or replace function public.join_team_by_code(p_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_team public.teams%rowtype;
begin
  select * into v_team from public.teams where invite_code = upper(p_code);
  if not found then
    raise exception 'Geçersiz davet kodu';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing;

  return v_team.name;
end;
$$;
