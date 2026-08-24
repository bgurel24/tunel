-- ============================================================
-- Tünel — Faz 3: görünürlük sıkılaştırma  ← YAYIN ÖNCESİ ZORUNLU
--
-- SORUN
-- setup.sql'deki okuma politikaları "using (true)" idi. Anon key uygulamanın
-- içinde taşınır (web'de tarayıcı konsolundan iki tıkla görünür), yani giriş
-- yapan HERKES şunları okuyabiliyordu:
--
--   · teams.invite_code   → istediği takıma katılabilirdi        ← en kritik
--   · team_members        → bütün takımların üye listesi
--   · tasks / submissions → başka takımların görev kanıtları
--   · takıma özel postlar ve yorumlar
--
-- Bu göç OKUMAYI "kendi takımın" ile sınırlar. Yazma politikalarına dokunmaz,
-- yani onay/red, görev ekleme, katılma akışları aynen çalışmaya devam eder.
--
-- NOT: Takıma katılma `join_team_by_code` RPC'si üzerinden yürüyor ve o
-- fonksiyon security definer — davet kodunu artık kimse listeleyemese de
-- kodu bilen kişi yine katılabilir. Amaç buydu.
--
-- setup.sql + faz1_tamamlama.sql + faz2_haftalik.sql'den SONRA çalıştır.
-- Tekrar çalıştırılabilir (idempotent).
-- ============================================================


-- ============================================================
-- YARDIMCI FONKSİYONLAR
-- ============================================================
-- Hepsi security definer: politika içinden team_members'a bakmak, o tablonun
-- kendi politikasını yeniden tetikleyip sonsuz döngü yaratır. Security definer
-- fonksiyon RLS'i atladığı için döngü kırılır.

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_team_id is not null and exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_see_task(p_task_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.tasks t
    join public.team_members m on m.team_id = t.team_id
    where t.id = p_task_id and m.user_id = auth.uid()
  );
$$;

-- Bir postu görebiliyor muyum: gizli profil kuralı + sosyale açık mı /
-- kendi postum mu / takımımın postu mu.
create or replace function public.can_see_post(p_post_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and public.can_view_profile(p.user_id)
      and (
        p.shared_social
        or p.user_id = auth.uid()
        or (p.team_id is not null and exists (
              select 1 from public.team_members m
              where m.team_id = p.team_id and m.user_id = auth.uid()))
      )
  );
$$;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.can_see_task(uuid) to authenticated;
grant execute on function public.can_see_post(uuid) to authenticated;


-- ============================================================
-- 1) TAKIMLAR — davet kodu artık sızmıyor
-- ============================================================
-- Uygulama teams'i hiçbir yerde doğrudan sorgulamıyor; hep team_members
-- üzerinden gömülü geliyor (getMyTeams) ya da RPC ile. Bu yüzden kendi
-- takımlarınla sınırlamak hiçbir ekranı bozmuyor.
--
-- Liderlik tablosu `team_leaderboard()` RPC'sinden geliyor (security definer),
-- oradan yalnızca takım adı + puan dönüyor — davet kodu yok.

drop policy if exists "teams okunur" on public.teams;
create policy "teams okunur" on public.teams for select
  using (public.is_team_member(id));


-- ============================================================
-- 2) ÜYELİKLER — başka takımın kadrosu görünmesin
-- ============================================================
-- "user_id = auth.uid()" şartı önemli: kendi üyelik satırlarını her hâlükârda
-- okuyabilmelisin, yoksa "hangi takımlardayım" sorgusu kendini kilitler.

drop policy if exists "uyelikleri herkes okur" on public.team_members;
drop policy if exists "uyelikler okunur" on public.team_members;
create policy "uyelikler okunur" on public.team_members for select
  using (user_id = auth.uid() or public.is_team_member(team_id));


-- ============================================================
-- 3) GÖREVLER ve KANITLAR — takım içinde kalsın
-- ============================================================

drop policy if exists "tasks okunur" on public.tasks;
create policy "tasks okunur" on public.tasks for select
  using (public.is_team_member(team_id));

-- Kendi kanıtını her zaman görürsün (takımdan çıkmış olsan bile profilinde durur).
drop policy if exists "submissions okunur" on public.submissions;
create policy "submissions okunur" on public.submissions for select
  using (user_id = auth.uid() or public.can_see_task(task_id));


-- ============================================================
-- 4) POSTLAR — takıma özel paylaşım takım dışına çıkmasın
-- ============================================================
-- Eskiden yalnızca gizli profil kuralı vardı; takıma özel bir post, sahibinin
-- profili açıksa dışarıdan okunabiliyordu. Uygulama bunu istemci tarafında
-- filtreliyordu, artık sunucu da zorluyor.

drop policy if exists "posts okunur" on public.posts;
create policy "posts okunur" on public.posts for select using (
  public.can_view_profile(user_id)
  and (
    shared_social
    or user_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id))
  )
);


-- ============================================================
-- 5) TEPKİLER ve YORUMLAR — görebildiğin postunkiler
-- ============================================================

drop policy if exists "tepkiler okunur" on public.post_reactions;
create policy "tepkiler okunur" on public.post_reactions for select
  using (public.can_see_post(post_id));

drop policy if exists "yorumlar okunur" on public.post_comments;
create policy "yorumlar okunur" on public.post_comments for select
  using (public.can_see_post(post_id));


-- ============================================================
-- 6) PERFORMANS — politikalar bu indeksleri kullanıyor
-- ============================================================

create index if not exists team_members_user_idx on public.team_members (user_id);
create index if not exists team_members_team_user_idx on public.team_members (team_id, user_id);
create index if not exists submissions_user_idx on public.submissions (user_id);
