-- ============================================================
-- Tünel — Faz 3: Kişiye özel görev atama + rookie takibi
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını
-- yapıştır > Run. Tekrar çalıştırılabilir (idempotent).
-- setup.sql'den SONRA çalıştırın.
-- ============================================================

-- Görevler: kişiye özel atama (null = tüm takım) + son gün.
alter table public.tasks add column if not exists assigned_to uuid[];
alter table public.tasks add column if not exists due_date date;

-- Üyeler: rookie bayrağı (kaptan panelinde ayrı takip için).
alter table public.team_members add column if not exists is_rookie boolean not null default false;

-- Kaptan, takımındaki üye kayıtlarını güncelleyebilsin (rookie işareti vb.).
drop policy if exists "kaptan uyeyi gunceller" on public.team_members;
create policy "kaptan uyeyi gunceller" on public.team_members for update using (
  exists (
    select 1 from public.team_members m
    where m.team_id = team_members.team_id
      and m.user_id = auth.uid()
      and m.role = 'captain'
  )
);

-- Kaptan görevleri güncelleyebilsin (atama/son gün değişikliği için).
drop policy if exists "kaptan gorev gunceller" on public.tasks;
create policy "kaptan gorev gunceller" on public.tasks for update using (
  exists (
    select 1 from public.team_members m
    where m.team_id = tasks.team_id
      and m.user_id = auth.uid()
      and m.role = 'captain'
  )
);
