// Liderlik — Takım (global) / Bireysel (seçili takım). İlk üç podyumda, kendi sıran altta sabit.

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useT } from '@/lib/i18n';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { avatarGradient } from '@/lib/avatar';
import { getLeaderboard, type LeaderKind, type LeaderRow } from '@/lib/leaderboard';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import {
  colors,
  font,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  makeStyles,
  radius,
  shadow,
  spacing,
  tabularNums,
  themeInfo,
  useThemeTick,
} from '@/theme';

const KINDS = [
  { key: 'takim' as const, labelKey: 'share.team' as const },
  { key: 'bireysel' as const, labelKey: 'leader.individual' as const },
];

// Podyum sırası: 2. solda, 1. ortada (en yüksek), 3. sağda.
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHT = [96, 68, 52];
const PODIUM_TINT = ['#FFC24A', '#C9CBD4', '#C97A45'];

function initialsOf(name: string) {
  const letters = name.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, '');
  return (letters.slice(0, 2) || name.slice(0, 2)).toUpperCase();
}

export default function LiderlikScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId?: string }>();

  const [kind, setKind] = useState<LeaderKind>('takim');
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [teamId, setTeamId] = useState<string | null>(params.teamId ?? null);
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  const loadRows = useCallback(async (k: LeaderKind, tid: string | null) => {
    setRows(null);
    const data = await getLeaderboard(k, tid ?? undefined);
    setRows(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const all = await getMyTeams();
        if (!active) return;
        setTeams(all);
        const tid = teamId && all.find((t) => t.id === teamId) ? teamId : all[0]?.id ?? null;
        setTeamId(tid);
        await loadRows(kind, tid);
      })();
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind])
  );

  const switchKind = (k: LeaderKind) => {
    setKind(k);
    loadRows(k, teamId);
  };

  const pickTeam = (id: string) => {
    setTeamId(id);
    loadRows(kind, id);
  };

  const teamName = teams.find((t) => t.id === teamId)?.name;
  const top3 = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const me = rows?.find((r) => r.isMe);
  const meInTop = !!me && me.rank <= 3;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('leader.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <Segmented
        options={KINDS.map((k) => ({ key: k.key, label: t(k.labelKey) }))}
        value={kind}
        onChange={switchKind}
      />

      {kind === 'bireysel' && teams.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.md }}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {teams.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => pickTeam(t.id)}
              style={[styles.chip, teamId === t.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, teamId === t.id && styles.chipTextActive]}>
                {t.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {kind === 'bireysel' && teamName && <Text style={styles.context}>{t('leader.context', { team: teamName })}</Text>}

      {!rows ? (
        <View style={{ marginTop: spacing.xl }}>
          <ListSkeleton count={6} height={56} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={t('leader.emptyTitle')}
          body={t('leader.emptyBody')}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: meInTop ? spacing.xl : 92 }}
        >
          {/* Podyum */}
          <View style={styles.podium}>
            {PODIUM_ORDER.map((i, slot) => {
              const row = top3[i];
              if (!row) return <View key={slot} style={styles.podiumCol} />;
              const first = i === 0;
              return (
                <Animated.View
                  key={row.rank}
                  entering={FadeInDown.delay(slot * 90).duration(420)}
                  style={styles.podiumCol}
                >
                  {first && (
                    <Ionicons name="ribbon" size={18} color={PODIUM_TINT[0]} style={{ marginBottom: 2 }} />
                  )}
                  <View style={[styles.podiumRing, { borderColor: PODIUM_TINT[i] }]}>
                    <LinearGradient
                      colors={avatarGradient(row.name)}
                      start={gradientStart}
                      end={gradientEnd}
                      style={[styles.podiumAvatar, first && shadow.glowSoft]}
                    >
                      <Text style={styles.podiumInitials}>{initialsOf(row.name)}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={[styles.podiumPoints, { color: PODIUM_TINT[i] }]}>{row.points}p</Text>

                  <View style={[styles.pedestal, { height: PODIUM_HEIGHT[i] }]}>
                    <LinearGradient
                      colors={
                        first
                          ? gradientColors
                          : [colors.surface3, colors.surface2]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.pedestalRank, !first && { color: colors.textDim }]}>
                      {row.rank}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* 4. sıradan itibaren */}
          {rest.map((row, i) => (
            <Animated.View
              key={`${row.rank}-${row.name}`}
              entering={FadeInDown.delay(Math.min(i, 6) * 45 + 260).duration(360)}
              style={[styles.row, row.isMe && styles.rowMe]}
            >
              <Text style={styles.rankNum}>{row.rank}</Text>
              <LinearGradient
                colors={avatarGradient(row.name)}
                start={gradientStart}
                end={gradientEnd}
                style={styles.rowAvatar}
              >
                <Text style={styles.rowInitials}>{initialsOf(row.name)}</Text>
              </LinearGradient>
              <Text style={[styles.name, row.isMe && styles.textMe]} numberOfLines={1}>
                {row.name}
                {row.isMe ? ' (sen)' : ''}
              </Text>
              <Text style={[styles.points, row.isMe && styles.textMe]}>{row.points}p</Text>
            </Animated.View>
          ))}

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
            <Text style={styles.noteText}>
              {t('leader.note')}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Kendi sıran — ilk üçte değilsen altta sabit durur */}
      {me && !meInTop && (
        <View style={styles.sticky}>
          <BlurView intensity={40} tint={themeInfo.blurTint} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
          <View style={styles.stickyInner}>
            <Text style={styles.rankNum}>{me.rank}</Text>
            <LinearGradient
              colors={gradientColors}
              start={gradientStart}
              end={gradientEnd}
              style={styles.rowAvatar}
            >
              <Text style={styles.rowInitials}>{initialsOf(me.name)}</Text>
            </LinearGradient>
            <Text style={[styles.name, styles.textMe]} numberOfLines={1}>
              {me.name} ({t('leader.you')})
            </Text>
            <Text style={[styles.points, styles.textMe]}>{me.points}p</Text>
          </View>
        </View>
      )}
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
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  chipTextActive: { color: colors.text, fontWeight: '500' },
  context: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.sm, marginLeft: 2 },

  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  podiumCol: { flex: 1, alignItems: 'center' },
  podiumRing: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumInitials: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  podiumName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500', maxWidth: '100%' },
  podiumPoints: { fontSize: fontSize.xs, fontWeight: '600', marginBottom: 6, ...tabularNums },
  pedestal: {
    width: '100%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.sm,
  },
  pedestalRank: { color: '#fff', fontSize: fontSize.lg, fontFamily: font.displayBold },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  rowMe: {
    backgroundColor: colors.brandBg,
    borderRadius: radius.md,
    borderTopWidth: 0,
    marginVertical: 2,
  },
  rowAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowInitials: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  rankNum: { width: 24, textAlign: 'center', color: colors.textDim, fontSize: fontSize.sm, ...tabularNums },
  name: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  points: { color: colors.text, fontSize: fontSize.md, fontWeight: '600', ...tabularNums },
  textMe: { color: colors.magenta },

  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  noteText: { color: colors.textFaint, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },

  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    overflow: 'hidden',
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
}));
