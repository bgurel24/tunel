// Profil fotoğrafı — 'posts' bucket'ında <uid>/avatar-<zaman>.jpg olarak durur,
// yolu profiles.avatar_path'te tutulur.

import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type MyProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
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
    .select('id, username, avatar_path')
    .eq('id', uid)
    .single();

  if (!data) return null;
  return { id: data.id, username: data.username, avatarUrl: avatarUrlFrom(data.avatar_path) };
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
  if (!uid) return { error: 'Oturum bulunamadı' };

  try {
    const res = await fetch(uri);
    const arrayBuffer = await res.arrayBuffer();
    const path = `${uid}/avatar-${Date.now()}.jpg`;

    const { error: upErr } = await supabase.storage
      .from('posts')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (upErr) return { error: upErr.message };

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ avatar_path: path })
      .eq('id', uid);
    if (updErr) return { error: updErr.message };

    return { error: null, avatarUrl: avatarUrlFrom(path) ?? undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Fotoğraf yüklenemedi' };
  }
}
