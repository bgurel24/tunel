-- ============================================================
-- Tünel — Faz 4: Takım sohbeti
-- Supabase panelinde: SQL Editor > New query > tamamını yapıştır > Run.
-- Tekrar çalıştırılabilir (idempotent). setup.sql'den SONRA çalıştırın.
-- ============================================================

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists team_messages_team_time
  on public.team_messages (team_id, created_at desc);

alter table public.team_messages enable row level security;

-- Sadece o takımın üyeleri okur.
drop policy if exists "uyeler sohbeti okur" on public.team_messages;
create policy "uyeler sohbeti okur" on public.team_messages for select using (
  exists (
    select 1 from public.team_members m
    where m.team_id = team_messages.team_id and m.user_id = auth.uid()
  )
);

-- Sadece o takımın üyeleri kendi adına yazar.
drop policy if exists "uyeler mesaj yazar" on public.team_messages;
create policy "uyeler mesaj yazar" on public.team_messages for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.team_members m
    where m.team_id = team_messages.team_id and m.user_id = auth.uid()
  )
);

-- Herkes kendi mesajını silebilir.
drop policy if exists "kendi mesajini siler" on public.team_messages;
create policy "kendi mesajini siler" on public.team_messages for delete using (
  user_id = auth.uid()
);

-- Canlı sohbet: tabloyu realtime yayınına ekle (zaten ekliyse hata verme).
do $$
begin
  alter publication supabase_realtime add table public.team_messages;
exception
  when duplicate_object then null;
end $$;
