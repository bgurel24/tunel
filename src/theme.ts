// Tünel marka teması — tek, sabit koyu palet.
//
// Uygulama karanlık mod öncelikli tasarlandı: logo siyah zeminli, feed'deki
// fotoğraf/video koyu zeminde daha iyi duruyor. Aydınlık tema ve vurgu rengi
// seçici kaldırıldı — palet artık çalışma anında değişmiyor.
//
// `makeStyles` ve `useThemeTick` çağrı yerlerini bozmamak için duruyor:
// palet sabit olduğu için ilki fabrikayı bir kez çalıştırıp tabloyu döndürür,
// ikincisi de bir şey yapmaz. (İstenirse ikisi de call site'lardan temizlenip
// `StyleSheet.create`'e dönülebilir; davranış değişmez.)

import { Platform, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

/** Marka gradyanı — magenta → turuncu. Logodan geliyor. */
const BRAND = { from: '#FF3D71', mid: '#FF6B4A', to: '#FF8A3D' } as const;

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

function buildPalette(): Palette {
  const accent = BRAND.to;
  const base = {
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
  };

  return {
    ...base,
    brandFrom: BRAND.from,
    brandMid: BRAND.mid,
    brandTo: BRAND.to,
    magenta: BRAND.from,
    accent,
    onBrand: '#FFFFFF',
    brandBg: alpha(BRAND.from, 0.12),
    brandBgSoft: alpha(BRAND.from, 0.07),
    accentBg: alpha(accent, 0.13),
    successBg: alpha(base.success, 0.14),
    warningBg: alpha(base.warning, 0.14),
    dangerBg: alpha(base.danger, 0.14),
  };
}

/** Uygulamanın tek paleti. */
export const colors: Palette = buildPalette();

/** LinearGradient / SVG için ortak gradyan durakları. */
export const gradientColors: [string, string, string] = [
  colors.brandFrom,
  colors.brandMid,
  colors.brandTo,
];
export const gradientStart = { x: 0, y: 0 } as const;
export const gradientEnd = { x: 1, y: 1 } as const;

/** Kart/medya üzerine serilen okunabilirlik perdesi. */
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

export const shadow = {
  card: shade('#000000', 0.45, 12, 4),
  raised: shade('#000000', 0.55, 20, 8),
};

// ---------------------------------------------------------------------------

type Style = ViewStyle | TextStyle | ImageStyle;

/** `StyleSheet.create` yerine — paleti fabrikaya verip tabloyu döndürür. */
export function makeStyles<T extends Record<string, Style>>(factory: (c: Palette) => T): T {
  return factory(colors);
}

/** Palet sabit olduğu için bir şey yapmaz; çağrı yerleri korunsun diye duruyor. */
export function useThemeTick(): number {
  return 0;
}
