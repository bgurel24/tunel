// Antrenman çağrısı kartı — "yarım saate ana gymdeyim, gelen gelsin".
// Feed'in en üstünde durur; takım arkadaşları geliyorum/yokum işaretler.

import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { avatarGradient } from '@/lib/avatar';
import { deleteSession, setRsvp, type GymSession, type RsvpStatus } from '@/lib/sessions';
import { clockLabel, timeUntil } from '@/lib/time';
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
  useThemeTick,
} from '@/theme';

export function SessionCard({
  session,
  onChanged,
}: {
  session: GymSession;
  onChanged: () => void;
}) {
  useThemeTick();
  const t = useT();
  const { toast, confirm } = useToast();
  const [myStatus, setMyStatus] = useState<RsvpStatus | null>(session.myStatus);

  useEffect(() => setMyStatus(session.myStatus), [session.myStatus]);

  // Geri sayım yazısı kendiliğinden tazelensin — kart canlı dursun.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const respond = async (status: RsvpStatus) => {
    const next = myStatus === status ? null : status;
    setMyStatus(next);
    Haptics.impactAsync(
      next === 'in' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    const { error } = await setRsvp(session.id, next);
    if (error) {
      setMyStatus(session.myStatus);
      toast(error, 'error');
      return;
    }
    onChanged();
  };

  const cancelCall = async () => {
    const ok = await confirm({
      title: t('session.cancelTitle'),
      message: t('session.cancelMessage'),
      confirmLabel: t('session.cancelConfirm'),
      destructive: true,
      icon: 'megaphone-outline',
    });
    if (!ok) return;
    const { error } = await deleteSession(session.id);
    if (error) return toast(error, 'error');
    toast(t('session.cancelled'), 'info');
    onChanged();
  };

  const goingCount = session.going.length;

  return (
    <LinearGradient
      colors={[colors.brandFrom, colors.brandTo]}
      start={gradientStart}
      end={gradientEnd}
      style={[styles.ring, shadow.card]}
    >
      <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.bolt}>
          <Ionicons name="flash" size={16} color={colors.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.host}>
            {session.isMine
              ? t('session.youCalled')
              : t('session.hostCalling', { name: session.hostName })}
          </Text>
          <Text style={styles.team} numberOfLines={1}>
            {session.teamName}
            {session.gym ? ` · ${session.gym}` : ''}
          </Text>
        </View>

        {session.isMine && (
          <Touchable onPress={cancelCall} hitSlop={10} haptic={false} scaleTo={0.9}>
            <Ionicons name="close" size={20} color={colors.textFaint} />
          </Touchable>
        )}
      </View>

      <Text style={styles.when}>{timeUntil(session.startsAt)}</Text>
      <Text style={styles.clock}>{clockLabel(session.startsAt)}</Text>

      {session.note ? <Text style={styles.note}>“{session.note}”</Text> : null}

      <View style={styles.people}>
        {goingCount > 0 ? (
          <>
            <View style={styles.avatars}>
              {session.going.slice(0, 4).map((p, i) => (
                <LinearGradient
                  key={p.userId}
                  colors={avatarGradient(p.username)}
                  start={gradientStart}
                  end={gradientEnd}
                  style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -10 }]}
                >
                  <Text style={styles.miniAvatarText}>{p.username.slice(0, 1).toUpperCase()}</Text>
                </LinearGradient>
              ))}
            </View>
            <Text style={styles.peopleText}>
              {goingCount === 1
                ? t('session.oneGoing', { name: session.going[0].username })
                : t('session.manyGoing', { n: goingCount })}
            </Text>
          </>
        ) : (
          <Text style={styles.peopleText}>{t('session.nobody')}</Text>
        )}
      </View>

      {!session.isMine && (
        <View style={styles.actions}>
          <Touchable style={styles.btnWrap} onPress={() => respond('in')} haptic={false} scaleTo={0.95}>
            {myStatus !== 'in' ? (
              <View style={styles.btn}>
                <Ionicons name="checkmark-circle-outline" size={17} color={colors.textDim} />
                <Text style={styles.btnText}>{t('session.in')}</Text>
              </View>
            ) : (
              <LinearGradient
                colors={[colors.brandFrom, colors.brandTo]}
                start={gradientStart}
                end={gradientEnd}
                style={styles.btn}
              >
                <Ionicons name="checkmark-circle" size={17} color={colors.onBrand} />
                <Text style={[styles.btnText, styles.btnTextOn]}>{t('session.in')}</Text>
              </LinearGradient>
            )}
          </Touchable>

          <Touchable style={styles.btnWrap} onPress={() => respond('out')} haptic={false} scaleTo={0.95}>
            <View style={[styles.btn, myStatus === 'out' && styles.btnOut]}>
              <Ionicons
                name={myStatus === 'out' ? 'close-circle' : 'close-circle-outline'}
                size={17}
                color={myStatus === 'out' ? colors.danger : colors.textDim}
              />
              <Text style={[styles.btnText, myStatus === 'out' && { color: colors.danger }]}>
                {t('session.out')}
              </Text>
            </View>
          </Touchable>
        </View>
      )}
      </View>
    </LinearGradient>
  );
}

const styles = makeStyles((colors) => ({
  // Marka gradyanı kartın çevresinde 1px'lik bir halka olarak duruyor:
  // çağrı feed'in en önemli şeyi, diğer kartlardan ayrışsın.
  ring: {
    borderRadius: radius.lg + 1,
    padding: 1,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bolt: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  host: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  team: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 1 },
  when: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: font.displayBold,
    marginTop: spacing.md,
  },
  clock: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600', marginTop: 2 },
  note: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  people: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  avatars: { flexDirection: 'row' },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  miniAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  peopleText: { color: colors.textDim, fontSize: fontSize.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  btnWrap: { flex: 1 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnOut: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  btnText: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: '600' },
  btnTextOn: { color: colors.onBrand, fontWeight: '700' },
}));
