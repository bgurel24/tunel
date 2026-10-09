-- ============================================================
-- Tünel — Faz 6: Kişiye özel görev atama + rookie takibi
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını
-- yapıştır > Run. Tekrar çalıştırılabilir (idempotent).
-- faz5_yardimci_kaptan.sql'den SONRA çalıştırın.
-- ============================================================

-- Görevler: kişiye özel atama (null = tüm takım).
-- Not: son tarih için ayrı bir kolon açmıyoruz — faz2_haftalik.sql'deki
-- due_at (timestamptz) kullanılıyor, geç yükleme ve süre uzatma ona bağlı.
alter table public.tasks add column if not exists assigned_to uuid[];

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
