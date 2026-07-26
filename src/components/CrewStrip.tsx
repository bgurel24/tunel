// Akış üstündeki ekip şeridi — bugün antrenman yapan takım arkadaşı gradyan halkayla parlar,
// yapmayan soluk kalır. İlk sıradaki "Sen" halkası paylaşım ekranını açar.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { avatarGradient } from '@/lib/avatar';
import type { CrewMember } from '@/lib/crew';
import {
  colors,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  makeStyles,
  radius,
  spacing,
  useThemeTick,
} from '@/theme';

// Bugün aktif olmayan üyenin soluk halkası — temaya göre çizgi tonlarından.
const dimRing = (): [string, string] => [colors.lineStrong, colors.line];

function initialsOf(username: string) {
  const letters = username.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');
  return (letters.slice(0, 2) || username.slice(0, 2)).toUpperCase();
}

export function CrewStrip({ crew }: { crew: CrewMember[] }) {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  if (crew.length === 0) return null;

  const activeCount = crew.filter((m) => m.activeToday).length;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('crew.title')}</Text>
        <Text style={styles.count}>
          {activeCount > 0 ? t('crew.active', { n: activeCount }) : t('crew.beFirst')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {crew.map((m) => (
          <Pressable
            key={m.id}
            style={styles.item}
            onPress={() =>
              m.isMe
                ? router.push('/paylas')
                : router.push({ pathname: '/kullanici', params: { id: m.id } })
            }
          >
            <LinearGradient
              colors={m.activeToday ? gradientColors : dimRing()}
              start={gradientStart}
              end={gradientEnd}
              style={styles.ring}
            >
              <View style={styles.ringInner}>
                <LinearGradient
                  colors={avatarGradient(m.username)}
                  start={gradientStart}
                  end={gradientEnd}
                  style={[styles.avatar, !m.activeToday && styles.avatarDim]}
                >
                  <Text style={styles.avatarText}>{initialsOf(m.username)}</Text>
                </LinearGradient>
              </View>
            </LinearGradient>

            {m.isMe && (
              <View style={styles.plus}>
                <Ionicons name="add" size={13} color="#fff" />
              </View>
            )}

            <Text
              style={[styles.name, m.activeToday ? styles.nameActive : null]}
              numberOfLines={1}
            >
              {m.isMe ? 'Sen' : m.username}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const RING = 62;

const styles = makeStyles((colors) => ({
  wrap: { marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  count: { color: colors.textFaint, fontSize: fontSize.xs },
  row: { gap: spacing.md, paddingRight: spacing.lg },
  item: { width: RING, alignItems: 'center', gap: 6 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: RING - 5,
    height: RING - 5,
    borderRadius: (RING - 5) / 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: RING - 11,
    height: RING - 11,
    borderRadius: (RING - 11) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDim: { opacity: 0.45 },
  avatarText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  plus: {
    position: 'absolute',
    top: RING - 22,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brandFrom,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.textFaint, fontSize: fontSize.xs, maxWidth: RING },
  nameActive: { color: colors.textDim, fontWeight: '500' },
}));
