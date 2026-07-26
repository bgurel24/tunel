// Yükleme iskeletleri — spinner yerine içeriğin şeklini gösteren parlayan bloklar.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, makeStyles, radius, spacing, themeInfo, useThemeTick } from '@/theme';

type BoxProps = {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
};

// Parıltı — koyu temada beyaz, aydınlıkta siyah tonu.
const shimmer = (): [string, string, string] => [
  'transparent',
  themeInfo.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  'transparent',
];

export function Skeleton({ width = '100%', height = 14, rounded = radius.sm, style }: BoxProps) {
  useThemeTick();
  const [w, setW] = useState(0);
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1, false);
  }, [shift]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: -w + shift.value * (w * 2) }],
  }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: rounded, backgroundColor: colors.surface, overflow: 'hidden' },
        style,
      ]}
    >
      {w > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, anim]}>
          <LinearGradient
            colors={shimmer()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

// Akış: paylaşım kartlarının iskeleti.
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  useThemeTick();
  return (
    <View style={{ paddingTop: spacing.xs }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.post}>
          <View style={styles.row}>
            <Skeleton width={36} height={36} rounded={18} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="45%" height={11} />
              <Skeleton width="28%" height={9} />
            </View>
          </View>
          <Skeleton height={280} rounded={radius.lg} style={{ marginTop: spacing.sm }} />
          <View style={[styles.row, { marginTop: spacing.md }]}>
            <Skeleton width={60} height={12} />
            <Skeleton width={44} height={12} />
          </View>
          <Skeleton width="70%" height={11} style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

// Liste ekranları (görevler, liderlik, takımlar) için satır iskeleti.
export function ListSkeleton({ count = 5, height = 62 }: { count?: number; height?: number }) {
  useThemeTick();
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} rounded={radius.md} />
      ))}
    </View>
  );
}

const styles = makeStyles((colors) => ({
  post: { marginBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
