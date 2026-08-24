// Kaptan paneli — görev yönetimi (ekle/sil/süre uzat), bekleyen kanıtlar (feed
// gibi kendiliğinden oynayan video + onayla/reddet), üye/görev eksik ızgarası ve
// haftalık rapor.
//
// Görev ekleme burada; Görevler sekmesi üyenin "yapılacaklar" ekranı olarak kaldı.
//
// Kanıtlar sekmesi yalnızca ONAY BEKLEYENLERİ gösterir. Karar verilen kanıt
// listeden düşer ama kaybolmaz: üyenin profilinde durur, kaptan oradan izler.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useT, type TranslationKey } from '@/lib/i18n';
import { Avatar } from '@/components/Avatar';
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
  type CaptainTask,
  type GridStatus,
} from '@/lib/captain';
import { getWeeklyReport, type MemberReport, type WeeklyReport } from '@/lib/report';
import { createTask, deleteTask, extendTask } from '@/lib/tasks';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { dueLabel } from '@/lib/time';
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
  { color: string; bg: string; label: TranslationKey }
> = {
  approved: { color: colors.success, bg: colors.successBg, label: 'status.approved' },
  rejected: { color: colors.danger, bg: colors.dangerBg, label: 'status.rejected' },
};

const REPORT_STATUS: Record<
  MemberReport['status'],
  { color: string; bg: string; label: TranslationKey }
> = {
  full: { color: colors.success, bg: colors.successBg, label: 'report.full' },
  partial: { color: colors.warning, bg: colors.warningBg, label: 'report.partial' },
  none: { color: colors.danger, bg: colors.dangerBg, label: 'report.none' },
};

type Tab = 'gorevler' | 'onaylar' | 'eksikler' | 'rapor';

const TABS: { key: Tab; label: TranslationKey }[] = [
  { key: 'gorevler', label: 'captain.tabTasks' },
  { key: 'onaylar', label: 'captain.tabProofs' },
  { key: 'eksikler', label: 'captain.tabMissing' },
  { key: 'rapor', label: 'captain.tabReport' },
];

export default function KaptanScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId?: string }>();
  const { toast, celebrate, confirm, prompt } = useToast();

  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selRef = useRef<string | null>(params.teamId ?? null);
  const [data, setData] = useState<CaptainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('gorevler');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  // Haftalık rapor: 0 bu hafta, -1 geçen hafta…
  const [weekOffset, setWeekOffset] = useState(0);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const focused = useScreenFocused();
  const { visibleId, viewabilityConfigCallbackPairs } = useVisibleVideo();

  // Onay ekranında yalnızca bekleyenler; karar verilenler üyenin profilinde.
  const pending = data?.submissions.filter((s) => s.status === 'pending') ?? [];
  const pendingCount = pending.length;
  const submissions = tab === 'onaylar' ? pending : [];
  // Görünürlük geri bildirimi gelene kadar ilk kanıt oynasın.
  const activeVideoId = visibleId ?? submissions[0]?.id ?? null;

  const load = useCallback(async (teamId: string) => {
    const d = await getCaptainData(teamId);
    setData(d);
  }, []);

  // Rapor sekmesi açılınca (ve hafta değişince) ayrı çekilir — diğer
  // sekmelerde boşuna sorgu atmayalım.
  useEffect(() => {
    if (tab !== 'rapor' || !selectedId) return;
    let active = true;
    setReportLoading(true);
    getWeeklyReport(selectedId, weekOffset).then((r) => {
      if (!active) return;
      setReport(r);
      setReportLoading(false);
    });
    return () => {
      active = false;
    };
  }, [tab, selectedId, weekOffset]);

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

  // Reddederken sebep sorulur — üye neyi düzelteceğini bilsin. Boş bırakmak serbest.
  const decide = async (id: string, approve: boolean) => {
    let note: string | null = null;
    if (!approve) {
      note = await prompt({
        title: t('captain.rejectTitle'),
        message: t('captain.rejectMessage'),
        placeholder: t('captain.rejectPlaceholder'),
        confirmLabel: t('captain.reject'),
        icon: 'close-circle-outline',
        autoCapitalize: 'sentences',
      });
      if (note === null) return;
    }

    const { error } = await decideSubmission(id, approve, note);
    if (error) return toast(error, 'error');
    if (approve) celebrate(t('captain.approved'));
    else toast(t('captain.rejected'), 'info');
    if (selectedId) load(selectedId);
  };

  // Ekledikten sonra kutu ve klavye açık kalır — arka arkaya görev girmek kolay olsun.
  const addTask = async () => {
    if (!selectedId || !newTitle.trim() || adding) return;
    setAdding(true);
    const { error } = await createTask(selectedId, newTitle);
    setAdding(false);
    if (error) return toast(error, 'error');
    setNewTitle('');
    toast(t('tasks.added'));
    load(selectedId);
  };

  const removeTask = async (task: CaptainTask) => {
    const ok = await confirm({
      title: t('tasks.deleteTitle'),
      message: t('tasks.deleteMessage', { title: task.title }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteTask(task.id);
    if (error) return toast(error, 'error');
    toast(t('tasks.deleted'), 'info');
    if (selectedId) load(selectedId);
  };

  // Süresi dolan göreve ikinci bir hafta. Tarih bugünden sayılır — geçmiş bir
  // son tarihe 7 gün eklemek çoğu zaman yine geçmişte kalırdı.
  const askExtend = async (task: CaptainTask) => {
    const ok = await confirm({
      title: t('tasks.extendTitle'),
      message: t('tasks.extendMessage', { title: task.title }),
      confirmLabel: t('tasks.extend'),
      icon: 'time-outline',
    });
    if (!ok) return;
    const { error } = await extendTask(task.id);
    if (error) return toast(error, 'error');
    toast(t('tasks.extended'));
    if (selectedId) load(selectedId);
  };

  const openProfile = (userId: string | null) => {
    if (userId) router.push({ pathname: '/kullanici', params: { id: userId } });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('captain.title')}</Text>
        {selectedId ? (
          <Pressable
            onPress={() => router.push({ pathname: '/uyeler', params: { teamId: selectedId } })}
            hitSlop={12}
          >
            <Ionicons name="people-outline" size={24} color={colors.accent} />
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
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
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
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
                {TABS.map(({ key, label }) => (
                  <Pressable
                    key={key}
                    style={[styles.segment, tab === key && styles.segmentActive]}
                    onPress={() => setTab(key)}
                  >
                    <Text
                      style={[styles.segmentText, tab === key && styles.segmentTextActive]}
                      numberOfLines={1}
                    >
                      {t(label)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'gorevler' && (
                <View style={styles.addRow}>
                  <TextInput
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder={t('tasks.addPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    style={styles.addInput}
                    returnKeyType="done"
                    submitBehavior="submit"
                    onSubmitEditing={addTask}
                  />
                  <Pressable style={styles.addBtn} onPress={addTask} disabled={adding}>
                    {adding ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="add" size={22} color="#fff" />
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          }
          renderItem={({ item: s }) => (
            <View style={styles.subCard}>
              {/* Ada dokunmak profili açar — kaptan kişinin tüm geçmişini oradan görür. */}
              <Pressable style={styles.subHead} onPress={() => openProfile(s.memberId)}>
                <View style={styles.subAvatar}>
                  <Text style={styles.subAvatarText}>{s.member.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subMember}>{s.member}</Text>
                  <Text style={styles.subTask}>{s.taskTitle}</Text>
                </View>
                {s.late && (
                  <View style={styles.latePill}>
                    <Text style={styles.lateText}>{t('tasks.late')}</Text>
                  </View>
                )}
                {s.status !== 'pending' && (
                  <View style={[styles.decidedPill, { backgroundColor: DECIDED[s.status].bg }]}>
                    <Text style={[styles.decidedText, { color: DECIDED[s.status].color }]}>
                      {t(DECIDED[s.status].label)}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>

              {s.videoUrl ? (
                <InlineVideo
                  uri={s.videoUrl}
                  active={focused && activeVideoId === s.id}
                  contentFit="contain"
                  style={styles.videoBox}
                />
              ) : (
                <View style={styles.videoNone}>
                  <Text style={styles.note}>{t('captain.noVideo')}</Text>
                </View>
              )}

              {s.note ? <Text style={styles.noteLine}>“{s.note}”</Text> : null}
              {s.status === 'rejected' && s.rejectNote ? (
                <Text style={styles.rejectNoteLine}>
                  {t('captain.rejectReason')}: {s.rejectNote}
                </Text>
              ) : null}

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
                      <Text style={styles.approveText}>{t('captain.approve')}</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => decide(s.id, false)}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                    <Text style={styles.rejectText}>{t('captain.reject')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={
            tab === 'gorevler' ? (
              <View>
                {!data || data.tasks.length === 0 ? (
                  <Text style={styles.emptyText}>{t('captain.noTasks')}</Text>
                ) : (
                  <>
                    {data.tasks.map((task, i) => (
                      <View key={task.id} style={styles.taskRow}>
                        <View style={styles.taskIcon}>
                          <Text style={styles.taskOrder}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <Text style={styles.taskSub}>
                            {t('tasks.points', { n: task.points })} ·{' '}
                            {t('captain.taskDone', { n: task.approvedCount })}
                          </Text>
                          <Text style={task.overdue ? styles.dueLate : styles.dueSoon}>
                            {task.dueAt ? dueLabel(task.dueAt) : t('tasks.noDue')}
                          </Text>
                        </View>
                        <Pressable onPress={() => askExtend(task)} hitSlop={10} style={styles.taskAction}>
                          <Ionicons
                            name="time-outline"
                            size={17}
                            color={task.overdue ? colors.warning : colors.textFaint}
                          />
                        </Pressable>
                        <Pressable onPress={() => removeTask(task)} hitSlop={10} style={styles.taskAction}>
                          <Ionicons name="trash-outline" size={17} color={colors.textFaint} />
                        </Pressable>
                      </View>
                    ))}
                    <Text style={styles.addHint}>{t('tasks.addHint')}</Text>
                  </>
                )}
              </View>
            ) : tab === 'eksikler' ? (
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
                      <Pressable
                        key={m.id}
                        style={styles.gridRow}
                        onPress={() => openProfile(m.id)}
                      >
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
                      </Pressable>
                    ))}
                    <View style={styles.legend}>
                      <Legend icon="checkmark" color={colors.success} label={t('captain.legendDone')} />
                      <Legend icon="time-outline" color={colors.warning} label={t('captain.legendPending')} />
                      <Legend icon="remove" color={colors.textFaint} label={t('captain.legendMissing')} />
                    </View>
                  </>
                )}
              </View>
            ) : tab === 'rapor' ? (
              <ReportPanel
                report={report}
                loading={reportLoading}
                offset={weekOffset}
                onOffset={setWeekOffset}
                onMember={openProfile}
              />
            ) : submissions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="videocam-outline" size={40} color={colors.textFaint} />
                <Text style={styles.emptyText}>{t('captain.noProofs')}</Text>
              </View>
            ) : (
              <Text style={styles.addHint}>{t('captain.decidedHint')}</Text>
            )
          }
        />
      )}
    </Screen>
  );
}

/**
 * Haftalık rapor — o haftanın görevlerinde kim tam yaptı, kim yarım bıraktı,
 * kim hiç kımıldamadı. Satıra dokununca kişinin profili açılır (videolar orada).
 */
function ReportPanel({
  report,
  loading,
  offset,
  onOffset,
  onMember,
}: {
  report: WeeklyReport | null;
  loading: boolean;
  offset: number;
  onOffset: (n: number) => void;
  onMember: (id: string) => void;
}) {
  const t = useT();

  const counts = {
    full: report?.members.filter((m) => m.status === 'full').length ?? 0,
    partial: report?.members.filter((m) => m.status === 'partial').length ?? 0,
    none: report?.members.filter((m) => m.status === 'none').length ?? 0,
  };

  return (
    <View>
      <View style={styles.weekNav}>
        <Pressable onPress={() => onOffset(offset - 1)} hitSlop={10} style={styles.weekBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.weekLabel}>{report?.rangeLabel ?? ''}</Text>
          <Text style={styles.weekSub}>
            {offset === 0 ? `${t('report.thisWeek')} · ` : ''}
            {t(report?.closed ? 'report.weekClosed' : 'report.weekOpen')}
          </Text>
        </View>
        {/* İleri yön bu haftada durur — gelecek haftanın raporu diye bir şey yok. */}
        <Pressable
          onPress={() => onOffset(Math.min(0, offset + 1))}
          hitSlop={10}
          style={styles.weekBtn}
          disabled={offset >= 0}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={offset >= 0 ? colors.textFaint : colors.text}
          />
        </Pressable>
      </View>

      {loading ? (
        <ListSkeleton count={3} height={64} />
      ) : !report || report.taskCount === 0 ? (
        <Text style={styles.emptyText}>{t('report.noTasks')}</Text>
      ) : report.members.length === 0 ? (
        <Text style={styles.emptyText}>{t('report.noMembers')}</Text>
      ) : (
        <>
          <Text style={styles.reportSummary}>
            {t('report.taskCount', { n: report.taskCount })} · {t('report.summary', counts)}
          </Text>

          {report.members.map((m) => {
            const s = REPORT_STATUS[m.status];
            // Hafta sürerken hiç yapmayana "hiç yapmadı" demek erken — henüz vakti var.
            const label = m.status === 'none' && !report.closed ? 'report.noneOpen' : s.label;
            const bits = [
              t('report.doneOf', { done: m.done, total: m.total }),
              m.pending > 0 ? t('report.pendingCount', { n: m.pending }) : null,
              m.rejected > 0 ? t('report.rejectedCount', { n: m.rejected }) : null,
              m.missing > 0 ? t('report.missingCount', { n: m.missing }) : null,
              m.late > 0 ? t('report.lateCount', { n: m.late }) : null,
            ].filter(Boolean);

            return (
              <Pressable key={m.userId} style={styles.reportRow} onPress={() => onMember(m.userId)}>
                <Avatar username={m.name} url={m.avatarUrl} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportName}>{m.name}</Text>
                  <Text style={styles.reportBits}>{bits.join(' · ')}</Text>
                  {m.missedTitles.length > 0 && (
                    <Text style={styles.reportMissed} numberOfLines={2}>
                      {t('report.missed', { list: m.missedTitles.join(', ') })}
                    </Text>
                  )}
                </View>
                <View style={[styles.reportPill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.reportPillText, { color: s.color }]}>{t(label)}</Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </View>
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
  // Dört sekme yan yana — dar telefonda sıkışmasın diye yatay boşluk kısıldı.
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface2 },
  segmentText: { color: colors.textDim, fontSize: fontSize.xs },
  segmentTextActive: { color: colors.text, fontWeight: '600' },

  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSize.md,
  },
  addBtn: {
    width: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHint: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.md },
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
  taskAction: { width: 30, alignItems: 'center' },
  dueSoon: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  dueLate: { color: colors.danger, fontSize: fontSize.xs, marginTop: 2 },
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
  latePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
  },
  lateText: { color: colors.warning, fontSize: fontSize.xs, fontWeight: '500' },
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
  rejectNoteLine: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
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

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  weekBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  weekSub: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  reportSummary: { color: colors.textDim, fontSize: fontSize.xs, marginBottom: spacing.sm },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  reportName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  reportBits: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  reportMissed: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 3, lineHeight: 15 },
  reportPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  reportPillText: { fontSize: fontSize.xs, fontWeight: '600' },
}));
