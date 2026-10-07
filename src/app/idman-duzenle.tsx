// Koç: idman / etkinlik oluştur ya da düzenle.
// Tarih ve saat, klavyesiz seçilsin diye kaydırmalı çiplerle seçiliyor.
// Parametreler: ?id=… (düzenle) ya da ?teamId=… (yeni).

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import {
  createEvent,
  eventDayLabel,
  getCoachTeamIds,
  getEventDetail,
  shortDateTime,
  updateEvent,
  type EventKind,
} from '@/lib/events';
import { useT } from '@/lib/i18n';
import { getPrefs } from '@/lib/prefs';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { colors, font, fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

const DAYS_AHEAD = 28;
/** 06:00 – 23:30, yarım saatte bir. */
const BASE_TIMES = Array.from({ length: 36 }, (_, i) => 6 * 60 + i * 30);
const DURATIONS = [60, 90, 120, 150, 180];
/** Son bildirim: başlangıçtan kaç dakika önce. 0 = yok. */
const DEADLINES = [0, 60, 180, 360, 1440];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function hhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export default function IdmanDuzenleScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { toast, celebrate } = useToast();
  const params = useLocalSearchParams<{ id?: string; teamId?: string }>();
  const editingId = params.id ?? null;
  const locale = getPrefs().lang === 'tr' ? 'tr-TR' : 'en-US';

  const [ready, setReady] = useState(false);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [teamId, setTeamId] = useState<string | null>(params.teamId ?? null);
  const [kind, setKind] = useState<EventKind>('training');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [day, setDay] = useState<Date>(() => startOfDay(new Date(Date.now() + 86400000)));
  const [startMin, setStartMin] = useState(20 * 60);
  const [duration, setDuration] = useState<number>(120);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineBefore, setDeadlineBefore] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [mine, coachIds] = await Promise.all([getMyTeams(), getCoachTeamIds()]);
      const coachTeams = mine.filter((x) => coachIds.includes(x.id));
      setTeams(coachTeams);

      if (editingId) {
        const e = await getEventDetail(editingId);
        if (e) {
          const s = new Date(e.startsAt);
          setTeamId(e.teamId);
          setKind(e.kind);
          setTitle(e.title);
          setTitleTouched(true);
          setDay(startOfDay(s));
          setStartMin(s.getHours() * 60 + s.getMinutes());
          setDuration(e.endsAt ? Math.round((new Date(e.endsAt).getTime() - s.getTime()) / 60000) : 0);
          setLocation(e.location ?? '');
          setDescription(e.description ?? '');
          setDeadlineBefore(
            e.rsvpDeadline ? Math.round((s.getTime() - new Date(e.rsvpDeadline).getTime()) / 60000) : 0
          );
        }
      } else {
        setTeamId((cur) => (cur && coachIds.includes(cur) ? cur : coachTeams[0]?.id ?? null));
      }
      setReady(true);
    })();
  }, [editingId]);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    const list = Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(today.getTime() + i * 86400000));
    if (!list.some((d) => d.getTime() === day.getTime())) list.unshift(day);
    return list;
  }, [day]);

  const times = useMemo(
    () => (BASE_TIMES.includes(startMin) ? BASE_TIMES : [...BASE_TIMES, startMin].sort((a, b) => a - b)),
    [startMin]
  );
  const durations = useMemo(
    () => (duration === 0 || DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b)),
    [duration]
  );
  const deadlines = useMemo(
    () => (DEADLINES.includes(deadlineBefore) ? DEADLINES : [...DEADLINES, deadlineBefore].sort((a, b) => a - b)),
    [deadlineBefore]
  );

  const startsAt = new Date(day.getTime() + startMin * 60000);
  const endsAt = duration > 0 ? new Date(startsAt.getTime() + duration * 60000) : null;
  const rsvpDeadline = deadlineBefore > 0 ? new Date(startsAt.getTime() - deadlineBefore * 60000) : null;

  // Başlığa dokunulmadıysa güne göre öner: "Salı İdmanı".
  const weekday = startsAt.toLocaleDateString(locale, { weekday: 'long' });
  const suggested = t(kind === 'match' ? 'events.suggestMatch' : kind === 'event' ? 'events.suggestEvent' : 'events.suggestTraining', {
    day: weekday.charAt(0).toLocaleUpperCase(locale) + weekday.slice(1),
  });
  const effectiveTitle = titleTouched ? title : suggested;

  const durationLabel = (m: number) =>
    m === 0 ? t('events.noEnd') : m % 60 === 0 ? t('events.hours', { n: m / 60 }) : t('events.hoursHalf', { n: Math.floor(m / 60) });
  const deadlineLabel = (m: number) =>
    m === 0
      ? t('events.noDeadline')
      : m % 1440 === 0
        ? t('events.daysBefore', { n: m / 1440 })
        : m % 60 === 0
          ? t('events.hoursBefore', { n: m / 60 })
          : t('events.minutesBefore', { n: m });

  const save = async () => {
    if (!teamId) return;
    if (!effectiveTitle.trim()) return toast(t('events.titleRequired'), 'error');
    if (!editingId && startsAt.getTime() < Date.now()) return toast(t('events.inPast'), 'error');
    setSaving(true);
    const input = {
      teamId,
      kind,
      title: effectiveTitle,
      startsAt,
      endsAt,
      location,
      description,
      rsvpDeadline,
    };
    if (editingId) {
      const { error } = await updateEvent(editingId, input);
      setSaving(false);
      if (error) return toast(error, 'error');
      toast(t('events.saved'));
      router.back();
    } else {
      const { id, error } = await createEvent(input);
      setSaving(false);
      if (error || !id) return toast(error ?? '', 'error');
      celebrate(t('events.created'));
      router.replace({ pathname: '/idman', params: { id } });
    }
  };

  const header = (
    <View style={styles.header}>
      <Touchable onPress={() => router.back()} hitSlop={12} haptic={false} scaleTo={0.9}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Touchable>
      <Text style={styles.title}>{t(editingId ? 'events.editTitle' : 'events.createTitle')}</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (!ready) {
    return (
      <Screen padded={false}>
        {header}
        <View style={{ paddingHorizontal: spacing.xl }}>
          <ListSkeleton count={5} height={52} />
        </View>
      </Screen>
    );
  }

  if (teams.length === 0 || !teamId) {
    return (
      <Screen padded={false}>
        {header}
        <View style={{ paddingHorizontal: spacing.xl }}>
          <EmptyState icon="lock-closed-outline" title={t('events.coachOnly')} body={t('events.coachOnlyBody')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {teams.length > 1 && !editingId && (
          <>
            <Text style={styles.label}>{t('call.whichTeam')}</Text>
            <View style={styles.chipWrap}>
              {teams.map((tm) => (
                <Chip key={tm.id} label={tm.name} on={teamId === tm.id} onPress={() => setTeamId(tm.id)} />
              ))}
            </View>
          </>
        )}

        <Segmented
          options={[
            { key: 'training' as const, label: t('events.training') },
            { key: 'match' as const, label: t('events.match') },
            { key: 'event' as const, label: t('events.other') },
          ]}
          value={kind}
          onChange={setKind}
        />

        <View style={{ height: spacing.lg }} />
        <Field
          label={t('events.titleLabel')}
          value={effectiveTitle}
          onChangeText={(v) => {
            setTitleTouched(true);
            setTitle(v);
          }}
          maxLength={80}
        />

        <Text style={[styles.label, styles.gapTop]}>{t('events.date')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {days.map((d) => {
            const on = d.getTime() === day.getTime();
            return (
              <Touchable key={d.getTime()} onPress={() => setDay(d)} scaleTo={0.94} style={[styles.dayChip, on && styles.chipOn]}>
                <Text style={[styles.dayWeek, on && styles.textOn]}>{d.toLocaleDateString(locale, { weekday: 'short' })}</Text>
                <Text style={[styles.dayNum, tabularNums, on && styles.textOn]}>{d.getDate()}</Text>
                <Text style={[styles.dayMonth, on && { color: colors.accent }]}>
                  {d.toLocaleDateString(locale, { month: 'short' })}
                </Text>
              </Touchable>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, styles.gapTop]}>{t('events.startTime')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {times.map((m) => (
            <Chip key={m} label={hhmm(m)} on={m === startMin} onPress={() => setStartMin(m)} mono />
          ))}
        </ScrollView>

        <Text style={[styles.label, styles.gapTop]}>{t('events.duration')}</Text>
        <View style={styles.chipWrap}>
          {durations.map((m) => (
            <Chip key={m} label={durationLabel(m)} on={m === duration} onPress={() => setDuration(m)} />
          ))}
          <Chip label={durationLabel(0)} on={duration === 0} onPress={() => setDuration(0)} />
        </View>

        <View style={styles.preview}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={[styles.previewText, tabularNums]}>
            <Text style={styles.previewStrong}>{eventDayLabel(startsAt.toISOString())}</Text>
            {'  '}
            {hhmm(startMin)}
            {endsAt ? ` – ${hhmm(endsAt.getHours() * 60 + endsAt.getMinutes())}` : ''}
          </Text>
        </View>

        <Field
          label={t('events.location')}
          value={location}
          onChangeText={setLocation}
          placeholder={t('events.locationPlaceholder')}
          maxLength={120}
        />
        <View style={{ height: spacing.md }} />
        <Field
          label={t('events.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('events.descriptionPlaceholder')}
          multiline
          maxLength={1000}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Text style={[styles.label, styles.gapTop]}>{t('events.deadline')}</Text>
        <View style={styles.chipWrap}>
          {deadlines.map((m) => (
            <Chip key={m} label={deadlineLabel(m)} on={m === deadlineBefore} onPress={() => setDeadlineBefore(m)} />
          ))}
        </View>
        {rsvpDeadline && (
          <Text style={styles.hint}>
            {t('events.deadlineHint', { time: shortDateTime(rsvpDeadline.toISOString()) })}
          </Text>
        )}

        <GradientButton
          label={t(editingId ? 'events.save' : 'events.createCta')}
          onPress={save}
          loading={saving}
          style={{ marginTop: spacing.xl }}
        />
        {!editingId && <Text style={styles.foot}>{t('events.createFoot')}</Text>}
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, on, onPress, mono }: { label: string; on: boolean; onPress: () => void; mono?: boolean }) {
  return (
    <Touchable onPress={onPress} scaleTo={0.94} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, mono && tabularNums, on && styles.textOn]}>{label}</Text>
    </Touchable>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  label: { color: colors.textDim, fontSize: fontSize.sm, marginBottom: spacing.sm },
  gapTop: { marginTop: spacing.lg },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hScroll: { gap: spacing.sm, paddingRight: spacing.xl },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipOn: { backgroundColor: colors.accentBg, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  textOn: { color: colors.text, fontWeight: '600' },
  dayChip: {
    width: 56,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayWeek: { color: colors.textDim, fontSize: 10, textTransform: 'uppercase' },
  dayNum: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.displayBold },
  dayMonth: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.lg,
  },
  previewText: { color: colors.textDim, fontSize: fontSize.sm, flexShrink: 1 },
  previewStrong: { color: colors.text, fontWeight: '600', textTransform: 'capitalize' },
  hint: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.sm },
  foot: { color: colors.textFaint, fontSize: fontSize.xs, lineHeight: 18, textAlign: 'center', marginTop: spacing.lg },
}));
