// Koç: sporcu bazında katılım istatistikleri (geçmiş etkinlikler üzerinden).
// "Katıldı" şimdilik "Katılacağım" cevabı demek; ileride sahada yoklama
// alınırsa aynı ekran o veriyle beslenebilir.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { getAttendanceStats, type AttendanceStat, type EventKind } from '@/lib/events';
import { useT } from '@/lib/i18n';
import { colors, font, fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

type KindFilter = EventKind | 'all';

function rateColor(rate: number | null) {
  if (rate === null) return colors.textFaint;
  if (rate >= 80) return colors.success;
  if (rate >= 50) return colors.warning;
  return colors.danger;
}

export default function KatilimIstatistikScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const [kind, setKind] = useState<KindFilter>('training');
  const [rows, setRows] = useState<AttendanceStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    const res = await getAttendanceStats(teamId, kind === 'all' ? null : kind);
    setRows(res.rows);
    setError(res.error);
  }, [teamId, kind]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const withData = (rows ?? []).filter((r) => r.rate !== null);
  const teamRate = withData.length
    ? Math.round(withData.reduce((sum, r) => sum + (r.rate ?? 0), 0) / withData.length)
    : null;
  const eventCount = Math.max(0, ...(rows ?? []).map((r) => r.total));

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.iconBtn} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>{t('events.stats')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.top}>
        <Segmented
          options={[
            { key: 'training' as const, label: t('events.training') },
            { key: 'match' as const, label: t('events.match') },
            { key: 'all' as const, label: t('events.all') },
          ]}
          value={kind}
          onChange={setKind}
        />
        {rows && rows.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.sumItem}>
              <Text style={[styles.sumN, tabularNums, { color: rateColor(teamRate) }]}>
                {teamRate === null ? '–' : `%${teamRate}`}
              </Text>
              <Text style={styles.sumLabel}>{t('events.teamRate')}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumItem}>
              <Text style={[styles.sumN, tabularNums]}>{eventCount}</Text>
              <Text style={styles.sumLabel}>{t('events.pastCount')}</Text>
            </View>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.pad}>
          <EmptyState icon="lock-closed-outline" title={t('events.coachOnly')} body={error} />
        </View>
      ) : !rows ? (
        <View style={styles.pad}>
          <ListSkeleton count={5} height={72} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar username={item.username} url={item.avatarUrl} size={38} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.rowHead}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.rate, tabularNums, { color: rateColor(item.rate) }]}>
                    {item.rate === null ? '–' : `%${item.rate}`}
                  </Text>
                </View>
                <View style={styles.bar}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${item.rate ?? 0}%`, backgroundColor: rateColor(item.rate) },
                    ]}
                  />
                </View>
                <Text style={[styles.detail, tabularNums]}>
                  {t('events.statLine', {
                    going: item.going,
                    total: item.total,
                    out: item.notGoing,
                    maybe: item.maybe,
                    none: item.noResponse,
                  })}
                  {item.late > 0 ? ` · ${t('events.statLate', { n: item.late })}` : ''}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="stats-chart-outline" title={t('events.statsEmpty')} body={t('events.statsEmptyBody')} />
          }
        />
      )}
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
    paddingBottom: spacing.sm,
  },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  top: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.md,
  },
  sumItem: { flex: 1, alignItems: 'center' },
  sumDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.line },
  sumN: { color: colors.text, fontSize: fontSize.xxl, fontFamily: font.displayBold },
  sumLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  pad: { paddingHorizontal: spacing.xl, gap: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.md,
  },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  rate: { fontSize: fontSize.lg, fontFamily: font.displayBold },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  detail: { color: colors.textFaint, fontSize: fontSize.xs },
}));
