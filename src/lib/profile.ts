// Profil fotoğrafı — 'posts' bucket'ında <uid>/avatar-<zaman>.jpg olarak durur,
// yolu profiles.avatar_path'te tutulur.

import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { removeOwnFile } from '@/lib/storage';
import { uploadToStorage } from '@/lib/upload';

export type MyProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  /** Gizli profil: paylaşımları ve rekorları yalnızca takım arkadaşları görür. */
  isPrivate: boolean;
};

export type PublicProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  /** Gizliyse ve takım arkadaşı değilsem false — ekran kilitli gösterilir. */
  canView: boolean;
};

/** Depolama yolunu herkese açık URL'ye çevirir. */
export function avatarUrlFrom(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  if (!isSupabaseConfigured) return null;
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_path, is_private')
    .eq('id', uid)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    avatarUrl: avatarUrlFrom(data.avatar_path),
    isPrivate: !!(data as any).is_private,
  };
}

/** Başka bir kullanıcının profil başlığı + görme iznim. */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured) return null;

  const [{ data }, { data: allowed }] = await Promise.all([
    supabase.from('profiles').select('id, username, avatar_path, is_private').eq('id', userId).maybeSingle(),
    supabase.rpc('can_view_profile', { p_target: userId }),
  ]);

  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    avatarUrl: avatarUrlFrom(data.avatar_path),
    isPrivate: !!(data as any).is_private,
    canView: allowed !== false,
  };
}

/** Gizli profil ayarını değiştirir. */
export async function setProfilePrivacy(isPrivate: boolean): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: t('err.notConfigured') };
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: t('err.noSession') };

  const { error } = await supabase.from('profiles').update({ is_private: isPrivate }).eq('id', uid);
  return { error: error?.message ?? null };
}

/** Galeriden kare bir fotoğraf seçtirir. İptal edilirse null döner. */
export async function pickAvatarImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });

  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

export async function uploadAvatar(
  uri: string
): Promise<{ error: string | null; avatarUrl?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: t('err.noSession') };

  // Her yükleme yeni bir dosya adı üretiyor; eskisini silmezsek kullanıcı
  // fotoğrafını her değiştirdiğinde depolamada bir dosya daha birikirdi.
  const { data: onceki } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', uid)
    .maybeSingle();

  try {
    const path = `${uid}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await uploadToStorage(uri, path, 'image/jpeg');
    if (upErr) return { error: upErr };

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ avatar_path: path })
      .eq('id', uid);
    if (updErr) return { error: updErr.message };

    const eski = (onceki as any)?.avatar_path as string | undefined;
    if (eski && eski !== path) await removeOwnFile(eski);

    return { error: null, avatarUrl: avatarUrlFrom(path) ?? undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Fotoğraf yüklenemedi' };
  }
}
