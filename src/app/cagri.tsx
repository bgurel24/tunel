// Antrenman çağrısı aç — "yarım saate ana gymdeyim, gelen gelsin".
// Takım + ne zaman + nerede seç, takım arkadaşların feed'in üstünde görsün.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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
import { colors, font, fontSize, radius, spacing } from '@/theme';

/** Hazır zaman seçenekleri — dakika cinsinden. */
const WHEN = [
  { minutes: 0, label: 'Şu an' },
  { minutes: 30, label: 'Yarım saate' },
  { minutes: 60, label: '1 saate' },
  { minutes: 120, label: '2 saate' },
  { minutes: 180, label: '3 saate' },
];

export default function CagriScreen() {
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
    celebrate('Çağrı yapıldı, takım görüyor');
    router.back();
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Touchable onPress={() => router.back()} hitSlop={12} haptic={false} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>Antrenmana çağır</Text>
        <View style={{ width: 26 }} />
      </View>

      {teams !== null && teams.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <EmptyState
            icon="people-outline"
            title="Önce bir takım lazım"
            body="Çağrı takım arkadaşlarına gider. Takım kur ya da davet koduyla birine katıl."
            actionLabel="Takıma katıl / kur"
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
            Gym'e gidiyorsun. Haber ver, gelen gelsin.
          </Text>

          {teams && teams.length > 1 && (
            <>
              <Text style={styles.label}>Hangi takım</Text>
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

          <Text style={styles.label}>Ne zaman</Text>
          <View style={styles.chipWrap}>
            {WHEN.map((w) => (
              <Touchable
                key={w.minutes}
                onPress={() => setMinutes(w.minutes)}
                scaleTo={0.94}
                style={[styles.chip, minutes === w.minutes && styles.chipActive]}
              >
                <Text style={[styles.chipText, minutes === w.minutes && styles.chipTextActive]}>
                  {w.label}
                </Text>
              </Touchable>
            ))}
          </View>

          <View style={styles.preview}>
            <Ionicons name="time-outline" size={16} color={colors.accent} />
            <Text style={styles.previewText}>
              Antrenman saati: <Text style={styles.previewStrong}>{clockLabel(startsAt.toISOString())}</Text>
            </Text>
          </View>

          <Field
            label="Nerede"
            value={gym}
            onChangeText={setGym}
            placeholder="ör. Ana gym"
          />

          <Field
            label="Not (isteğe bağlı)"
            value={note}
            onChangeText={setNote}
            placeholder="ör. bacak günü, ağır olacak"
          />

          <GradientButton
            label="Çağrıyı gönder"
            onPress={submit}
            loading={sending}
            disabled={!teamId}
            style={{ marginTop: spacing.lg }}
          />

          <Text style={styles.foot}>
            Çağrın takım feed'inin en üstünde görünür. Herkes geliyorum ya da yokum diyebilir.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
