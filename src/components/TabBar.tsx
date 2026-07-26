// Özel alt tab bar — cam (blur) zemin, 4 sekme + ortada gradyanlı kamera butonu.
// Kök öğe mutlak konumlu: içerik barın altından geçsin, blur anlamlı olsun.

import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import {
  colors,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  shadow,
  spacing,
} from '@/theme';

type TabName = 'index' | 'kesfet' | 'gorevler' | 'profil';

const META: Record<TabName, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Akış', icon: 'home' },
  kesfet: { label: 'Keşfet', icon: 'search' },
  gorevler: { label: 'Görevler', icon: 'barbell' },
  profil: { label: 'Profil', icon: 'person' },
};

// Barın güvenli alan hariç yüksekliği; ekranlar alt boşluğu buradan hesaplar.
export const TAB_BAR_BASE = 60;

export function useTabBarPadding(extra = spacing.xl) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE + Math.max(insets.bottom, 8) + extra;
}

function TabItem({
  name,
  focused,
  onPress,
}: {
  name: string;
  focused: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 });
  }, [focused, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + lift.value * 0.12) }, { translateY: -lift.value * 2 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: lift.value }));

  const meta = META[name as TabName];
  if (!meta) return null;

  return (
    <Pressable
      style={styles.tab}
      onPressIn={() => {
        press.value = withSpring(0.88, { damping: 18, stiffness: 400 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      onPress={() => {
        if (!focused) Haptics.selectionAsync();
        onPress();
      }}
    >
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? meta.icon : (`${meta.icon}-outline` as keyof typeof Ionicons.glyphMap)}
          size={23}
          color={focused ? colors.accent : colors.textFaint}
        />
      </Animated.View>
      <Text style={[styles.label, { color: focused ? colors.accent : colors.textFaint }]}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

function CameraButton() {
  const router = useRouter();
  const press = useSharedValue(1);
  const breath = useSharedValue(1);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [breath]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value * breath.value }] }));

  return (
    <Pressable
      style={styles.center}
      onPressIn={() => {
        press.value = withSpring(0.9, { damping: 18, stiffness: 400 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 10, stiffness: 240 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/paylas');
      }}
    >
      <Animated.View style={[shadow.glow, style]}>
        <LinearGradient
          colors={gradientColors}
          start={gradientStart}
          end={gradientEnd}
          style={styles.centerCircle}
        >
          <Ionicons name="camera" size={25} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const press = (routeKey: string, name: string, index: number) => () => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(name);
  };

  const routes = state.routes;
  const item = (i: number) => (
    <TabItem
      key={routes[i].key}
      name={routes[i].name}
      focused={state.index === i}
      onPress={press(routes[i].key, routes[i].name, i)}
    />
  );

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={38} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tintOverlay]} />
      <View style={styles.hairline} />

      <View style={styles.row}>
        {item(0)}
        {item(1)}
        <CameraButton />
        {item(2)}
        {item(3)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 9,
    overflow: 'hidden',
  },
  tintOverlay: { backgroundColor: colors.glass },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 44 },
  glow: {
    position: 'absolute',
    top: -2,
    width: 46,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentBg,
  },
  label: { fontSize: fontSize.xs, fontWeight: '500' },
  center: { width: 66, alignItems: 'center', justifyContent: 'center' },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
