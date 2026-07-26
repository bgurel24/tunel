// Uygulama geneli geri bildirim: üstten inen toast, kutlama konfetisi ve
// onay alt sayfası. Kök layout'ta <FeedbackProvider>, ekranlarda useToast().
//
// confirm() sistem Alert.alert'inin yerine geçer: iOS'un gri kutusu uygulamayı
// "şablondan yapılmış" gösteriyordu.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
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

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; text: string; kind: ToastKind };

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Kırmızı onay butonu — silme gibi geri alınamaz işlemler için. */
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Ctx = {
  toast: (text: string, kind?: ToastKind) => void;
  celebrate: (text?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<Ctx>({
  toast: () => {},
  celebrate: () => {},
  confirm: async () => false,
});

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
  const [sheet, setSheet] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(
    null
  );
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

  const confirm = useCallback((options: ConfirmOptions) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    return new Promise<boolean>((resolve) => setSheet({ ...options, resolve }));
  }, []);

  const closeSheet = useCallback(
    (ok: boolean) => {
      sheet?.resolve(ok);
      setSheet(null);
    },
    [sheet]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ toast, celebrate, confirm }), [toast, celebrate, confirm]);

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

      {sheet && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => closeSheet(false)} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(180)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, shadow.raised]}
          >
            <View style={styles.grabber} />

            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: sheet.destructive ? colors.dangerBg : colors.accentBg },
              ]}
            >
              <Ionicons
                name={sheet.icon ?? (sheet.destructive ? 'trash-outline' : 'help-circle-outline')}
                size={24}
                color={sheet.destructive ? colors.danger : colors.accent}
              />
            </View>

            <Text style={styles.sheetTitle}>{sheet.title}</Text>
            {sheet.message ? <Text style={styles.sheetMessage}>{sheet.message}</Text> : null}

            <Touchable style={styles.sheetPrimary} onPress={() => closeSheet(true)} scaleTo={0.97}>
              {sheet.destructive ? (
                <View style={[styles.sheetPrimaryFill, { backgroundColor: colors.danger }]}>
                  <Text style={styles.sheetPrimaryText}>{sheet.confirmLabel ?? 'Sil'}</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={gradientColors}
                  start={gradientStart}
                  end={gradientEnd}
                  style={styles.sheetPrimaryFill}
                >
                  <Text style={styles.sheetPrimaryText}>{sheet.confirmLabel ?? 'Devam'}</Text>
                </LinearGradient>
              )}
            </Touchable>

            <Touchable style={styles.sheetCancel} onPress={() => closeSheet(false)} scaleTo={0.97} haptic={false}>
              <Text style={styles.sheetCancelText}>{sheet.cancelLabel ?? 'Vazgeç'}</Text>
            </Touchable>
          </Animated.View>
        </View>
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

  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface3,
    marginBottom: spacing.xl,
  },
  sheetIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: font.display,
    textAlign: 'center',
  },
  sheetMessage: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sheetPrimary: { alignSelf: 'stretch', marginTop: spacing.xl },
  sheetPrimaryFill: { alignItems: 'center', paddingVertical: 15, borderRadius: radius.md },
  sheetPrimaryText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  sheetCancel: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 15, marginTop: spacing.xs },
  sheetCancelText: { color: colors.textDim, fontSize: fontSize.md, fontWeight: '500' },
});
