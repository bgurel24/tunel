// Boş ekranlar — soğuk bir "veri yok" yerine davetkâr bir kart.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import {
  colors,
  font,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  radius,
  shadow,
  spacing,
} from '@/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.wrap}>
      <View style={styles.ringOuter}>
        <LinearGradient
          colors={gradientColors}
          start={gradientStart}
          end={gradientEnd}
          style={[styles.ring, shadow.glowSoft]}
        >
          <View style={styles.ringInner}>
            <Ionicons name={icon} size={30} color={colors.accent} />
          </View>
        </LinearGradient>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient
            colors={gradientColors}
            start={gradientStart}
            end={gradientEnd}
            style={styles.action}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl * 1.6,
    paddingHorizontal: spacing.xl,
  },
  ringOuter: { marginBottom: spacing.sm },
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  body: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  actionLabel: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
});
