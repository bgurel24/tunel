-- ============================================================
-- Tünel — Faz 2
--   1) Haftalık görevler: her görevin son tarihi (verildiği an + 7 gün)
--   2) Geç yükleme takibi: kanıt son tarihten sonra mı geldi
--   3) Kaptan görevi güncelleyebilsin (süre uzatma)
--
-- Supabase panelinde: SQL Editor > New query > tamamını yapıştır > Run.
-- faz1_tamamlama.sql'den SONRA çalıştır. Tekrar çalıştırılabilir (idempotent).
-- ============================================================


-- ============================================================
-- 1) GÖREV SÜRESİ
-- ============================================================

-- Görev verildikten sonra bir hafta. Kaptan uzatabilir (aşağıdaki update politikası).
alter table public.tasks add column if not exists due_at timestamptz;
alter table public.tasks alter column due_at set default (now() + interval '7 days');

-- Eski görevlere de kendi haftasını yaz — rapor geçmişe dönük çalışsın.
update public.tasks set due_at = created_at + interval '7 days' where due_at is null;

-- Haftalık rapor "son tarihi bu hafta içinde olan görevler"i sorar.
create index if not exists tasks_due_idx on public.tasks (team_id, due_at);


-- ============================================================
-- 2) GEÇ YÜKLEME
-- ============================================================

-- created_at ilk gönderimi tutuyor; yeniden yüklemede değişmiyor. Raporun
-- "geç geldi mi" sorusuna cevap verebilmesi için son gönderim anı ayrı durur.
alter table public.submissions add column if not exists submitted_at timestamptz;
update public.submissions set submitted_at = created_at where submitted_at is null;
alter table public.submissions alter column submitted_at set default now();

-- Karar damgası (faz 1) + gönderim damgası tek trigger'da.
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

  -- Yeni video ya da reddedilmiş kanıtın tekrarı → gönderim anı tazelenir.
  if new.status = 'pending'
     and (new.video_path is distinct from old.video_path
          or old.status is distinct from 'pending') then
    new.submitted_at := now();
  end if;

  return new;
end; $$;

create or replace trigger trg_submission_decision
  before update on public.submissions
  for each row execute function public.stamp_submission_decision();


-- ============================================================
-- 3) KAPTAN GÖREVİ GÜNCELLER (süre uzatma)
-- ============================================================

drop policy if exists "kaptan gorev gunceller" on public.tasks;
create policy "kaptan gorev gunceller" on public.tasks for update
  using (
    exists (select 1 from public.team_members m
            where m.team_id = tasks.team_id and m.user_id = auth.uid() and m.role = 'captain')
  )
  with check (
    exists (select 1 from public.team_members m
            where m.team_id = tasks.team_id and m.user_id = auth.uid() and m.role = 'captain')
  );
