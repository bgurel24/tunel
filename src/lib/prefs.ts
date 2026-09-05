// Kullanıcı tercihleri — dil, titreşim, video, birim...
//
// React context değil, küçük bir dış depo (useSyncExternalStore). Böylece
// React dışındaki yardımcılar da (haptics.ts gibi) anlık değeri okuyabiliyor.
// Tek AsyncStorage anahtarında JSON olarak saklanır.
//
// Not: tema tek ve sabit (koyu) — burada tema tercihi yok.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'tunel.prefs.v1';

export type Lang = 'tr' | 'en';
export type Units = 'kg' | 'lb';
export type ShareTarget = 'team' | 'social' | 'both';

export type Prefs = {
  lang: Lang;
  /** Dokunmatik geri bildirim (titreşim). */
  haptics: boolean;
  /** Konfeti / kutlama animasyonları. */
  celebrations: boolean;
  /**
   * Akışta videolar kendiliğinden oynasın. Varsayılan kapalı: açıkken kaydırılan
   * her video indiriliyor ve mobil veri / Supabase bant genişliği hızla eriyor.
   */
  autoplay: boolean;
  /** Ağırlık birimi — PR ekranı. */
  units: Units;
  /** Haftalık antrenman hedefi (gün). */
  weeklyGoal: number;
  /** Paylaşım ekranı açılışında seçili hedef. */
  defaultShare: ShareTarget;
};

function deviceLang(): Lang {
  try {
    const locale = new Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

export const DEFAULT_PREFS: Prefs = {
  lang: deviceLang(),
  haptics: true,
  celebrations: true,
  autoplay: false,
  units: 'kg',
  weeklyGoal: 4,
  defaultShare: 'team',
};

let prefs: Prefs = { ...DEFAULT_PREFS };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot() {
  return prefs;
}

/** Anlık tercihler — React dışında da okunabilir. */
export function getPrefs(): Prefs {
  return prefs;
}

/** Tercihleri dinleyen hook; değişince bileşen yeniden çizilir. */
export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Tek bir tercihi dinler. */
export function usePref<K extends keyof Prefs>(key: K): Prefs[K] {
  return usePrefs()[key];
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
}

/** Tek tercihi değiştirir ve kaydeder. */
export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  if (prefs[key] === value) return;
  prefs = { ...prefs, [key]: value };
  persist();
  emit();
}

/** Tümünü varsayılana döndürür. */
export function resetPrefs() {
  prefs = { ...DEFAULT_PREFS };
  persist();
  emit();
}

/** Açılışta bir kez — kayıtlı tercihleri okur. */
export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Prefs>;
      prefs = { ...DEFAULT_PREFS, ...saved };
    }
  } catch {
    // bozuk kayıt — varsayılanla devam
  }
  emit();
  return prefs;
}
