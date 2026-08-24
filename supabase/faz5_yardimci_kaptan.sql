-- ============================================================
-- Tünel — Faz 5: yardımcı kaptan
--
-- Kaptan artık başkalarına da kaptan yetkisi verebiliyor. Sayı sınırı yok.
--
-- YETKİ MODELİ (ikisi zaten ayrıydı, bu göç üstüne bir şey uydurmuyor)
--   role = 'captain'        → görev ekle/sil/süre uzat, kanıt onayla/reddet,
--                             kanıt dosyası sil, ÜYE ÇIKAR
--   teams.captain_id        → takım adı, davet kodu, takımı silme,
--                             kaptanlığı devretme, YETKİ VERME/ALMA
--
-- Yani yardımcı kaptanlar günlük işi yürütür; takımın sahipliği tek kişide kalır.
--
-- faz4_depolama.sql'den SONRA çalıştır. Tekrar çalıştırılabilir.
-- ============================================================


-- ========== 1) Yetki ver / geri al ==========
-- Yalnızca takımın sahibi (captain_id) çağırabilir. Yardımcı kaptanlar
-- birbirinin yetkisiyle oynayamaz — yoksa biri diğerini indirip takımı ele
-- geçirebilirdi.

create or replace function public.set_member_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('captain', 'member') then
    raise exception 'Geçersiz rol';
  end if;

  if not exists (
    select 1 from public.teams where id = p_team_id and captain_id = auth.uid()
  ) then
    raise exception 'Bu takımın sahibi değilsin';
  end if;

  -- Sahibin kendi rolü buradan değişmez; onun yolu transfer_captaincy.
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


-- ========== 2) Üye çıkarmayı yardımcı kaptanlara da aç ==========
-- Eskiden yalnızca captain_id çıkarabiliyordu. Artık kaptan yetkisi olan herkes
-- çıkarabiliyor — ama TAKIMIN SAHİBİ çıkarılamaz, yoksa yardımcı kaptan asıl
-- kaptanı takımdan atabilirdi.

create or replace function public.remove_member(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and role = 'captain'
  ) then
    raise exception 'Bu takımda kaptan yetkin yok';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Kendini çıkaramazsın — takımdan ayrıl ya da kaptanlığı devret';
  end if;

  if exists (
    select 1 from public.teams where id = p_team_id and captain_id = p_user_id
  ) then
    raise exception 'Takımın sahibi çıkarılamaz';
  end if;

  delete from public.team_members where team_id = p_team_id and user_id = p_user_id;
  if not found then
    raise exception 'Bu kişi takımda değil';
  end if;
end; $$;

grant execute on function public.remove_member(uuid, uuid) to authenticated;


-- ========== 3) Kaptanlık devrinde yardımcıların rolü korunsun ==========
-- Eski hali "eski kaptan üye olur, yeni kaptan olur" diyordu ve yardımcıları
-- görmezden geliyordu. Devir sonrası yardımcılar yardımcı kalmaya devam etsin,
-- yalnızca sahiplik el değiştirsin.

create or replace function public.transfer_captaincy(p_team_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.teams where id = p_team_id and captain_id = auth.uid()) then
    raise exception 'Bu takımın sahibi değilsin';
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

grant execute on function public.transfer_captaincy(uuid, uuid) to authenticated;
