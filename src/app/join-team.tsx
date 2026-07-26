// Takım — davet koduyla KATIL ya da yeni takım OLUŞTUR (kaptan olarak).

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, } from 'react-native';

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
      setError('Supabase bağlı değil. .env yapılandırıldıktan sonra aktif olacak.');
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
      setSuccess(`Takıma katıldın: ${res.teamName}`);
      celebrate(`${res.teamName} takımına katıldın`);
    } else {
      if (!name.trim()) {
        setLoading(false);
        setError('Takım adı gerekli.');
        return;
      }
      const res = await createTeam(name);
      setLoading(false);
      if (res.error) return setError(res.error);
      setCreatedCode(res.inviteCode ?? null);
      setSuccess(`"${name}" oluşturuldu — kaptan sensin.`);
      celebrate(`"${name}" kuruldu, kaptan sensin`);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Takım</Text>
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
              {m === 'katil' ? 'Katıl' : 'Oluştur'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'katil' ? (
        <>
          <Text style={styles.lead}>
            Kaptanının verdiği davet kodunu gir. Takım görevlerine ve liderlik tablosuna
            erişimin açılır.
          </Text>
          <Field
            label="Davet kodu"
            value={code}
            onChangeText={setCode}
            placeholder="ör. DEMIR7"
            autoCapitalize="characters"
          />
        </>
      ) : (
        <>
          <Text style={styles.lead}>
            Yeni bir takım kur, kaptan ol. Oluşturunca bir davet kodu alırsın; arkadaşlarına
            gönderip takıma eklersin.
          </Text>
          <Field
            label="Takım adı"
            value={name}
            onChangeText={setName}
            placeholder="ör. Demir Hane"
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}

      {createdCode && (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Davet kodu</Text>
          <Text style={styles.codeValue}>{createdCode}</Text>
          <Text style={styles.codeHint}>Bu kodu takım arkadaşlarınla paylaş.</Text>
        </View>
      )}

      <GradientButton
        label={mode === 'katil' ? 'Katıl' : 'Takım oluştur'}
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
