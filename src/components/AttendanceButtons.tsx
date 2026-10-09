// Katılım butonları — Katılacağım / Belli değil / Katılmayacağım.
// Tek dokunuşla kaydeder (iyimser güncelleme, hata olursa geri alır).
// Seçili butona tekrar basmak cevabı geri alır. Ana sayfa kartı ve
// etkinlik detayı aynı bileşeni kullanır.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { setAttendance, type AttendanceStatus } from '@/lib/events';
import { Haptics } from '@/lib/haptics';
import { useT, type TranslationKey } from '@/lib/i18n';
import { colors, fontSize, gradientEnd, gradientStart, makeStyles, radius, spacing, useThemeTick } from '@/theme';

/** Durum rozetleri için ortak renk/ikon/etiket. */
export const STATUS_META: Record<
  AttendanceStatus,
  { label: TranslationKey; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  going: { label: 'events.going', color: colors.success, bg: colors.successBg, icon: 'checkmark-circle' },
  maybe: { label: 'events.maybe', color: colors.warning, bg: colors.warningBg, icon: 'help-circle' },
  not_going: { label: 'events.notGoing', color: colors.danger, bg: colors.dangerBg, icon: 'close-circle' },
};

const OPTIONS: {
  key: AttendanceStatus;
  label: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'going', label: 'events.going', icon: 'checkmark-circle-outline', iconOn: 'checkmark-circle' },
  { key: 'maybe', label: 'events.maybe', icon: 'help-circle-outline', iconOn: 'help-circle' },
  { key: 'not_going', label: 'events.notGoing', icon: 'close-circle-outline', iconOn: 'close-circle' },
];

type Props = {
  eventId: string;
  value: AttendanceStatus | null;
  /** Kayıt başarılı olunca (ya da iyimser olarak) yeni durum. */
  onChange?: (next: AttendanceStatus | null) => void;
  disabled?: boolean;
};

export function AttendanceButtons({ eventId, value, onChange, disabled }: Props) {
  useThemeTick();
  const t = useT();
  const { toast } = useToast();
  const [status, setStatus] = useState<AttendanceStatus | null>(value);

  useEffect(() => setStatus(value), [value]);

  const pick = async (key: AttendanceStatus) => {
    if (disabled) return;
    const prev = status;
    const next = prev === key ? null : key;
    setStatus(next);
    onChange?.(next);
    Haptics.impactAsync(next === 'going' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const { error } = await setAttendance(eventId, next);
    if (error) {
      setStatus(prev);
      onChange?.(prev);
      toast(error, 'error');
    }
  };

  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      {OPTIONS.map((o) => {
        const on = status === o.key;
        const tint = o.key === 'not_going' ? colors.danger : o.key === 'maybe' ? colors.warning : colors.onBrand;
        const inner = (
          <>
            <Ionicons name={on ? o.iconOn : o.icon} size={18} color={on ? tint : colors.textDim} />
            <Text style={[styles.label, on && { color: tint, fontWeight: '700' }]} numberOfLines={1}>
              {t(o.label)}
            </Text>
          </>
        );
        return (
          <Touchable
            key={o.key}
            style={styles.wrap}
            onPress={() => pick(o.key)}
            haptic={false}
            scaleTo={0.95}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            {on && o.key === 'going' ? (
              <LinearGradient
                colors={[colors.brandFrom, colors.brandTo]}
                start={gradientStart}
                end={gradientEnd}
                style={styles.btn}
              >
                {inner}
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.btn,
                  on && o.key === 'maybe' && styles.maybeOn,
                  on && o.key === 'not_going' && styles.outOn,
                ]}
              >
                {inner}
              </View>
            )}
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = makeStyles((colors) => ({
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flex: 1 },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 58,
  },
  maybeOn: { backgroundColor: colors.warningBg, borderColor: colors.warning },
  outOn: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  label: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: '600' },
}));
