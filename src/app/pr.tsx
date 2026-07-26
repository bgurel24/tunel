// Kişisel rekorlar (PR) — hareket bazında kilo kaydı, en iyi + ilerleme + geçmiş.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { usePref } from '@/lib/prefs';
import { addRecord, deleteRecord, getMyRecords, type MovementGroup } from '@/lib/records';
import { fmtWeight, toKg } from '@/lib/units';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

const PRESETS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];

function fmtDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export default function PRScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const units = usePref('units');
  const { toast, celebrate, confirm } = useToast();
  const [groups, setGroups] = useState<MovementGroup[] | null>(null);
  const [movement, setMovement] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('1');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getMyRecords().then(setGroups);
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  const add = async () => {
    const w = parseFloat(weight.replace(',', '.'));
    if (!movement.trim() || isNaN(w) || w <= 0) {
      toast(t('pr.needFields'), 'error');
      return;
    }
    setSaving(true);
    const { error } = await addRecord(movement, toKg(w, units), parseInt(reps) || 1);
    setSaving(false);
    if (error) return toast(error, 'error');
    setWeight('');
    setReps('1');
    celebrate(t('pr.saved', { movement, weight: `${w} ${units}` }));
    load();
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: t('pr.deleteTitle'),
      message: t('pr.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    await deleteRecord(id);
    load();
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('pr.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Ekleme formu */}
        <View style={styles.form}>
          <Text style={styles.formLabel}>{t('pr.new')}</Text>
          <View style={styles.chips}>
            {PRESETS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setMovement(p)}
                style={[styles.chip, movement === p && styles.chipActive]}
              >
                <Text style={[styles.chipText, movement === p && styles.chipTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={movement}
            onChangeText={setMovement}
            placeholder={t('pr.movementPlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder={t('pr.weightPlaceholder')}
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={reps}
              onChangeText={setReps}
              placeholder={t('pr.repsPlaceholder')}
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              style={[styles.input, { width: 90 }]}
            />
          </View>
          <GradientButton label={t('pr.add')} onPress={add} loading={saving} />
        </View>

        {/* Liste */}
        {!groups ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="trophy-outline" size={40} color={colors.textFaint} />
            <Text style={styles.emptyText}>{t('pr.empty')}</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.movement} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.movement}>{g.movement}</Text>
                  <Text style={styles.cardSub}>{t('pr.entries', { n: g.entries.length })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.best}>{fmtWeight(g.best, units)}</Text>
                  {g.gain > 0 && <Text style={styles.gain}>{t('pr.gain', { value: fmtWeight(g.gain, units) })}</Text>}
                </View>
              </View>

              <View style={styles.entries}>
                {g.entries.map((e) => (
                  <View key={e.id} style={styles.entryRow}>
                    <Text style={styles.entryWeight}>
                      {fmtWeight(e.weight, units)}{e.reps > 1 ? ` × ${e.reps}` : ''}
                      {e.weight === g.best ? '  🏆' : ''}
                    </Text>
                    <Text style={styles.entryDate}>{fmtDate(e.achievedAt)}</Text>
                    <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                      <Ionicons name="close" size={16} color={colors.textFaint} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm, marginBottom: spacing.xl },
  formLabel: { color: colors.textDim, fontSize: fontSize.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.xs },
  chipTextActive: { color: colors.text, fontWeight: '500' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSize.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  emptyText: { color: colors.textDim, fontSize: fontSize.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  movement: { color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  cardSub: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  best: { color: colors.accent, fontSize: fontSize.xl, fontWeight: '700' },
  gain: { color: colors.success, fontSize: fontSize.xs, marginTop: 2 },
  entries: { marginTop: spacing.md, gap: spacing.xs },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  entryWeight: { flex: 1, color: colors.text, fontSize: fontSize.sm },
  entryDate: { color: colors.textDim, fontSize: fontSize.xs },
}));
