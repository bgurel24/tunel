// Görevler — seçili takımın gerçek görevleri, durumları, kanıt yükleme.
// Kaptansan görev ekleyip silebilirsin.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { OutlineButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { ListSkeleton, Skeleton } from '@/components/Skeleton';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import {
  createTask,
  deleteTask,
  getTeamTasks,
  type SubmissionStatus,
  type TeamTask,
} from '@/lib/tasks';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { colors, fontSize, radius, spacing } from '@/theme';

const STATUS: Record<Exclude<SubmissionStatus, 'none'>, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  approved: { color: colors.success, bg: colors.successBg, label: 'onaylandı', icon: 'checkmark' },
  pending: { color: colors.warning, bg: colors.warningBg, label: 'bekliyor', icon: 'time-outline' },
  rejected: { color: colors.danger, bg: colors.dangerBg, label: 'reddedildi', icon: 'close' },
};

export default function GorevlerScreen() {
  const router = useRouter();
  const bottomPad = useTabBarPadding();
  const { toast, confirm } = useToast();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  // Ekleme kutusu listenin ÜSTÜNDE ve sabit yerde duruyor: görev sayısı artınca
  // aşağı kayıp klavyenin altında kalmasın diye.
  const [showAdd, setShowAdd] = useState(false);

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

  // Ekledikten sonra kutu açık ve klavye kalkmadan kalır — arka arkaya görev girmek kolay olsun.
  const addTask = async () => {
    if (!selectedTeam || !newTitle.trim() || adding) return;
    setAdding(true);
    const { error } = await createTask(selectedTeam.id, newTitle);
    setAdding(false);
    if (error) return toast(error, 'error');
    setNewTitle('');
    toast('Görev eklendi');
    await loadTasks(selectedTeam.id);
  };

  const removeTask = async (task: TeamTask) => {
    const ok = await confirm({
      title: 'Görevi sil',
      message: `"${task.title}" listeden kalkacak. Yüklenen kanıtlar da gider.`,
      confirmLabel: 'Sil',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteTask(task.id);
    if (error) toast(error, 'error');
    else if (selectedTeam) {
      toast('Görev silindi', 'info');
      loadTasks(selectedTeam.id);
    }
  };

  const total = tasks.length;
  const approved = tasks.filter((t) => t.myStatus === 'approved').length;
  const progress = total > 0 ? approved / total : 0;

  if (loading) {
    return (
      <Screen edges={['top']}>
        <Text style={styles.title}>Görevler</Text>
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
        <Text style={styles.title}>Görevler</Text>
        <EmptyState
          icon="people-outline"
          title="Önce bir takım"
          body="Görevler için bir takıma katıl ya da kendi takımını oluştur."
          actionLabel="Takıma katıl / oluştur"
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
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <Text style={styles.title}>Görevler</Text>
          <View style={styles.headerActions}>
            {isCaptain && (
              <Pressable
                style={[styles.iconBtn, showAdd && styles.iconBtnActive]}
                onPress={() => setShowAdd((v) => !v)}
                hitSlop={8}
              >
                <Ionicons name={showAdd ? 'close' : 'add'} size={22} color={colors.accent} />
              </Pressable>
            )}
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
          {isCaptain ? ' · Kaptan' : ''}
        </Text>

        {total > 0 && (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>İlerleme</Text>
              <Text style={styles.progressValue}>
                {approved} / {total}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </>
        )}

        {isCaptain && showAdd && (
          <View style={styles.addBox}>
            <View style={styles.addRow}>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="ör. Squat videosu"
                placeholderTextColor={colors.textFaint}
                style={styles.addInput}
                autoFocus
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
            <Text style={styles.addHint}>Ekle'ye bastıkça liste büyür, klavye açık kalır.</Text>
          </View>
        )}

        {tasks.length === 0 ? (
          <View style={styles.noTasks}>
            <Text style={styles.emptyBody}>
              {isCaptain ? 'Henüz görev yok. Yukarıdaki + ile ekle.' : 'Kaptan henüz görev eklemedi.'}
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
                <Text style={styles.taskSub}>{task.points} puan</Text>
              </View>

              {task.myStatus === 'none' || task.myStatus === 'rejected' ? (
                <Pressable
                  style={styles.uploadBtn}
                  onPress={() =>
                    router.push({ pathname: '/gorev-yukle', params: { taskId: task.id, task: task.title, teamId: selectedTeam?.id ?? '' } })
                  }
                >
                  <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
                  <Text style={styles.uploadText}>{task.myStatus === 'rejected' ? 'Tekrar' : 'Yükle'}</Text>
                </Pressable>
              ) : (
                <View style={[styles.statusPill, { backgroundColor: STATUS[task.myStatus].bg }]}>
                  <Text style={[styles.statusText, { color: STATUS[task.myStatus].color }]}>
                    {STATUS[task.myStatus].label}
                  </Text>
                </View>
              )}

              {isCaptain && (
                <Pressable onPress={() => removeTask(task)} hitSlop={8} style={{ marginLeft: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                </Pressable>
              )}
            </View>
          ))
        )}

        {isCaptain && (
          <OutlineButton
            label="Kaptan paneli (onaylar)"
            onPress={() => router.push({ pathname: '/kaptan', params: { teamId: selectedTeam?.id ?? '' } })}
            style={{ marginTop: spacing.lg }}
          />
        )}

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
          <Text style={styles.infoText}>Takım puanı yalnızca onaylı görevlerden gelir.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xxl, paddingHorizontal: spacing.md },
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
  iconBtnActive: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent },
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
  addBox: { marginBottom: spacing.lg },
  addHint: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.sm },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
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
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  emptyBody: { color: colors.textDim, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
