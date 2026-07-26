// Profil fotoğrafı — varsa gerçek fotoğraf, yoksa kişiye özel gradyan + baş harfler.

import { Image, type ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { avatarGradient, initialsOf } from '@/lib/avatar';
import { gradientEnd, gradientStart } from '@/theme';

export function Avatar({
  username,
  url,
  size = 38,
  style,
}: {
  username: string;
  url?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[shape, style as StyleProp<ImageStyle>]}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <LinearGradient
      colors={avatarGradient(username)}
      start={gradientStart}
      end={gradientEnd}
      style={[shape, styles.center, style]}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>
        {initialsOf(username)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
