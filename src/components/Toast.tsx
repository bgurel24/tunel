// Uygulama geneli geri bildirim: üstten inen toast + kutlama konfetisi.
// Kök layout'ta <FeedbackProvider> ile sarmalanır, ekranlarda useToast() ile çağrılır.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; text: string; kind: ToastKind };

type Ctx = {
  toast: (text: string, kind?: ToastKind) => void;
  celebrate: (text?: string) => void;
};

const FeedbackContext = createContext<Ctx>({ toast: () => {}, celebrate: () => {} });

export function useToast() {
  return useContext(FeedbackContext);
}

const KIND_META: Record<ToastKind, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: colors.success, bg: colors.successBg },
  error: { icon: 'alert-circle', color: colors.danger, bg: colors.dangerBg },
  info: { icon: 'information-circle', color: colors.accent, bg: colors.accentBg },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(null);
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, kind: ToastKind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setItem({ id: Date.now(), text, kind });
    Haptics.notificationAsync(
      kind === 'error'
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Success
    );
    timer.current = setTimeout(() => setItem(null), 2600);
  }, []);

  const celebrate = useCallback(
    (text?: string) => {
      setBurst((b) => b + 1);
      if (text) toast(text, 'success');
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [toast]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ toast, celebrate }), [toast, celebrate]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {burst > 0 && <Confetti key={burst} />}

      {item && (
        <Animated.View
          key={item.id}
          entering={FadeInUp.springify().damping(16)}
          exiting={FadeOutUp.duration(220)}
          pointerEvents="none"
          style={[styles.toast, { top: insets.top + spacing.sm }, shadow.raised]}
        >
          <View style={[styles.iconWrap, { backgroundColor: KIND_META[item.kind].bg }]}>
            <Ionicons name={KIND_META[item.kind].icon} size={17} color={KIND_META[item.kind].color} />
          </View>
          <Text style={styles.toastText} numberOfLines={2}>
            {item.text}
          </Text>
        </Animated.View>
      )}
    </FeedbackContext.Provider>
  );
}

const PIECE_COLORS = [colors.brandFrom, colors.brandMid, colors.brandTo, colors.success, '#FFFFFF'];

function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        color: PIECE_COLORS[i % PIECE_COLORS.length],
        size: 6 + Math.random() * 6,
        drift: (Math.random() - 0.5) * 120,
        spin: 180 + Math.random() * 540,
        delay: Math.random() * 260,
        duration: 1500 + Math.random() * 700,
      })),
    [width]
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} fall={height * 0.85} />
      ))}
    </View>
  );
}

type PieceProps = {
  x: number;
  color: string;
  size: number;
  drift: number;
  spin: number;
  delay: number;
  duration: number;
  fall: number;
};

function Piece({ x, color, size, drift, spin, delay, duration, fall }: PieceProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    const id = setTimeout(() => {
      t.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
    }, delay);
    return () => clearTimeout(id);
  }, [t, delay, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: t.value * fall },
      { translateX: t.value * drift },
      { rotate: `${t.value * spin}deg` },
    ],
    opacity: t.value > 0.75 ? (1 - t.value) * 4 : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -20,
          left: x,
          width: size,
          height: size * 1.6,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '500', lineHeight: 19 },
});
