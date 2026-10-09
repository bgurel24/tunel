// Panel — kişisel pano: haftalık hedef halkası, bugün salonda, görevlerim, sıralamam.
// Akıştan farkı: "bugün ne durumdayız" sorusunun tek bakışlık cevabı.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useT } from '@/lib/i18n';
import { getCrew, type CrewMember } from '@/lib/crew';
import { getLeaderboard, type LeaderRow } from '@/lib/leaderboard';
import { getMyProfile } from '@/lib/profile';
import { getTeamWeek } from '@/lib/stats';
import { getTeamTasks, type TeamTask } from '@/lib/tasks';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { useAuth } from '@/lib/auth';
import { colors, font, fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

const RING = 108;
const STROKE = 11;

function GoalRing({ pumps, goal }: { pumps: number; goal: number }) {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.min(1, pumps / goal) : 0;
  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={styles.ringValue}>{pumps}</Text>
        <Text style={styles.ringUnit}>/ {goal}</Text>
      </View>
    </View>
  );
}

export default function PanelScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const bottomPad = useTabBarPadding();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<MyTeam | null>(null);
  const [name, setName] = useState('');
  const [week, setWeek] = useState<{ pumps: number; goal: number }>({ pumps: 0, goal: 10 });
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [teams, profile, members] = await Promise.all([getMyTeams(), getMyProfile(), getCrew()]);
        if (!active) return;
        const sel = teams[0] ?? null;
        setTeam(sel);
        setName(profile?.username ?? '');
        setCrew(members);
        if (sel) {
          const [w, ts, lb] = await Promise.all([
            getTeamWeek(sel.id),
            getTeamTasks(sel.id, userId),
            getLeaderboard('bireysel', sel.id),
          ]);
          if (!active) return;
          setWeek(w);
          setTasks(ts);
          setLeaders(lb);
        }
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [userId])
  );

  const today = new Date();
  const dateLabel = today.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const activeCrew = crew.filter((m) => m.activeToday);
  const openTasks = tasks.filter((x) => x.myStatus === 'none' || x.myStatus === 'rejected');
  const me = leaders.find((l) => l.isMe) ?? null;
  const top = leaders[0] ?? null;
  const gapToTop = me && top && !(me.rank === 1) ? top.points - me.points : 0;

  if (loading) {
    return (
      <Screen edges={['top']}>
        <Text style={styles.hello}>{t('panel.hello', { name })}</Text>
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <ListSkeleton count={3} height={110} />
        </View>
      </Screen>
    );
  }

  if (!team) {
    return (
      <Screen edges={['top']}>
        <Text style={styles.hello}>{t('panel.hello', { name })}</Text>
        <EmptyState
          icon="people-outline"
          title={t('tasks.noTeamTitle')}
          body={t('tasks.noTeamBody')}
          actionLabel={t('tasks.noTeamAction')}
          onAction={() => router.push('/join-team')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.hello}>{t('panel.hello', { name })}</Text>

        <View style={styles.grid}>
          {/* Haftalık hedef */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('panel.weeklyGoal')}</Text>
            <View style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
              <GoalRing pumps={week.pumps} goal={week.goal} />
            </View>
          </View>

          {/* Bugün salonda */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('panel.todayGym')}</Text>
            <View style={styles.avatarRow}>
              {activeCrew.slice(0, 4).map((m, i) => (
                <View key={m.id} style={[styles.miniAvatar, i > 0 && { marginLeft: -8 }]}>
                  <Text style={styles.miniAvatarText}>{m.username.slice(0, 2).toUpperCase()}</Text>
                </View>
              ))}
              <Text style={styles.peopleText}>
                {t('panel.people', { a: activeCrew.length, b: crew.length })}
              </Text>
            </View>
            <Touchable style={styles.callBtn} onPress={() => router.push('/cagri')} scaleTo={0.97}>
              <Text style={styles.callBtnText}>{t('panel.callTeam')}</Text>
            </Touchable>
          </View>

          {/* Görevlerim */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('panel.myTasks')}</Text>
            {tasks.length === 0 ? (
              <Text style={styles.dimSmall}>{t('panel.noTasks')}</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {tasks.slice(0, 3).map((task) => (
                  <View key={task.id} style={styles.taskLine}>
                    {task.myStatus === 'approved' ? (
                      <Ionicons name="checkmark" size={15} color={colors.success} />
                    ) : (
                      <View style={styles.taskBox} />
                    )}
                    <Text
                      style={[styles.taskText, task.myStatus === 'approved' && styles.taskDone]}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Touchable onPress={() => router.push('/gorevler')} scaleTo={0.97}>
              <Text style={styles.linkText}>{t('panel.allTasks')}</Text>
            </Touchable>
          </View>

          {/* Sıralaman */}
          <Touchable
            style={styles.card}
            onPress={() => router.push({ pathname: '/liderlik', params: { teamId: team.id } })}
            scaleTo={0.97}
          >
            <Text style={styles.cardLabel}>{t('panel.myRank')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={styles.rankValue}>{me ? `#${me.rank}` : '—'}</Text>
              <Text style={styles.dimSmall}>/ {leaders.length}</Text>
            </View>
            {me && (
              <Text style={styles.dimSmall}>
                {t('panel.pointsShort', { n: me.points })}
                {gapToTop > 0 ? ` · ${t('panel.toTop', { n: gapToTop })}` : ''}
              </Text>
            )}
          </Touchable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  content: { paddingHorizontal: spacing.xl },
  date: { color: colors.textDim, fontSize: fontSize.sm, paddingTop: spacing.md },
  hello: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: font.display,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
    flexBasis: '45%',
  },
  cardLabel: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ringValue: { color: colors.text, fontSize: fontSize.xl, fontFamily: font.displayBold, ...tabularNums },
  ringUnit: { color: colors.textDim, fontSize: fontSize.xs },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface3,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  peopleText: { color: colors.textDim, fontSize: fontSize.xs, marginLeft: spacing.sm },
  callBtn: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  callBtnText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
  taskLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  taskBox: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textFaint,
  },
  taskText: { color: colors.text, fontSize: fontSize.sm, flex: 1 },
  taskDone: { color: colors.textDim, textDecorationLine: 'line-through' },
  linkText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '600' },
  rankValue: { color: colors.accent, fontSize: fontSize.display, fontFamily: font.displayBold, ...tabularNums },
  dimSmall: { color: colors.textDim, fontSize: fontSize.xs },
}));
