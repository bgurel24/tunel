// Hesap işlemleri — kullanıcı adı, şifre, hesap silme.
// Ayarlar ekranından kullanılır.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';

type Result = { error: string | null };

/** Kullanıcı adını hem profiles tablosunda hem oturum verisinde günceller. */
export async function updateUsername(next: string): Promise<Result & { taken?: boolean }> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const name = next.trim();

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: t('err.noSession') };

  const { error } = await supabase.from('profiles').update({ username: name }).eq('id', uid);
  if (error) {
    // 23505: unique kısıtı — isim alınmış
    if (error.code === '23505') return { error: error.message, taken: true };
    return { error: error.message };
  }

  // Profil ekranı adı oturum verisinden okuyor, orayı da güncelle.
  const { error: metaError } = await supabase.auth.updateUser({ data: { username: name } });
  if (metaError) return { error: metaError.message };

  return { error: null };
}

export async function updatePassword(next: string): Promise<Result> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const { error } = await supabase.auth.updateUser({ password: next });
  return { error: error?.message ?? null };
}

/**
 * Hesabı tamamen siler (auth.users satırı → her şey cascade ile gider).
 * Sunucu tarafı: supabase/setup.sql içindeki delete_my_account() fonksiyonu.
 */
export async function deleteMyAccount(): Promise<Result> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  return { error: null };
}
