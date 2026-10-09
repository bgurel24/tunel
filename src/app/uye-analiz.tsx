// Üye analizi — kaptan görünümü: seri, devamsızlık, ısı haritası, görev durumu.
// Kaptan panelindeki "Aktivite" listesinden kişiye dokununca açılır.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { OutlineButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n';
import {
  getCaptainData,
  getMemberAnalysis,
  type GridStatus,
  type MemberAnalysis,
} from '@/lib/captain';
import { colors, font, fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

const STATUS_COLORS: Record<GridStatus, { color: string; bg: string; label: string }> = {
  approved: { color: colors.success, bg: colors.successBg, label: 'Onaylandı' },
  pending: { color: colors.warning, bg: colors.warningBg, label: 'Bekliyor' },
  rejected: { color: colors.danger, bg: colors.dangerBg, label: 'Reddedildi' },
  missing: { color: colors.textFaint, bg: colors.surface2, label: 'Yüklemedi' },
};

function fmtDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export default function UyeAnalizScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ userId?: string; username?: string; teamId?: string }>();
  const userId = params.userId ?? '';
  const username = params.username ?? '';
  const teamId = params.teamId ?? '';

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<MemberAnalysis | null>(null);
  const [taskRows, setTaskRows] = useState<{ title: string; status: GridStatus }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [a, cap] = await Promise.all([
          getMemberAnalysis(userId),
          teamId ? getCaptainData(teamId) : Promise.resolve(null),
        ]);
        if (!active) return;
        setAnalysis(a);
        if (cap) {
          setTaskRows(
            cap.tasks
              .filter((task) => task.rows.some((r) => r.userId === userId))
              .map((task) => ({
                title: task.title,
                status: task.rows.find((r) => r.userId === userId)!.status,
              }))
          );
        }
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [userId, teamId])
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Touchable onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Touchable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{username}</Text>
          <Text style={styles.subtitle}>{t('analysis.subtitle')}</Text>
        </View>
      </View>

      {loading || !analysis ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <ListSkeleton count={4} height={90} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Devamsızlık uyarısı / durum */}
          {analysis.daysSince === null ? (
            <View style={[styles.banner, { borderColor: colors.line, backgroundColor: colors.surface }]}>
              <Ionicons name="moon-outline" size={18} color={colors.textDim} />
              <Text style={styles.bannerTextDim}>{t('analysis.neverActive')}</Text>
            </View>
          ) : analysis.daysSince === 0 ? (
            <View style={[styles.banner, { borderColor: colors.success, backgroundColor: colors.successBg }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={[styles.bannerText, { color: colors.success }]}>{t('analysis.activeToday')}</Text>
            </View>
          ) : (
            <View
              style={[
                styles.banner,
                analysis.daysSince >= 7
                  ? { borderColor: colors.danger, backgroundColor: colors.dangerBg }
                  : { borderColor: colors.warning, backgroundColor: colors.warningBg },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color={analysis.daysSince >= 7 ? colors.danger : colors.warning}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.bannerText,
                    { color: analysis.daysSince >= 7 ? colors.danger : colors.warning },
                  ]}
                >
                  {t('analysis.absentWarn', { n: analysis.daysSince })}
                </Text>
                {analysis.lastActive && (
                  <Text style={styles.bannerTextDim}>
                    {t('analysis.lastActive', { date: fmtDate(analysis.lastActive) })}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Sayılar */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text
                style={[
                  styles.statValue,
                  analysis.streak === 0 && { color: colors.danger },
                ]}
              >
                {analysis.streak}
              </Text>
              <Text style={styles.statLabel}>{t('analysis.currentStreak')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analysis.longest}</Text>
              <Text style={styles.statLabel}>{t('analysis.longestStreak')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analysis.monthCount}</Text>
              <Text style={styles.statLabel}>{t('analysis.monthCount')}</Text>
            </View>
          </View>

          {/* Isı haritası */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('analysis.last5w')}</Text>
            <ActivityHeatmap activeDays={analysis.days} />
          </View>

          {/* Görev durumu */}
          {taskRows.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('analysis.taskStatus')}</Text>
              <View style={{ gap: spacing.sm }}>
                {taskRows.map((row, i) => {
                  const c = STATUS_COLORS[row.status];
                  return (
                    <View key={i} style={styles.taskLine}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {row.title}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
                        <Text style={[styles.statusText, { color: c.color }]}>{c.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Aksiyonlar */}
          <View style={styles.actions}>
            <OutlineButton
              label={t('analysis.remind')}
              onPress={() => toast(t('analysis.remindSoon'), 'info')}
              style={{ flex: 1 }}
            />
            <OutlineButton
              label={t('analysis.assignTask')}
              onPress={() => router.push({ pathname: '/kaptan', params: { teamId } })}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  subtitle: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bannerText: { fontSize: fontSize.sm, fontWeight: '600' },
  bannerTextDim: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 1 },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: colors.text, fontSize: fontSize.xl, fontFamily: font.displayBold, ...tabularNums },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardLabel: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  taskLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  taskTitle: { color: colors.text, fontSize: fontSize.sm, flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
}));
