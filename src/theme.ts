// Tünel marka teması — "Rafine Ember" (dark neon, logodan türetildi).
// Tek kaynak: renkler, gradyan, tipografi, boşluklar, köşe yarıçapları, gölge/glow.

import { Platform, type TextStyle } from 'react-native';

export const colors = {
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

  // Marka gradyanı (magenta -> mercan -> turuncu)
  brandFrom: '#FF3D71',
  brandMid: '#FF6B4A',
  brandTo: '#FF8A3D',
  magenta: '#FF3D71',
  accent: '#FF8A3D',

  // Marka tonlarının düşük opaklıklı zeminleri
  brandBg: 'rgba(255,61,113,0.12)',
  brandBgSoft: 'rgba(255,61,113,0.07)',
  accentBg: 'rgba(255,138,61,0.13)',

  // Durum renkleri (koyu zeminde düşük doygunluk)
  success: '#3DDC97',
  successBg: 'rgba(61,220,151,0.14)',
  warning: '#FFB020',
  warningBg: 'rgba(255,176,32,0.14)',
  danger: '#FF5A6E',
  dangerBg: 'rgba(255,90,110,0.14)',

  // Cam/blur yüzeylerin altına serilen ton
  glass: 'rgba(12,12,16,0.72)',
  scrim: 'rgba(0,0,0,0.55)',
} as const;

// LinearGradient / SVG için ortak gradyan durakları
export const gradientColors = ['#FF3D71', '#FF6B4A', '#FF8A3D'] as const;
export const gradientStart = { x: 0, y: 0 } as const;
export const gradientEnd = { x: 1, y: 1 } as const;

// Kart/medya üzerine serilen okunabilirlik perdesi
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
  // Marka rengiyle "neon" hâle — gradyan butonlar ve aktif sekme için.
  glow: shade(colors.brandFrom, 0.45, 16, 10),
  glowSoft: shade(colors.brandFrom, 0.28, 10, 5),
} as const;
