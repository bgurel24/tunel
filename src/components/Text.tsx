// Marka fontlu Text. react-native'in Text'i yerine her ekranda bu kullanılır.
//
// Özel fontlarda fontWeight çalışmaz (her ağırlık ayrı dosya). Burada mevcut
// stillerdeki fontWeight'i doğru Inter dosyasına çeviriyoruz; başlıklarda
// fontFamily: font.display verilirse ona dokunmuyoruz.

import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

import { font } from '@/theme';

const BY_WEIGHT: Record<string, string> = {
  '100': font.body,
  '200': font.body,
  '300': font.body,
  '400': font.body,
  normal: font.body,
  '500': font.bodyMedium,
  '600': font.bodySemi,
  '700': 'Inter_700Bold',
  '800': 'Inter_700Bold',
  '900': 'Inter_700Bold',
  bold: 'Inter_700Bold',
};

export function Text({ style, ...rest }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const family =
    flat.fontFamily ?? BY_WEIGHT[String(flat.fontWeight ?? '400')] ?? font.body;

  return (
    <RNText
      {...rest}
      style={[style, { fontFamily: family, fontWeight: undefined }]}
    />
  );
}
