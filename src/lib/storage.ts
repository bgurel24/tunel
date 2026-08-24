// Depolama temizliği — 'posts' bucket'ında öksüz dosya bırakmamak için.
//
// NEDEN GEREKLİ
// Silme işlemleri yalnızca veritabanı satırını kaldırıyordu; video ve fotoğraflar
// depolamada sonsuza kadar kalıyordu. 50 kişilik bir takımda haftada 3 video
// yüklenirken bu doğrudan depolama faturası demek.
//
// DİKKAT EDİLEN TUZAK
// Görev kanıtı feed'e de paylaşıldığında AYNI dosya hem `submissions.video_path`
// hem `posts.video_path` tarafından gösteriliyor (bkz. gorev-yukle.tsx — video bir
// kez yükleniyor, yol iki yere yazılıyor). Bu yüzden dosyayı körlemesine silmek
// olmaz: postu silince kaptanın izleyeceği kanıt videosu kaybolurdu. Aşağıdaki
// fonksiyon silmeden önce "bu yolu gösteren başka satır var mı" diye bakıyor.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Yalnızca hiçbir satırın göstermediği yolları siler. Sessizce çalışır. */
export async function removeOrphanFiles(
  paths: (string | null | undefined)[]
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const aday = [...new Set(paths.filter((p): p is string => !!p))];
  if (aday.length === 0) return;

  try {
    // Yolu hâlâ gösteren satırlar — bunlara dokunulmayacak.
    const [subs, postVideo, postImage] = await Promise.all([
      supabase.from('submissions').select('video_path').in('video_path', aday),
      supabase.from('posts').select('video_path').in('video_path', aday),
      supabase.from('posts').select('image_path').in('image_path', aday),
    ]);

    const kullanimda = new Set<string>();
    for (const r of subs.data ?? []) if ((r as any).video_path) kullanimda.add((r as any).video_path);
    for (const r of postVideo.data ?? []) if ((r as any).video_path) kullanimda.add((r as any).video_path);
    for (const r of postImage.data ?? []) if ((r as any).image_path) kullanimda.add((r as any).image_path);

    const oksuz = aday.filter((p) => !kullanimda.has(p));
    if (oksuz.length === 0) return;

    await supabase.storage.from('posts').remove(oksuz);
  } catch {
    // Temizlik başarısız olursa kullanıcıyı durdurmuyoruz — asıl işlem (silme,
    // yükleme) zaten tamamlandı. En kötü ihtimalle dosya öksüz kalır.
  }
}

/**
 * Başka hiçbir satırın gösteremeyeceği, kesin olarak kullanıcıya ait tek bir
 * dosyayı siler (profil fotoğrafı gibi). Referans kontrolü yapmaz.
 */
export async function removeOwnFile(path: string | null | undefined): Promise<void> {
  if (!isSupabaseConfigured || !path) return;
  try {
    await supabase.storage.from('posts').remove([path]);
  } catch {
    // sessiz
  }
}
