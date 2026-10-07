// Ana sayfadaki "Sonraki idman" kartı — uygulamayı açan sporcu 2-3 saniyede
// cevabını verebilsin diye katılım butonları doğrudan kartın üstünde.
// Koç kendi açtığı idmanda butonlar yerine katılım özetini görür.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AttendanceButtons } from '@/components/AttendanceButtons';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import {
  eventDayLabel,
  eventTimeRange,
  isPastDeadline,
  shortDateTime,
  type AttendanceStatus,
  type TeamEvent,
} from '@/lib/events';
import { useT } from '@/lib/i18n';
import { timeUntil } from '@/lib/time';
import {
  colors,
  font,
  fontSize,
  gradientEnd,
  gradientStart,
  makeStyles,
  radius,
  shadow,
  spacing,
  tabularNums,
  useThemeTick,
} from '@/theme';

export function NextEventCard({ event }: { event: TeamEvent }) {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const [mine, setMine] = useState<AttendanceStatus | null>(event.myStatus);

  const open = () => router.push({ pathname: '/idman', params: { id: event.id } });
  const late = isPastDeadline(event);

  return (
    <LinearGradient
      colors={[colors.brandFrom, colors.brandTo]}
      start={gradientStart}
      end={gradientEnd}
      style={[styles.ring, shadow.card]}
    >
      <View style={styles.card}>
        <Touchable onPress={open} scaleTo={0.99} haptic={false}>
          <View style={styles.kickerRow}>
            <View style={styles.icon}>
              <Ionicons name="american-football" size={15} color={colors.accent} />
            </View>
            <Text style={styles.kicker}>{t(event.kind === 'match' ? 'events.nextMatch' : 'events.next')}</Text>
            <Text style={styles.until}>{timeUntil(event.startsAt)}</Text>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.day}>{eventDayLabel(event.startsAt)}</Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textDim} />
              <Text style={[styles.metaText, tabularNums]}>{eventTimeRange(event)}</Text>
            </View>
            {event.location ? (
              <View style={[styles.metaItem, { flexShrink: 1 }]}>
                <Ionicons name="location-outline" size={14} color={colors.textDim} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            ) : null}
          </View>

          {event.rsvpDeadline ? (
            <Text style={[styles.deadline, late && { color: colors.warning }]}>
              {t(late ? 'events.deadlinePassed' : 'events.deadlineAt', {
                time: shortDateTime(event.rsvpDeadline),
              })}
            </Text>
          ) : null}
        </Touchable>

        {event.amCoach ? (
          <Touchable style={styles.coachRow} onPress={open} scaleTo={0.98}>
            <Count n={event.counts.going} color={colors.success} label={t('events.going')} />
            <Count n={event.counts.maybe} color={colors.warning} label={t('events.maybe')} />
            <Count n={event.counts.not_going} color={colors.danger} label={t('events.notGoing')} />
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Touchable>
        ) : (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text style={styles.ask}>
              {mine ? t('events.yourAnswer') : t('events.askAnswer')}
            </Text>
            <AttendanceButtons eventId={event.id} value={mine} onChange={setMine} />
          </View>
        )}

        <Touchable style={styles.all} onPress={() => router.push('/idmanlar')} scaleTo={0.97} haptic={false}>
          <Text style={styles.allText}>{t('events.seeAll')}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </Touchable>
      </View>
    </LinearGradient>
  );
}

function Count({ n, color, label }: { n: number; color: string; label: string }) {
  return (
    <View style={styles.count}>
      <Text style={[styles.countN, tabularNums, { color }]}>{n}</Text>
      <Text style={styles.countLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  ring: { borderRadius: radius.lg + 1, padding: 1, marginBottom: spacing.md },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    flex: 1,
    color: colors.accent,
    fontSize: fontSize.xs,
    fontFamily: font.bodySemi,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  until: { color: colors.textFaint, fontSize: fontSize.xs },
  title: { color: colors.text, fontSize: fontSize.xl, fontFamily: font.displayBold, marginTop: spacing.md },
  day: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textDim, fontSize: fontSize.sm },
  deadline: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.sm },
  ask: { color: colors.textDim, fontSize: fontSize.xs },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  count: { flex: 1, alignItems: 'center' },
  countN: { fontSize: fontSize.xl, fontFamily: font.displayBold },
  countLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  allText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
}));
