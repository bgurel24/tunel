// Bildirimler — günlük hatırlatma (aç/kapa + saat) + test bildirimi.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, } from 'react-native';

import { useT } from '@/lib/i18n';
import { OutlineButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { getDailySettings, sendTestNotification, setDailyReminder } from '@/lib/notifications';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

const HOURS = [8, 12, 18, 21];

export default function BildirimlerScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(18);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDailySettings().then((s) => {
      setEnabled(s.enabled);
      setHour(s.hour);
      setLoading(false);
    });
  }, []);

  const apply = async (nextEnabled: boolean, nextHour: number) => {
    setBusy(true);
    const { error } = await setDailyReminder(nextEnabled, nextHour, 0);
    setBusy(false);
    if (error) {
      toast(error, 'error');
      setEnabled(false);
      return;
    }
    setEnabled(nextEnabled);
    setHour(nextHour);
    toast(t(nextEnabled ? 'notif.on' : 'notif.off'), nextEnabled ? 'success' : 'info');
  };

  const test = async () => {
    const { error } = await sendTestNotification();
    if (error) toast(error, 'error');
    else toast(t('notif.testSent'), 'info');
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('settings.notifications')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <Pressable style={styles.row} onPress={() => apply(!enabled, hour)} disabled={busy}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{t('notif.dailyTitle')}</Text>
          <Text style={styles.rowSub}>{t('notif.dailySub')}</Text>
        </View>
        <View style={[styles.switch, enabled && styles.switchOn]}>
          <View style={[styles.knob, enabled && styles.knobOn]} />
        </View>
      </Pressable>

      {enabled && (
        <>
          <Text style={styles.label}>{t('notif.hour')}</Text>
          <View style={styles.chips}>
            {HOURS.map((h) => (
              <Pressable
                key={h}
                style={[styles.chip, hour === h && styles.chipActive]}
                onPress={() => apply(true, h)}
                disabled={busy}
              >
                <Text style={[styles.chipText, hour === h && styles.chipTextActive]}>
                  {String(h).padStart(2, '0')}:00
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={{ marginTop: spacing.xl }}>
        <OutlineButton label={t('notif.test')} onPress={test} />
      </View>

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
        <Text style={styles.infoText}>
          {t('notif.info')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  rowTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  rowSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  label: { color: colors.textDim, fontSize: fontSize.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  chipTextActive: { color: colors.text, fontWeight: '500' },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xl },
  infoText: { color: colors.textFaint, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },
}));
