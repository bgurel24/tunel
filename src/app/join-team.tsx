// Takım — davet koduyla KATIL ya da yeni takım OLUŞTUR (kaptan olarak).

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, } from 'react-native';

import { useT } from '@/lib/i18n';
import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { createTeam, joinTeam } from '@/lib/teams';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

type Mode = 'katil' | 'olustur';

export default function TeamScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { celebrate } = useToast();
  const { configured } = useAuth();
  const [mode, setMode] = useState<Mode>('katil');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setSuccess(null);
    setCreatedCode(null);
  };

  const submit = async () => {
    reset();
    if (!configured) {
      setError(t('team.notConfigured'));
      return;
    }
    setLoading(true);
    if (mode === 'katil') {
      if (!code.trim()) {
        setLoading(false);
        setError('Davet kodu gerekli.');
        return;
      }
      const res = await joinTeam(code);
      setLoading(false);
      if (res.error) return setError(res.error);
      setSuccess(t('team.joined', { name: res.teamName ?? '' }));
      celebrate(t('team.joinedCelebrate', { name: res.teamName ?? '' }));
    } else {
      if (!name.trim()) {
        setLoading(false);
        setError(t('team.nameRequired'));
        return;
      }
      const res = await createTeam(name);
      setLoading(false);
      if (res.error) return setError(res.error);
      setCreatedCode(res.inviteCode ?? null);
      setSuccess(t('team.created', { name }));
      celebrate(`"${name}" kuruldu, kaptan sensin`);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('team.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.toggle}>
        {(['katil', 'olustur'] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.segment, mode === m && styles.segmentActive]}
            onPress={() => {
              setMode(m);
              reset();
            }}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
              {t(m === 'katil' ? 'team.join' : 'team.create')}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'katil' ? (
        <>
          <Text style={styles.lead}>
            {t('team.joinLead')}
          </Text>
          <Field
            label={t('team.codeLabel')}
            value={code}
            onChangeText={setCode}
            placeholder={t('team.codePlaceholder')}
            autoCapitalize="characters"
          />
        </>
      ) : (
        <>
          <Text style={styles.lead}>
            {t('team.createLead')}
          </Text>
          <Field
            label={t('team.nameLabel')}
            value={name}
            onChangeText={setName}
            placeholder={t('team.namePlaceholder')}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}

      {createdCode && (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>{t('team.codeLabel')}</Text>
          <Text style={styles.codeValue}>{createdCode}</Text>
          <Text style={styles.codeHint}>{t('team.codeHint')}</Text>
        </View>
      )}

      <GradientButton
        label={t(mode === 'katil' ? 'team.join' : 'team.createCta')}
        onPress={submit}
        loading={loading}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surface2 },
  segmentText: { color: colors.textDim, fontSize: fontSize.sm },
  segmentTextActive: { color: colors.text, fontWeight: '600' },
  lead: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  success: { color: colors.success, fontSize: fontSize.sm, marginTop: spacing.md },
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  codeLabel: { color: colors.textDim, fontSize: fontSize.xs },
  codeValue: {
    color: colors.accent,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    letterSpacing: 4,
    marginVertical: spacing.xs,
  },
  codeHint: { color: colors.textFaint, fontSize: fontSize.xs },
}));
