// Depolamaya dosya yükleme — web ve native farklı yol istiyor.
//
// WEB: fetch → Blob. Blob dosyaya bağlı kalır, gövde akıtılarak gider.
//   Dosyayı `arrayBuffer()` ile baştan sona belleğe almak iOS Safari'de büyük
//   videoda sekmeyi çökertiyor — telefon tarayıcısının bellek tavanı düşük.
//
// NATIVE: arrayBuffer. supabase-js ile React Native'in Blob'u bir arada bilinen
//   bir sorunla sessizce 0 baytlık dosya yükleyebiliyor, o yüzden native tarafta
//   çalıştığı bilinen yol korunuyor. Fotoğraflar zaten küçük; video için asıl
//   koruma seçim anındaki boyut kontrolü (bkz. MAX_UPLOAD_BYTES).

import { Platform } from 'react-native';

import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/**
 * Kabul edilen en büyük dosya. 50 kişilik takımda haftada 3 video, sıkıştırma
 * olmadan Supabase depolama/egress bütçesini hızla yiyor — üst sınır şart.
 */
export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;

export const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);

/** Dosya uzantısını içerik türünden çıkarır — iOS .mov, Android/web .mp4 verir. */
const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function extFor(contentType: string, fallback: string): string {
  return EXT_BY_TYPE[contentType] ?? fallback;
}

export function tooBigMessage(): string {
  return t('proof.tooBig', { mb: MAX_UPLOAD_MB });
}

/**
 * Yerel bir uri'yi 'posts' bucket'ına yükler.
 * Boyut sınırını aşarsa ağa hiç çıkmadan hata döner.
 */
export async function uploadToStorage(
  uri: string,
  path: string,
  contentType: string
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(uri);
    const body: Blob | ArrayBuffer =
      Platform.OS === 'web' ? await res.blob() : await res.arrayBuffer();

    const size = body instanceof ArrayBuffer ? body.byteLength : body.size;
    if (size > MAX_UPLOAD_BYTES) return { error: tooBigMessage() };

    const { error } = await supabase.storage
      .from('posts')
      .upload(path, body, { contentType, upsert: false });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : t('proof.uploadFailed') };
  }
}
