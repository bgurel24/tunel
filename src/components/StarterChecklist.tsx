// Başlangıç yol haritası — feed boş açıldığında "ölü uygulama" hissi vermesin,
// kullanıcı ilk üç adımı görsün. Hepsi tamamlanınca kendiliğinden kaybolur.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Touchable } from '@/components/Touchable';
import type { StarterState } from '@/lib/starter';
import { colors, font, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

type Step = {
  key: keyof Omit<StarterState, 'done'>;
  icon: keyof typeof Ionicons.glyphMap;
  title: TranslationKey;
  body: TranslationKey;
  href: string;
};

const STEPS: Step[] = [
  {
    key: 'hasTeam',
    icon: 'people',
    title: 'starter.team.title',
    body: 'starter.team.body',
    href: '/join-team',
  },
  {
    key: 'hasAvatar',
    icon: 'camera',
    title: 'starter.avatar.title',
    body: 'starter.avatar.body',
    href: '/profil',
  },
  {
    key: 'hasPost',
    icon: 'barbell',
    title: 'starter.post.title',
    body: 'starter.post.body',
    href: '/paylas',
  },
];

export function StarterChecklist({ state }: { state: StarterState }) {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const doneCount = STEPS.filter((s) => state[s.key]).length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('starter.title')}</Text>
        <Text style={styles.progress}>
          {doneCount}/{STEPS.length}
        </Text>
      </View>
      <Text style={styles.lead}>{t('starter.lead')}</Text>

      {STEPS.map((step, i) => {
        const done = state[step.key];
        return (
          <Touchable
            key={step.key}
            style={[styles.row, i > 0 && styles.rowDivider]}
            onPress={() => router.push(step.href as never)}
            disabled={done}
            scaleTo={0.98}
          >
            <View style={[styles.check, done && styles.checkDone]}>
              <Ionicons
                name={done ? 'checkmark' : step.icon}
                size={16}
                color={done ? colors.success : colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{t(step.title)}</Text>
              {!done && <Text style={styles.stepBody}>{t(step.body)}</Text>}
            </View>
            {!done && <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />}
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: fontSize.md, fontFamily: font.display },
  progress: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    backgroundColor: colors.accentBg,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  lead: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 4, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
  check: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.successBg },
  stepTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  stepTitleDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  stepBody: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
}));
