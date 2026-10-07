# Tünel 🏟️

Gym/takım odaklı sosyal uygulama — anlık pump paylaşımı, haftalık görevler, kaptan onayı,
liderlik tablosu ve şarkılı paylaşımlar. React Native + Expo (dark neon tema).

Ürün planı ve kararlar için üst klasördeki `PLAN.md` dosyasına bakın.

## Teknoloji
- Expo SDK 54 + expo-router (dosya tabanlı yönlendirme) + TypeScript
- Supabase (Auth + Postgres + Storage) — kimlik ve veri
- react-native-svg (logo), expo-linear-gradient (marka gradyanı)

## Kurulum

1. Bağımlılıklar (zaten kurulu; tekrar gerekirse):
   ```bash
   npm install
   ```

2. Supabase bağlantısı:
   - [supabase.com](https://supabase.com) üzerinde yeni proje oluşturun.
   - `Project Settings > API` altındaki URL ve anon key'i alın.
   - `.env.example` dosyasını `.env` olarak kopyalayıp doldurun:
     ```bash
     cp .env.example .env
     ```
   - Supabase SQL Editor'de **sırayla** çalıştırın:
     1. `supabase/setup.sql` — tablolar, RLS, RPC'ler, storage (Faz 0 + Faz 1)
     2. `supabase/faz1_tamamlama.sql` — görev–paylaşım bağı, red sebebi, rol RPC'leri, bildirimler

     > İkinci dosya **zorunlu**: uygulama `posts.task_id`, `submissions.reject_note` ve
     > `notifications` tablosunu bekliyor. Çalıştırılmazsa akış ve bildirimler boş gelir.

3. Uygulamayı başlatın:
   ```bash
   npx expo start
   ```
   Telefonda **Expo Go** ile QR okutun, ya da `i` (iOS simülatör) / `a` (Android emülatör).

> Not: `.env` doldurulmadan da uygulama **demo modunda** açılır (sekmeler görünür),
> ancak giriş/kayıt ve takıma katılma Supabase bağlanınca çalışır.

## Yapı (Faz 0)
```
src/
  app/
    _layout.tsx            kök: tema + auth + Stack
    (auth)/                giriş, kayıt
    (tabs)/                akış, keşfet, görevler, profil
    join-team.tsx          davet koduyla takıma katıl
    paylas.tsx             paylaş (modal, Faz 1)
  components/              Logo, GradientButton, Field, Screen, TabBar, Placeholder
  lib/                     supabase client, auth context
  theme.ts                marka renkleri / gradyan / boşluklar
supabase/setup.sql         veritabanı şeması (tek dosya kurulum)
supabase/faz1_tamamlama.sql  görev bağı + roller + bildirimler göçü
supabase/functions/push/   Expo push gönderen Edge Function
```

## İdman / katılım (yoklama) — Faz 9

- `supabase/faz9_etkinlik_katilim.sql` dosyasını faz8'den sonra SQL Editor'de çalıştır.
- Takımın sahibi **Üyeler** ekranından bir üyeyi **Koç** yapar. Koç idman açar, düzenler, siler;
  yoklamayı ve katılım istatistiklerini görür. Kaptanlar idman açamaz, koçların kaptan yetkisi yoktur.
- Sporcu ana sayfadaki "Sonraki idman" kartından tek dokunuşla cevap verir:
  Katılacağım / Belli değil / Katılmayacağım. Son bildirim zamanından sonra verilen cevap
  kaydedilir ama koçta "Geç bildirdi" olarak görünür.
- Hatırlatma: `send_event_reminders()` başlamasına 3 saat kalan idmanlarda cevap vermeyenlere
  bildirim düşer. Supabase → Database → Cron'da 15 dakikada bir çalıştır:
  `select cron.schedule('etkinlik-hatirlatma', '*/15 * * * *', $$select public.send_event_reminders(interval '3 hours')$$);`

## Şifremi unuttum

Uygulama e-postaya **kod** gönderir. Kodun e-postada görünmesi için Supabase →
Authentication → Email Templates → **Reset Password** şablonuna `{{ .Token }}` ekle, ör.:
`<p>Tünel şifre sıfırlama kodun: <strong>{{ .Token }}</strong></p>`

## Bildirimler

- **Uygulama açıkken:** Supabase Realtime + yerel bildirim. Expo Go dahil her yerde çalışır,
  ek kurulum gerektirmez.
- **Uygulama kapalıyken (uzaktan push):** Expo Go'da **çalışmaz** (SDK 53+ kısıtı), development
  build gerekir. Kurulum adımları `supabase/functions/push/index.ts` başındaki yorumda:
  fonksiyonu deploy edip `pg_cron` ile dakikada bir tetiklemek yeterli.

## Yol haritası
- **Faz 0 (bu):** tema, logo, giriş/kayıt, takıma katılma, tab iskeleti ✅
- **Faz 1:** anlık kamera + feed + görevler + kanıt yükleme + kaptan onayı + liderlik + bildirim
- **Faz 2:** streak/rozet, ağırlık takibi + grafik, sezonluk ödül, Spotify şarkı ekleme
