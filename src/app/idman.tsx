// İdman / etkinlik detayı.
//   Sporcu: bilgiler + tek dokunuşla katılım.
//   Koç: katılım özeti, isim isim liste (geç bildirenler işaretli), düzenle/sil.
// Liste canlı: biri cevap verince ekran kendiliğinden tazelenir.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AttendanceButtons, STATUS_META } from '@/components/AttendanceButtons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import {
  deleteEvent,
  eventDayLabel,
  eventTimeRange,
  getEventDetail,
  isOver,
  isPastDeadline,
  shortDateTime,
  subscribeAttendance,
  type AttendancePerson,
  type AttendanceStatus,
  type EventDetail,
} from '@/lib/events';
import { useAuth } from '@/lib/auth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { colors, font, fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

const GROUPS: { key: AttendanceStatus | 'none'; title: TranslationKey }[] = [
  { key: 'going', title: 'events.groupGoing' },
  { key: 'maybe', title: 'events.groupMaybe' },
  { key: 'not_going', title: 'events.groupNotGoing' },
  { key: 'none', title: 'events.groupNone' },
];

export default function IdmanScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { session } = useAuth();
  const { toast, confirm, menu } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!id) return setEvent(null);
    setEvent(await getEventDetail(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!id) return;
    return subscribeAttendance(id, load);
  }, [id, load]);

  const myId = session?.user?.id;
  const amAthlete = !!event && !event.amCoach && event.people.some((p) => p.userId === myId);

  // Kendi cevabım değişince listeyi de yerinde güncelle — sunucuyu beklemeden.
  const onMine = (next: AttendanceStatus | null) => {
    setEvent((cur) => {
      if (!cur || !myId) return cur;
      const people = cur.people.map((p) =>
        p.userId === myId ? { ...p, status: next, late: next ? isPastDeadline(cur) : false } : p
      );
      return { ...cur, myStatus: next, people };
    });
  };

  const openMenu = async () => {
    if (!event) return;
    const choice = await menu({
      title: event.title,
      options: [
        { key: 'edit', label: t('events.edit'), icon: 'create-outline' },
        { key: 'delete', label: t('events.delete'), icon: 'trash-outline', destructive: true },
      ],
    });
    if (choice === 'edit') router.push({ pathname: '/idman-duzenle', params: { id: event.id } });
    if (choice === 'delete') {
      const ok = await confirm({
        title: t('events.deleteTitle'),
        message: t('events.deleteMessage'),
        confirmLabel: t('events.delete'),
        destructive: true,
        icon: 'trash-outline',
      });
      if (!ok) return;
      const { error } = await deleteEvent(event.id);
      if (error) return toast(error, 'error');
      toast(t('events.deleted'), 'info');
      router.back();
    }
  };

  const grouped = (key: AttendanceStatus | 'none'): AttendancePerson[] =>
    event ? event.people.filter((p) => (key === 'none' ? p.status === null : p.status === key)) : [];

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.iconBtn} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.headerTitle}>{t(event?.kind === 'match' ? 'events.match' : 'events.training')}</Text>
        {event?.amCoach ? (
          <Touchable style={styles.iconBtn} onPress={openMenu} scaleTo={0.9} accessibilityLabel={t('events.edit')}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </Touchable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {event === undefined ? (
        <View style={styles.pad}>
          <ListSkeleton count={4} height={70} />
        </View>
      ) : event === null ? (
        <View style={styles.pad}>
          <EmptyState icon="american-football-outline" title={t('events.notFound')} body={t('events.notFoundBody')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.team}>{event.teamName}</Text>
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.facts}>
            <Fact icon="calendar-outline" text={eventDayLabel(event.startsAt)} capitalize />
            <Fact icon="time-outline" text={eventTimeRange(event)} />
            {event.location ? <Fact icon="location-outline" text={event.location} /> : null}
            {event.rsvpDeadline ? (
              <Fact
                icon="alarm-outline"
                text={t(isPastDeadline(event) ? 'events.deadlinePassed' : 'events.deadlineAt', {
                  time: shortDateTime(event.rsvpDeadline),
                })}
                tone={isPastDeadline(event) ? colors.warning : undefined}
              />
            ) : null}
          </View>

          {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}

          {amAthlete && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('events.yourAnswer')}</Text>
              {isOver(event) ? (
                <Text style={styles.muted}>{t('events.over')}</Text>
              ) : (
                <>
                  <AttendanceButtons eventId={event.id} value={event.myStatus} onChange={onMine} />
                  {isPastDeadline(event) && <Text style={styles.lateNote}>{t('events.lateNote')}</Text>}
                </>
              )}
            </View>
          )}

          <View style={styles.summary}>
            <Tile n={grouped('going').length} label={t('events.going')} color={colors.success} />
            <Tile n={grouped('maybe').length} label={t('events.maybe')} color={colors.warning} />
            <Tile n={grouped('not_going').length} label={t('events.notGoing')} color={colors.danger} />
            <Tile n={grouped('none').length} label={t('events.noAnswer')} color={colors.textDim} />
          </View>

          {GROUPS.map((g) => {
            const list = grouped(g.key);
            if (list.length === 0) return null;
            const meta = g.key === 'none' ? null : STATUS_META[g.key];
            return (
              <View key={g.key} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: meta?.color ?? colors.textDim }]}>
                  {t(g.title)} · {list.length}
                </Text>
                {list.map((p) => (
                  <View key={p.userId} style={styles.person}>
                    <Avatar username={p.username} url={p.avatarUrl} size={32} />
                    <Text style={styles.personName} numberOfLines={1}>
                      {p.name}
                      {p.userId === myId ? ` · ${t('members.you')}` : ''}
                    </Text>
                    {p.late && (
                      <View style={styles.lateBadge}>
                        <Text style={styles.lateText}>{t('events.late')}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

function Fact({
  icon,
  text,
  tone,
  capitalize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone?: string;
  capitalize?: boolean;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={tone ?? colors.accent} />
      <Text
        style={[styles.factText, tabularNums, tone ? { color: tone } : null, capitalize && { textTransform: 'capitalize' }]}
      >
        {text}
      </Text>
    </View>
  );
}

function Tile({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileN, tabularNums, { color }]}>{n}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
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
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  pad: { paddingHorizontal: spacing.xl, gap: spacing.md },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  team: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontFamily: font.bodySemi,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontFamily: font.displayBold, marginTop: 4 },
  facts: { gap: spacing.sm, marginTop: spacing.lg },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  factText: { color: colors.text, fontSize: fontSize.md, flexShrink: 1 },
  desc: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.lg },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  sectionTitle: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontFamily: font.bodySemi,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  muted: { color: colors.textFaint, fontSize: fontSize.sm },
  lateNote: { color: colors.warning, fontSize: fontSize.xs },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.md,
  },
  tileN: { fontSize: fontSize.xl, fontFamily: font.displayBold },
  tileLabel: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
  },
  personName: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  lateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
  },
  lateText: { color: colors.warning, fontSize: 10, fontWeight: '700' },
}));
