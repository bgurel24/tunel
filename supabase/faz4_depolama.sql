-- ============================================================
-- Tünel — Faz 4: depolama temizliği
--
-- SORUN
-- Hiçbir yerde dosya silinmiyordu. Post/görev silinince yalnızca veritabanı
-- satırı gidiyor, video 'posts' bucket'ında sonsuza kadar kalıyordu. Reddedilen
-- kanıt tekrar yüklenince eskisi öksüz kalıyor, profil fotoğrafı değişince
-- eskisi duruyordu. 50 kişi × haftada 3 video ölçeğinde bu doğrudan fatura.
--
-- Depolamada SELECT ve INSERT politikaları vardı ama DELETE yoktu — istemciden
-- silme denemesi sessizce başarısız olurdu. Bu göç iki silme yolu açıyor.
--
-- faz3_guvenlik.sql'den SONRA çalıştır. Tekrar çalıştırılabilir.
-- ============================================================


-- ========== 1) Kendi dosyanı silebilirsin ==========
-- Dosyalar <uid>/... yolunda durduğu için klasör adı sahipliği belirliyor.
-- Kendi postunu silmek, profil fotoğrafını değiştirmek, reddedilen kanıtı
-- yeniden yüklemek bu politikayla temizlenir.

drop policy if exists "kendi dosyasini siler" on storage.objects;
create policy "kendi dosyasini siler" on storage.objects for delete
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ========== 2) Kaptan, takımının kanıt dosyasını silebilir ==========
-- Görev silinince o göreve yüklenmiş kanıt videoları da gitmeli. Videolar
-- üyelerin klasöründe durduğu için yukarıdaki politika kaptana yetmiyor.
--
-- ÖNEMLİ: uygulama dosyaları görev silinmeden ÖNCE siliyor. Görev silinince
-- submissions satırları cascade ile gittiği için, sonra silmeye çalışsak bu
-- politika artık eşleşmezdi.

drop policy if exists "kaptan kanit dosyasini siler" on storage.objects;
create policy "kaptan kanit dosyasini siler" on storage.objects for delete
  using (
    bucket_id = 'posts'
    and exists (
      select 1
      from public.submissions s
      join public.tasks t on t.id = s.task_id
      join public.team_members m on m.team_id = t.team_id
      where s.video_path = storage.objects.name
        and m.user_id = auth.uid()
        and m.role = 'captain'
    )
  );


-- ========== 3) Yol aramaları için indeksler ==========
-- Yukarıdaki politika ve uygulamanın "bu dosya başka yerde kullanılıyor mu"
-- kontrolü bu sütunlar üzerinden arıyor.

create index if not exists submissions_video_path_idx
  on public.submissions (video_path) where video_path is not null;
create index if not exists posts_video_path_idx
  on public.posts (video_path) where video_path is not null;
create index if not exists posts_image_path_idx
  on public.posts (image_path) where image_path is not null;
