// İdmanlar — üyesi olduğum takımların yaklaşan / geçmiş idman ve etkinlikleri.
// Koç burada yeni idman açar ve katılım istatistiklerine geçer.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { STATUS_META } from '@/components/AttendanceButtons';
import {
  eventTimeRange,
  getCoachTeamIds,
  getEvents,
  type TeamEvent,
} from '@/lib/events';
import { getPrefs } from '@/lib/prefs';
import { useT } from '@/lib/i18n';
import { colors, font, fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

type Scope = 'upcoming' | 'past';


export default function IdmanlarScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('upcoming');
  const [events, setEvents] = useState<TeamEvent[] | null>(null);
  const [coachTeams, setCoachTeams] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [list, coach] = await Promise.all([getEvents(scope), getCoachTeamIds()]);
    setEvents(list);
    setCoachTeams(coach);
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isCoach = coachTeams.length > 0;

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.iconBtn} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>{t('events.title')}</Text>
        {isCoach ? (
          <Touchable
            style={styles.iconBtn}
            onPress={() => router.push({ pathname: '/idman-duzenle', params: { teamId: coachTeams[0] } })}
            scaleTo={0.9}
            accessibilityLabel={t('events.create')}
          >
            <Ionicons name="add" size={26} color={colors.accent} />
          </Touchable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <View style={styles.top}>
        <Segmented
          options={[
            { key: 'upcoming' as const, label: t('events.upcoming') },
            { key: 'past' as const, label: t('events.past') },
          ]}
          value={scope}
          onChange={(s) => {
            setScope(s);
            setEvents(null);
          }}
        />
        {isCoach && (
          <Touchable
            style={styles.statsRow}
            onPress={() => router.push({ pathname: '/katilim-istatistik', params: { teamId: coachTeams[0] } })}
            scaleTo={0.98}
          >
            <Ionicons name="stats-chart" size={16} color={colors.accent} />
            <Text style={styles.statsText}>{t('events.stats')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Touchable>
        )}
      </View>

      {!events ? (
        <View style={styles.loading}>
          <ListSkeleton count={4} height={76} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => <EventRow event={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="american-football-outline"
              title={t(scope === 'upcoming' ? 'events.emptyUpcoming' : 'events.emptyPast')}
              body={t(isCoach ? 'events.emptyCoach' : 'events.emptyAthlete')}
              actionLabel={isCoach && scope === 'upcoming' ? t('events.create') : undefined}
              onAction={
                isCoach && scope === 'upcoming'
                  ? () => router.push({ pathname: '/idman-duzenle', params: { teamId: coachTeams[0] } })
                  : undefined
              }
            />
          }
        />
      )}
    </Screen>
  );
}

function EventRow({ event }: { event: TeamEvent }) {
  const t = useT();
  const router = useRouter();
  const d = new Date(event.startsAt);
  const locale = getPrefs().lang === 'tr' ? 'tr-TR' : 'en-US';
  const meta = event.myStatus ? STATUS_META[event.myStatus] : null;

  return (
    <Touchable
      style={styles.row}
      onPress={() => router.push({ pathname: '/idman', params: { id: event.id } })}
      scaleTo={0.98}
    >
      <View style={styles.dateBlock}>
        <Text style={styles.dateWeekday}>{d.toLocaleDateString(locale, { weekday: 'short' })}</Text>
        <Text style={[styles.dateDay, tabularNums]}>{d.getDate()}</Text>
        <Text style={styles.dateMonth}>{d.toLocaleDateString(locale, { month: 'short' })}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.rowSub, tabularNums]} numberOfLines={1}>
          {eventTimeRange(event)}
          {event.location ? ` · ${event.location}` : ''}
        </Text>

        {event.amCoach ? (
          <Text style={[styles.rowCounts, tabularNums]}>
            <Text style={{ color: colors.success }}>{event.counts.going}</Text>
            {` ${t('events.going')}  ·  `}
            <Text style={{ color: colors.warning }}>{event.counts.maybe}</Text>
            {` ${t('events.maybe')}  ·  `}
            <Text style={{ color: colors.danger }}>{event.counts.not_going}</Text>
            {` ${t('events.notGoing')}`}
          </Text>
        ) : meta ? (
          <View style={[styles.chip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.chipText, { color: meta.color }]}>{t(meta.label)}</Text>
          </View>
        ) : (
          <View style={[styles.chip, styles.chipPending]}>
            <Text style={[styles.chipText, { color: colors.accent }]}>{t('events.noAnswer')}</Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Touchable>
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.md,
  },
  statsText: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  loading: { paddingHorizontal: spacing.xl, gap: spacing.md },
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
  dateBlock: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  dateWeekday: { color: colors.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateDay: { color: colors.text, fontSize: fontSize.xl, fontFamily: font.displayBold, lineHeight: 26 },
  dateMonth: { color: colors.accent, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  rowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: fontSize.xs },
  rowCounts: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  chipPending: { backgroundColor: colors.accentBg },
  chipText: { fontSize: fontSize.xs, fontWeight: '600' },
}));
