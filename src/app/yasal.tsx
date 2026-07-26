// Gizlilik politikası / kullanım şartları — metinler src/lib/legal.ts'te.
// Ayarlar > Yasal ve kayıt ekranındaki bağlantılar buraya gelir.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { legalContent, type LegalDoc } from '@/lib/legal';
import { usePrefs } from '@/lib/prefs';
import { colors, font, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

export default function YasalScreen() {
  useThemeTick();
  const router = useRouter();
  const { lang } = usePrefs();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const which: LegalDoc = doc === 'terms' ? 'terms' : 'privacy';
  const content = legalContent(which, lang);

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.back} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.title} numberOfLines={1}>
          {content.title}
        </Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{content.updated}</Text>
        <Text style={styles.intro}>{content.intro}</Text>

        {content.sections.map((section, i) => (
          <Animated.View
            key={section.heading}
            entering={FadeInDown.duration(300).delay(Math.min(i, 6) * 40)}
            style={styles.section}
          >
            <Text style={styles.heading}>{section.heading}</Text>
            {section.body.map((line, j) => (
              <View key={j} style={styles.bullet}>
                <View style={styles.dot} />
                <Text style={styles.line}>{line}</Text>
              </View>
            ))}
          </Animated.View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  updated: { color: colors.textFaint, fontSize: fontSize.xs, letterSpacing: 0.3 },
  intro: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 21, marginTop: spacing.md },

  section: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heading: { color: colors.text, fontSize: fontSize.md, fontFamily: font.display, marginBottom: 2 },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  line: { flex: 1, color: colors.textDim, fontSize: fontSize.sm, lineHeight: 21 },
}));
