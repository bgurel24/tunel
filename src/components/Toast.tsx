// Uygulama geneli geri bildirim: üstten inen toast, kutlama konfetisi, onay
// alt sayfası, seçenek menüsü ve metin sorma. Kök layout'ta <FeedbackProvider>,
// ekranlarda useToast().
//
// confirm() sistem Alert.alert'inin yerine geçer: iOS'un gri kutusu uygulamayı
// "şablondan yapılmış" gösteriyordu. menu() aynı şeyi ActionSheet için yapar.

import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '@/lib/haptics';
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
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
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
import { useT } from '@/lib/i18n';
import { getPrefs } from '@/lib/prefs';
import {
  colors,
  font,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  makeStyles,
  radius,
  shadow,
  spacing,
  useThemeTick,
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

export type MenuOption = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Kırmızı satır — silme / engelleme gibi sert işlemler. */
  destructive?: boolean;
};

export type MenuOptions = {
  title?: string;
  message?: string;
  options: MenuOption[];
};

export type PromptOptions = {
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

type Ctx = {
  toast: (text: string, kind?: ToastKind) => void;
  celebrate: (text?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Seçenek listesi açar; seçilen anahtarı, kapatılırsa null döner. */
  menu: (options: MenuOptions) => Promise<string | null>;
  /** Tek satırlık metin sorar; yazılan değeri, vazgeçilirse null döner. */
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const FeedbackContext = createContext<Ctx>({
  toast: () => {},
  celebrate: () => {},
  confirm: async () => false,
  menu: async () => null,
  prompt: async () => null,
});

export function useToast() {
  return useContext(FeedbackContext);
}

const KIND_ICON: Record<ToastKind, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

// Renkler render anında okunur — tema değişince güncel kalsın.
function kindColors(kind: ToastKind) {
  if (kind === 'success') return { color: colors.success, bg: colors.successBg };
  if (kind === 'error') return { color: colors.danger, bg: colors.dangerBg };
  return { color: colors.accent, bg: colors.accentBg };
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  useThemeTick();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(null);
  const [burst, setBurst] = useState(0);
  const [sheet, setSheet] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(
    null
  );
  const [menuSheet, setMenuSheet] = useState<
    (MenuOptions & { resolve: (key: string | null) => void }) | null
  >(null);
  const [promptSheet, setPromptSheet] = useState<
    (PromptOptions & { resolve: (value: string | null) => void }) | null
  >(null);
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
      if (getPrefs().celebrations) setBurst((b) => b + 1);
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

  const menu = useCallback((options: MenuOptions) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return new Promise<string | null>((resolve) => setMenuSheet({ ...options, resolve }));
  }, []);

  const closeMenu = useCallback(
    (key: string | null) => {
      menuSheet?.resolve(key);
      setMenuSheet(null);
    },
    [menuSheet]
  );

  const prompt = useCallback((options: PromptOptions) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return new Promise<string | null>((resolve) => setPromptSheet({ ...options, resolve }));
  }, []);

  const closePrompt = useCallback(
    (value: string | null) => {
      Keyboard.dismiss();
      promptSheet?.resolve(value);
      setPromptSheet(null);
    },
    [promptSheet]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(
    () => ({ toast, celebrate, confirm, menu, prompt }),
    [toast, celebrate, confirm, menu, prompt]
  );

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
          <View style={[styles.iconWrap, { backgroundColor: kindColors(item.kind).bg }]}>
            <Ionicons name={KIND_ICON[item.kind]} size={17} color={kindColors(item.kind).color} />
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
                  <Text style={styles.sheetPrimaryText}>{sheet.confirmLabel ?? t('common.delete')}</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={gradientColors}
                  start={gradientStart}
                  end={gradientEnd}
                  style={styles.sheetPrimaryFill}
                >
                  <Text style={styles.sheetPrimaryText}>{sheet.confirmLabel ?? t('common.continue')}</Text>
                </LinearGradient>
              )}
            </Touchable>

            <Touchable style={styles.sheetCancel} onPress={() => closeSheet(false)} scaleTo={0.97} haptic={false}>
              <Text style={styles.sheetCancelText}>{sheet.cancelLabel ?? t('common.cancel')}</Text>
            </Touchable>
          </Animated.View>
        </View>
      )}

      {menuSheet && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => closeMenu(null)} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(180)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, shadow.raised]}
          >
            <View style={styles.grabber} />

            {menuSheet.title ? <Text style={styles.menuTitle}>{menuSheet.title}</Text> : null}
            {menuSheet.message ? <Text style={styles.sheetMessage}>{menuSheet.message}</Text> : null}

            <View style={styles.menuList}>
              {menuSheet.options.map((option, i) => (
                <Touchable
                  key={option.key}
                  style={[styles.menuRow, i > 0 && styles.menuRowDivider]}
                  onPress={() => closeMenu(option.key)}
                  scaleTo={0.98}
                >
                  {option.icon ? (
                    <View
                      style={[
                        styles.menuIcon,
                        { backgroundColor: option.destructive ? colors.dangerBg : colors.accentBg },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={17}
                        color={option.destructive ? colors.danger : colors.accent}
                      />
                    </View>
                  ) : null}
                  <Text
                    style={[styles.menuLabel, option.destructive && { color: colors.danger }]}
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                </Touchable>
              ))}
            </View>

            <Touchable style={styles.sheetCancel} onPress={() => closeMenu(null)} scaleTo={0.97} haptic={false}>
              <Text style={styles.sheetCancelText}>{t('common.cancel')}</Text>
            </Touchable>
          </Animated.View>
        </View>
      )}

      {promptSheet && <PromptSheet key="prompt" options={promptSheet} onClose={closePrompt} />}
    </FeedbackContext.Provider>
  );
}

/** Metin soran alt sayfa — klavye açılınca yukarı kayar. */
function PromptSheet({
  options,
  onClose,
}: {
  options: PromptOptions;
  onClose: (value: string | null) => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(options.initialValue ?? '');
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const submit = () => {
    const next = value.trim();
    if (!next) return;
    onClose(next);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => onClose(null)} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(180)}
        exiting={SlideOutDown.duration(180)}
        style={[
          styles.sheet,
          { bottom: kbHeight, paddingBottom: (kbHeight ? spacing.lg : insets.bottom + spacing.lg) },
          shadow.raised,
        ]}
      >
        <View style={styles.grabber} />

        <View style={[styles.sheetIcon, { backgroundColor: colors.accentBg }]}>
          <Ionicons name={options.icon ?? 'create-outline'} size={24} color={colors.accent} />
        </View>

        <Text style={styles.sheetTitle}>{options.title}</Text>
        {options.message ? <Text style={styles.sheetMessage}>{options.message}</Text> : null}

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={options.placeholder}
          placeholderTextColor={colors.textFaint}
          style={styles.promptInput}
          autoCapitalize={options.autoCapitalize ?? 'sentences'}
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <Touchable style={styles.sheetPrimary} onPress={submit} scaleTo={0.97}>
          <LinearGradient
            colors={gradientColors}
            start={gradientStart}
            end={gradientEnd}
            style={[styles.sheetPrimaryFill, !value.trim() && { opacity: 0.5 }]}
          >
            <Text style={styles.sheetPrimaryText}>{options.confirmLabel ?? t('common.save')}</Text>
          </LinearGradient>
        </Touchable>

        <Touchable style={styles.sheetCancel} onPress={() => onClose(null)} scaleTo={0.97} haptic={false}>
          <Text style={styles.sheetCancelText}>{t('common.cancel')}</Text>
        </Touchable>
      </Animated.View>
    </View>
  );
}

function Confetti() {
  const { width, height } = useWindowDimensions();
  const palette = [colors.brandFrom, colors.brandMid, colors.brandTo, colors.success, '#FFFFFF'];
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        color: palette[i % palette.length],
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

const styles = makeStyles((colors) => ({
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
  menuTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: font.display,
    textAlign: 'center',
  },
  menuList: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  menuRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '500' },

  promptInput: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: font.body,
  },

  sheetPrimary: { alignSelf: 'stretch', marginTop: spacing.xl },
  sheetPrimaryFill: { alignItems: 'center', paddingVertical: 15, borderRadius: radius.md },
  sheetPrimaryText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  sheetCancel: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 15, marginTop: spacing.xs },
  sheetCancelText: { color: colors.textDim, fontSize: fontSize.md, fontWeight: '500' },
}));
