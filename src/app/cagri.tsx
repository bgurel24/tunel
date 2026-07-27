// Antrenman çağrısı aç — "yarım saate ana gymdeyim, gelen gelsin".
// Takım + ne zaman + nerede seç, takım arkadaşların feed'in üstünde görsün.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { createSession } from '@/lib/sessions';
import { clockLabel } from '@/lib/time';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { colors, font, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

/** Hazır zaman seçenekleri — dakika cinsinden. */
const WHEN = [
  { minutes: 0, labelKey: 'call.now' as const },
  { minutes: 30, labelKey: 'call.in30' as const },
  { minutes: 60, labelKey: 'call.in1h' as const },
  { minutes: 120, labelKey: 'call.in2h' as const },
  { minutes: 180, labelKey: 'call.in3h' as const },
];

export default function CagriScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { celebrate, toast } = useToast();

  const [teams, setTeams] = useState<MyTeam[] | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [gym, setGym] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getMyTeams().then((t) => {
      setTeams(t);
      setTeamId(t[0]?.id ?? null);
    });
  }, []);

  const startsAt = new Date(Date.now() + minutes * 60_000);

  const submit = async () => {
    if (!teamId) return;
    setSending(true);
    const { error } = await createSession({ teamId, startsAt, gym, note });
    setSending(false);
    if (error) return toast(error, 'error');
    celebrate(t('call.sent'));
    router.back();
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Touchable onPress={() => router.back()} hitSlop={12} haptic={false} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>{t('call.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {teams !== null && teams.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <EmptyState
            icon="people-outline"
            title={t('call.noTeamTitle')}
            body={t('call.noTeamBody')}
            actionLabel={t('tasks.noTeamAction')}
            onAction={() => router.replace('/join-team')}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={styles.lead}>
            {t('call.lead')}
          </Text>

          {teams && teams.length > 1 && (
            <>
              <Text style={styles.label}>{t('call.whichTeam')}</Text>
              <View style={styles.chipWrap}>
                {teams.map((t) => (
                  <Touchable
                    key={t.id}
                    onPress={() => setTeamId(t.id)}
                    scaleTo={0.94}
                    style={[styles.chip, teamId === t.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, teamId === t.id && styles.chipTextActive]}>
                      {t.name}
                    </Text>
                  </Touchable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>{t('call.when')}</Text>
          <View style={styles.chipWrap}>
            {WHEN.map((w) => (
              <Touchable
                key={w.minutes}
                onPress={() => setMinutes(w.minutes)}
                scaleTo={0.94}
                style={[styles.chip, minutes === w.minutes && styles.chipActive]}
              >
                <Text style={[styles.chipText, minutes === w.minutes && styles.chipTextActive]}>
                  {t(w.labelKey)}
                </Text>
              </Touchable>
            ))}
          </View>

          <View style={styles.preview}>
            <Ionicons name="time-outline" size={16} color={colors.accent} />
            <Text style={styles.previewText}>
              {t('call.sessionTime')}{' '}
              <Text style={styles.previewStrong}>{clockLabel(startsAt.toISOString())}</Text>
            </Text>
          </View>

          <Field
            label={t('call.where')}
            value={gym}
            onChangeText={setGym}
            placeholder={t('call.wherePlaceholder')}
          />

          <Field
            label={t('call.note')}
            value={note}
            onChangeText={setNote}
            placeholder={t('call.notePlaceholder')}
          />

          <GradientButton
            label={t('call.send')}
            onPress={submit}
            loading={sending}
            disabled={!teamId}
            style={{ marginTop: spacing.lg }}
          />

          <Text style={styles.foot}>
            {t('call.info')}
          </Text>
        </ScrollView>
      )}
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
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  lead: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.lg },
  label: { color: colors.textDim, fontSize: fontSize.sm, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.accentBg, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  chipTextActive: { color: colors.text, fontWeight: '600' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewText: { color: colors.textDim, fontSize: fontSize.sm },
  previewStrong: { color: colors.text, fontWeight: '600' },
  foot: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
}));
