// Görevler — seçili takımın görevleri, durumları, kanıt yükleme.
// Bu ekran üyenin "yapılacaklar" listesi; görev ekleme/silme kaptan panelinde.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useT, type TranslationKey } from '@/lib/i18n';
import { EmptyState } from '@/components/EmptyState';
import { OutlineButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { ListSkeleton, Skeleton } from '@/components/Skeleton';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { getTeamTasks, type SubmissionStatus, type TeamTask } from '@/lib/tasks';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

const STATUS: Record<
  Exclude<SubmissionStatus, 'none'>,
  { color: string; bg: string; label: TranslationKey }
> = {
  approved: {
    color: colors.success,
    bg: colors.successBg,
    label: 'status.approved',
  },
  pending: {
    color: colors.warning,
    bg: colors.warningBg,
    label: 'status.pending',
  },
  rejected: {
    color: colors.danger,
    bg: colors.dangerBg,
    label: 'status.rejected',
  },
};

export default function GorevlerScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const bottomPad = useTabBarPadding();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedTeam = teams.find((t) => t.id === selectedId) ?? null;
  const isCaptain = selectedTeam?.role === 'captain';

  const loadTasks = useCallback(
    async (teamId: string) => {
      const data = await getTeamTasks(teamId, userId);
      setTasks(data);
    },
    [userId]
  );

  const setSel = (id: string | null) => {
    selRef.current = id;
    setSelectedId(id);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const t = await getMyTeams();
        if (!active) return;
        setTeams(t);
        const keep = selRef.current && t.find((x) => x.id === selRef.current);
        const sel = keep ? selRef.current! : t[0]?.id ?? null;
        setSel(sel);
        if (sel) await loadTasks(sel);
        else setTasks([]);
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [loadTasks])
  );

  const pickTeam = async (id: string) => {
    setSel(id);
    setLoading(true);
    await loadTasks(id);
    setLoading(false);
  };

  const total = tasks.length;
  const approved = tasks.filter((t) => t.myStatus === 'approved').length;
  const progress = total > 0 ? approved / total : 0;

  if (loading) {
    return (
      <Screen edges={['top']}>
        <Text style={styles.title}>{t('tasks.title')}</Text>
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <Skeleton height={54} rounded={radius.lg} />
          <ListSkeleton count={4} height={78} />
        </View>
      </Screen>
    );
  }

  if (teams.length === 0) {
    return (
      <Screen edges={['top']}>
        <Text style={styles.title}>{t('tasks.title')}</Text>
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
        <View style={styles.header}>
          <Text style={styles.title}>{t('tasks.title')}</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push({ pathname: '/liderlik', params: { teamId: selectedId ?? '' } })}
              hitSlop={8}
            >
              <Ionicons name="trophy-outline" size={22} color={colors.accent} />
            </Pressable>
          </View>
        </View>

        {teams.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {teams.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => pickTeam(t.id)}
                style={[styles.chip, selectedId === t.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedId === t.id && styles.chipTextActive]}>{t.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Text style={styles.subtitle}>
          {selectedTeam?.name}
          {isCaptain ? ` · ${t('profile.captain')}` : ''}
        </Text>

        {total > 0 && (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{t('tasks.progress')}</Text>
              <Text style={styles.progressValue}>
                {approved} / {total}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </>
        )}

        {tasks.length === 0 ? (
          <View style={styles.noTasks}>
            <Text style={styles.emptyBody}>
              {t(isCaptain ? 'tasks.emptyCaptain' : 'tasks.emptyMember')}
            </Text>
          </View>
        ) : (
          tasks.map((task, i) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={styles.taskIcon}>
                <Text style={styles.taskOrder}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskSub}>{t('tasks.points', { n: task.points })}</Text>
              </View>

              {task.myStatus === 'none' || task.myStatus === 'rejected' ? (
                <Pressable
                  style={styles.uploadBtn}
                  onPress={() =>
                    router.push({ pathname: '/gorev-yukle', params: { taskId: task.id, task: task.title, teamId: selectedTeam?.id ?? '' } })
                  }
                >
                  <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
                  <Text style={styles.uploadText}>
                    {t(task.myStatus === 'rejected' ? 'tasks.retry' : 'tasks.upload')}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.statusPill, { backgroundColor: STATUS[task.myStatus].bg }]}>
                  <Text style={[styles.statusText, { color: STATUS[task.myStatus].color }]}>
                    {t(STATUS[task.myStatus].label)}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {isCaptain && (
          <OutlineButton
            label={t('tasks.captainPanel')}
            onPress={() => router.push({ pathname: '/kaptan', params: { teamId: selectedTeam?.id ?? '' } })}
            style={{ marginTop: spacing.lg }}
          />
        )}

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
          <Text style={styles.infoText}>{t('tasks.info')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '500', paddingTop: spacing.sm },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  chipTextActive: { color: colors.text, fontWeight: '500' },
  subtitle: { color: colors.textFaint, fontSize: fontSize.sm, marginBottom: spacing.md },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { color: colors.textDim, fontSize: fontSize.sm },
  progressValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  barTrack: { height: 7, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden', marginBottom: spacing.lg },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
  noTasks: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  taskIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskOrder: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
  taskTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  taskSub: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  uploadText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '500' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  statusText: { fontSize: fontSize.xs, fontWeight: '500' },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  infoText: { color: colors.textDim, fontSize: fontSize.xs, flex: 1 },
  emptyBody: { color: colors.textDim, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
}));
