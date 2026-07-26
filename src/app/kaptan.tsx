// Kaptan paneli — kanıtlar (feed gibi kendiliğinden oynayan video + onayla/reddet)
// ve üye/görev eksik ızgarası.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useT, type TranslationKey } from '@/lib/i18n';
import { EmptyState } from '@/components/EmptyState';
import { InlineVideo, useScreenFocused, useVisibleVideo } from '@/components/InlineVideo';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import {
  decideSubmission,
  getCaptainData,
  type CaptainData,
  type GridStatus,
} from '@/lib/captain';
import { getMyTeams, type MyTeam } from '@/lib/teams';
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

const CELL: Record<GridStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  approved: { icon: 'checkmark', color: colors.success, bg: colors.successBg },
  pending: { icon: 'time-outline', color: colors.warning, bg: colors.warningBg },
  rejected: { icon: 'close', color: colors.danger, bg: colors.dangerBg },
  missing: { icon: 'remove', color: colors.textFaint, bg: colors.surface2 },
};

const DECIDED: Record<
  'approved' | 'rejected',
  { color: () => string; bg: () => string; label: TranslationKey }
> = {
  approved: { color: () => colors.success, bg: () => colors.successBg, label: 'status.approved' },
  rejected: { color: () => colors.danger, bg: () => colors.dangerBg, label: 'status.rejected' },
};

type Tab = 'onaylar' | 'eksikler';

export default function KaptanScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId?: string }>();
  const { toast, celebrate } = useToast();

  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selRef = useRef<string | null>(params.teamId ?? null);
  const [data, setData] = useState<CaptainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('onaylar');

  const focused = useScreenFocused();
  const { visibleId, viewabilityConfigCallbackPairs } = useVisibleVideo();

  const pendingCount = data?.submissions.filter((s) => s.status === 'pending').length ?? 0;
  const submissions = tab === 'onaylar' ? data?.submissions ?? [] : [];
  // Görünürlük geri bildirimi gelene kadar ilk kanıt oynasın.
  const activeVideoId = visibleId ?? submissions[0]?.id ?? null;

  const load = useCallback(async (teamId: string) => {
    const d = await getCaptainData(teamId);
    setData(d);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const all = await getMyTeams();
        const captainTeams = all.filter((t) => t.role === 'captain');
        if (!active) return;
        setTeams(captainTeams);
        const keep = selRef.current && captainTeams.find((t) => t.id === selRef.current);
        const sel = keep ? selRef.current! : captainTeams[0]?.id ?? null;
        selRef.current = sel;
        setSelectedId(sel);
        if (sel) await load(sel);
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const pickTeam = async (id: string) => {
    selRef.current = id;
    setSelectedId(id);
    setLoading(true);
    await load(id);
    setLoading(false);
  };

  const decide = async (id: string, approve: boolean) => {
    const { error } = await decideSubmission(id, approve);
    if (error) return toast(error, 'error');
    if (approve) celebrate(t('captain.approved'));
    else toast(t('captain.rejected'), 'info');
    if (selectedId) load(selectedId);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Kaptan paneli</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ListSkeleton count={5} height={72} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon="shield-outline"
          title={t('captain.noTeamTitle')}
          body={t('captain.noTeamBody')}
          actionLabel={t('captain.noTeamAction')}
          onAction={() => router.push('/join-team')}
        />
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(s) => s.id}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {teams.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
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

              <View style={styles.stats}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>{t('captain.pending')}</Text>
                  <Text style={styles.statValue}>{pendingCount}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>{t('captain.members')}</Text>
                  <Text style={styles.statValue}>{data?.memberCount ?? 0}</Text>
                </View>
              </View>

              <View style={styles.toggle}>
                {(['onaylar', 'eksikler'] as const).map((key) => (
                  <Pressable
                    key={key}
                    style={[styles.segment, tab === key && styles.segmentActive]}
                    onPress={() => setTab(key)}
                  >
                    <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>
                      {t(key === 'onaylar' ? 'captain.tabProofs' : 'captain.tabMissing')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item: s }) => (
            <View style={styles.subCard}>
              <View style={styles.subHead}>
                <View style={styles.subAvatar}>
                  <Text style={styles.subAvatarText}>{s.member.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subMember}>{s.member}</Text>
                  <Text style={styles.subTask}>{s.taskTitle}</Text>
                </View>
                {s.status !== 'pending' && (
                  <View style={[styles.decidedPill, { backgroundColor: DECIDED[s.status].bg() }]}>
                    <Text style={[styles.decidedText, { color: DECIDED[s.status].color() }]}>
                      {t(DECIDED[s.status].label)}
                    </Text>
                  </View>
                )}
              </View>

              {s.videoUrl ? (
                <InlineVideo
                  uri={s.videoUrl}
                  active={focused && activeVideoId === s.id}
                  contentFit="contain"
                  style={styles.videoBox}
                />
              ) : (
                <View style={styles.videoNone}>
                  <Text style={styles.note}>Video yok</Text>
                </View>
              )}

              {s.note ? <Text style={styles.noteLine}>“{s.note}”</Text> : null}

              {s.status === 'pending' && (
                <View style={styles.subActions}>
                  <Pressable style={{ flex: 1 }} onPress={() => decide(s.id, true)}>
                    <LinearGradient
                      colors={gradientColors}
                      start={gradientStart}
                      end={gradientEnd}
                      style={styles.approveBtn}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.approveText}>Onayla</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => decide(s.id, false)}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                    <Text style={styles.rejectText}>Reddet</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={
            tab === 'eksikler' ? (
              <View>
                {!data || data.members.length === 0 ? (
                  <Text style={styles.emptyText}>{t('captain.noMembers')}</Text>
                ) : (
                  <>
                    <View style={styles.gridHeadRow}>
                      <Text style={[styles.gridHeadCell, { flex: 1, textAlign: 'left' }]}>{t('captain.members')}</Text>
                      {data.taskCols.map((c, i) => (
                        <Text key={i} style={styles.gridHeadCell}>
                          {c}
                        </Text>
                      ))}
                    </View>
                    {data.members.map((m) => (
                      <View key={m.name} style={styles.gridRow}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        {m.statuses.map((st, i) => {
                          const c = CELL[st];
                          return (
                            <View key={i} style={styles.cellWrap}>
                              <View style={[styles.cell, { backgroundColor: c.bg }]}>
                                <Ionicons name={c.icon} size={14} color={c.color} />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                    <View style={styles.legend}>
                      <Legend icon="checkmark" color={colors.success} label={t('captain.legendDone')} />
                      <Legend icon="time-outline" color={colors.warning} label={t('captain.legendPending')} />
                      <Legend icon="remove" color={colors.textFaint} label={t('captain.legendMissing')} />
                    </View>
                  </>
                )}
              </View>
            ) : submissions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="videocam-outline" size={40} color={colors.textFaint} />
                <Text style={styles.emptyText}>{t('captain.noProofs')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

function Legend({ icon, color, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.xxl },
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
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs },
  statValue: { color: colors.text, fontSize: fontSize.xl, fontWeight: '500', marginTop: 2 },
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
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl },
  emptyText: { color: colors.textDim, fontSize: fontSize.md, textAlign: 'center' },
  subCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  subHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  subAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAvatarText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '600' },
  subMember: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  subTask: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  decidedPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  decidedText: { fontSize: fontSize.xs, fontWeight: '500' },
  videoBox: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  videoNone: {
    minHeight: 96,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  note: { color: colors.textFaint, fontSize: fontSize.sm },
  noteLine: { color: colors.textDim, fontSize: fontSize.xs, marginTop: spacing.sm },
  subActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  approveText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerBg,
  },
  rejectText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '500' },
  gridHeadRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm, paddingHorizontal: 2 },
  gridHeadCell: { width: 40, textAlign: 'center', color: colors.textFaint, fontSize: fontSize.xs },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  memberName: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  cellWrap: { width: 40, alignItems: 'center' },
  cell: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: colors.textFaint, fontSize: fontSize.xs },
}));
