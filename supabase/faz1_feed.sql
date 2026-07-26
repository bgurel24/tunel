-- Tünel — Faz 1: paylaşımlar (feed), tepkiler, yorumlar + medya depolama.
-- Faz 0 şemasından (schema.sql) SONRA çalıştırın.

-- ============ posts ============
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  image_path text,
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

create policy "posts okunur"
  on public.posts for select using (true);

create policy "kendi postunu ekler"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "kendi postunu siler"
  on public.posts for delete using (auth.uid() = user_id);

-- ============ post_reactions (like / clap) ============
create table if not exists public.post_reactions (
  post_id uuid references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'clap')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

alter table public.post_reactions enable row level security;

create policy "tepkiler okunur"
  on public.post_reactions for select using (true);

create policy "kendi tepkisini ekler"
  on public.post_reactions for insert with check (auth.uid() = user_id);

create policy "kendi tepkisini siler"
  on public.post_reactions for delete using (auth.uid() = user_id);

-- ============ post_comments ============
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "yorumlar okunur"
  on public.post_comments for select using (true);

create policy "kendi yorumunu ekler"
  on public.post_comments for insert with check (auth.uid() = user_id);

-- ============ medya deposu (Storage) ============
-- 'posts' bucket'ını public olarak oluştur.
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Herkes okuyabilir (public bucket).
create policy "post medyasi okunur"
  on storage.objects for select
  using (bucket_id = 'posts');

-- Kullanıcı yalnızca kendi klasörüne (user_id/...) yükleyebilir.
create policy "kendi klasorune yukler"
  on storage.objects for insert
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
