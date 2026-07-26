// Tünel marka teması — çalışma anında değişebilen palet.
//
// Nasıl çalışıyor:
// - `colors` MUTASYONA UĞRAYAN tek bir nesne. Tema değişince içeriği değişir,
//   render sırasında okunan her `colors.x` yeni değeri görür.
// - Stil tabloları `StyleSheet.create` yerine `makeStyles((colors) => ({...}))`
//   ile kurulur. Fabrika kaydedilir; tema değişince yeniden çalıştırılıp aynı
//   nesnenin içi tazelenir (alt stil nesneleri yenilenir → React değişimi görür).
// - Ekranların yeniden çizilmesi için bileşenin başında `useThemeTick()` çağrılır.
//
// Tercihler (mod/vurgu rengi) `src/lib/prefs.ts` içinde tutulur; burası sadece
// paleti üretir ve uygular.

import { useSyncExternalStore } from 'react';
import { Platform, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedMode = 'dark' | 'light';
export type AccentId = 'ember' | 'ice' | 'toxic' | 'violet' | 'gold' | 'steel';

/** Vurgu renkleri. `ink` aydınlık zeminde okunabilir koyu karşılığı. */
export const ACCENTS = {
  ember: { from: '#FF3D71', mid: '#FF6B4A', to: '#FF8A3D', ink: '#D93A12' },
  ice: { from: '#2E6BFF', mid: '#3DA5FF', to: '#35D6E8', ink: '#0B63C5' },
  toxic: { from: '#22C55E', mid: '#5CE07A', to: '#B6F03D', ink: '#0E8F55' },
  violet: { from: '#7B5CFF', mid: '#A855F7', to: '#E24BE0', ink: '#6D3BE0' },
  gold: { from: '#FF9F1A', mid: '#FFC93D', to: '#FFE45E', ink: '#A96A00' },
  steel: { from: '#5B6473', mid: '#8A94A6', to: '#C3CBDA', ink: '#3A4250' },
} as const satisfies Record<AccentId, { from: string; mid: string; to: string; ink: string }>;

export const ACCENT_ORDER: AccentId[] = ['ember', 'ice', 'toxic', 'violet', 'gold', 'steel'];

/** #RRGGBB → rgba(r,g,b,a) — gradyan/perde tonlarını renkten türetmek için. */
export function withAlpha(hex: string, a: number) {
  return alpha(hex, a);
}

function alpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export type Palette = {
  bg: string;
  bgElevated: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  lineSoft: string;
  lineStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  brandFrom: string;
  brandMid: string;
  brandTo: string;
  magenta: string;
  accent: string;
  onBrand: string;
  brandBg: string;
  brandBgSoft: string;
  accentBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  glass: string;
  scrim: string;
};

function buildPalette(mode: ResolvedMode, accentId: AccentId): Palette {
  const a = ACCENTS[accentId];
  const dark = mode === 'dark';
  const accent = dark ? a.to : a.ink;

  const base = dark
    ? {
        bg: '#08080B',
        bgElevated: '#0E0E13',
        surface: '#131319',
        surface2: '#1C1C24',
        surface3: '#26262F',
        line: 'rgba(255,255,255,0.08)',
        lineSoft: 'rgba(255,255,255,0.05)',
        lineStrong: 'rgba(255,255,255,0.14)',
        text: '#F5F5F8',
        textDim: '#9C9CA8',
        textFaint: '#64646E',
        success: '#3DDC97',
        warning: '#FFB020',
        danger: '#FF5A6E',
        glass: 'rgba(12,12,16,0.72)',
        scrim: 'rgba(0,0,0,0.55)',
      }
    : {
        bg: '#F6F6F9',
        bgElevated: '#FFFFFF',
        surface: '#FFFFFF',
        surface2: '#EFEFF4',
        surface3: '#E3E3EA',
        line: 'rgba(9,9,20,0.10)',
        lineSoft: 'rgba(9,9,20,0.06)',
        lineStrong: 'rgba(9,9,20,0.18)',
        text: '#0E0E14',
        textDim: '#5B5B68',
        textFaint: '#8B8B99',
        success: '#0F9D6B',
        warning: '#B26A00',
        danger: '#DC2B45',
        glass: 'rgba(255,255,255,0.80)',
        scrim: 'rgba(0,0,0,0.35)',
      };

  return {
    ...base,
    brandFrom: a.from,
    brandMid: a.mid,
    brandTo: a.to,
    magenta: a.from,
    accent,
    onBrand: '#FFFFFF',
    brandBg: alpha(dark ? a.from : a.ink, dark ? 0.12 : 0.1),
    brandBgSoft: alpha(dark ? a.from : a.ink, dark ? 0.07 : 0.06),
    accentBg: alpha(accent, dark ? 0.13 : 0.12),
    successBg: alpha(base.success, dark ? 0.14 : 0.12),
    warningBg: alpha(base.warning, dark ? 0.14 : 0.12),
    dangerBg: alpha(base.danger, dark ? 0.14 : 0.12),
  };
}

/** Canlı palet — tema değişince içeriği değişir, referansı sabit kalır. */
export const colors: Palette = buildPalette('dark', 'ember');

/** Palet dışı tema bilgisi (blur tonu, durum çubuğu vb. için). */
export const themeInfo = {
  mode: 'dark' as ResolvedMode,
  accent: 'ember' as AccentId,
  isDark: true,
  blurTint: 'dark' as 'dark' | 'light',
  statusBar: 'light' as 'light' | 'dark',
};

/** LinearGradient / SVG için ortak gradyan durakları (yerinde güncellenir). */
export const gradientColors: [string, string, string] = [
  colors.brandFrom,
  colors.brandMid,
  colors.brandTo,
];
export const gradientStart = { x: 0, y: 0 } as const;
export const gradientEnd = { x: 1, y: 1 } as const;

/** Kart/medya üzerine serilen okunabilirlik perdesi (her iki modda koyu). */
export const scrimGradient = ['transparent', 'rgba(0,0,0,0.55)'] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 30,
  display: 38,
} as const;

// Tipografi — başlıklar/sayılar Sora, gövde Inter (src/lib/fonts.ts yükler).
export const font = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  display: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
} as const;

// Sayılar için hizalı rakam — sıralama/puan/sayaçlarda zıplamayı önler.
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

// Gölgeler: iOS'ta shadow*, Android'de elevation.
function shade(color: string, opacity: number, radiusPx: number, elevation: number) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: radiusPx / 3 },
    },
    android: { elevation },
    default: {},
  })!;
}

function buildShadows(p: Palette, mode: ResolvedMode) {
  const dark = mode === 'dark';
  return {
    card: shade('#000000', dark ? 0.45 : 0.08, 12, 4),
    raised: shade('#000000', dark ? 0.55 : 0.12, 20, 8),
    // Marka rengiyle "neon" hâle — gradyan butonlar ve aktif sekme için.
    glow: shade(p.brandFrom, dark ? 0.45 : 0.28, 16, 10),
    glowSoft: shade(p.brandFrom, dark ? 0.28 : 0.16, 10, 5),
  };
}

export const shadow = buildShadows(colors, 'dark') as ReturnType<typeof buildShadows>;

// ---------------------------------------------------------------------------
// Stil kayıt defteri — tema değişince tüm stil tabloları tazelenir.
// ---------------------------------------------------------------------------

type Style = ViewStyle | TextStyle | ImageStyle;
type Registered = { table: Record<string, Style>; factory: (c: Palette) => Record<string, Style> };

const registry: Registered[] = [];

/**
 * `StyleSheet.create` yerine kullanılır. Fabrika tema değişiminde yeniden
 * çalışır; dönen tablo aynı referanstır, içi tazelenir.
 */
export function makeStyles<T extends Record<string, Style>>(factory: (c: Palette) => T): T {
  const table = factory(colors);
  registry.push({ table, factory: factory as (c: Palette) => Record<string, Style> });
  return table;
}

let version = 0;
const listeners = new Set<() => void>();

function getVersion() {
  return version;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Tema değişimini dinler. Stil tablosu kullanan her ekranın/bileşenin en
 * üstünde bir kez çağrılmalı — yoksa renkler değişse de ekran yeniden çizilmez.
 */
export function useThemeTick(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

/** Paleti değiştirir ve tüm stil tablolarını + ekranları tazeler. */
export function applyTheme(mode: ResolvedMode, accent: AccentId) {
  const p = buildPalette(mode, accent);

  Object.assign(colors, p);
  Object.assign(shadow, buildShadows(p, mode));
  gradientColors[0] = p.brandFrom;
  gradientColors[1] = p.brandMid;
  gradientColors[2] = p.brandTo;

  themeInfo.mode = mode;
  themeInfo.accent = accent;
  themeInfo.isDark = mode === 'dark';
  themeInfo.blurTint = mode === 'dark' ? 'dark' : 'light';
  themeInfo.statusBar = mode === 'dark' ? 'light' : 'dark';

  for (const entry of registry) {
    const fresh = entry.factory(colors);
    for (const key of Object.keys(entry.table)) delete entry.table[key];
    Object.assign(entry.table, fresh);
  }

  version += 1;
  listeners.forEach((fn) => fn());
}
