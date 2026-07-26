// Antrenman etiketleri. Veritabanında Türkçe değer duruyor (posts.workout_tag);
// ekranda dile göre çevrilir, bilinmeyen değer olduğu gibi gösterilir.

import type { Ionicons } from '@expo/vector-icons';

import type { TranslationKey } from '@/lib/i18n';

export type WorkoutTag = {
  value: string;
  key: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
};

export const WORKOUT_TAGS: WorkoutTag[] = [
  { value: 'Göğüs', key: 'tag.chest', icon: 'body-outline' },
  { value: 'Sırt', key: 'tag.back', icon: 'accessibility-outline' },
  { value: 'Bacak', key: 'tag.legs', icon: 'walk-outline' },
  { value: 'Omuz', key: 'tag.shoulders', icon: 'barbell-outline' },
  { value: 'Kol', key: 'tag.arms', icon: 'fitness-outline' },
  { value: 'Kardiyo', key: 'tag.cardio', icon: 'heart-outline' },
  { value: 'Full body', key: 'tag.fullBody', icon: 'flame-outline' },
];

export function tagKeyOf(value: string): TranslationKey | null {
  return WORKOUT_TAGS.find((t) => t.value === value)?.key ?? null;
}
