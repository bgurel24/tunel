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
   - `supabase/schema.sql` içeriğini Supabase SQL Editor'de çalıştırın (tablolar + RLS + RPC).

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
supabase/schema.sql        veritabanı şeması
```

## Yol haritası
- **Faz 0 (bu):** tema, logo, giriş/kayıt, takıma katılma, tab iskeleti ✅
- **Faz 1:** anlık kamera + feed + görevler + kanıt yükleme + kaptan onayı + liderlik + bildirim
- **Faz 2:** streak/rozet, ağırlık takibi + grafik, sezonluk ödül, Spotify şarkı ekleme
