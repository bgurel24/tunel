// Antrenman çağrısı kartı — "yarım saate ana gymdeyim, gelen gelsin".
// Feed'in en üstünde durur; takım arkadaşları geliyorum/yokum işaretler.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { avatarGradient } from '@/lib/avatar';
import { deleteSession, setRsvp, type GymSession, type RsvpStatus } from '@/lib/sessions';
import { clockLabel, timeUntil } from '@/lib/time';
import {
  colors,
  font,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  radius,
  shadow,
  spacing,
} from '@/theme';

export function SessionCard({
  session,
  onChanged,
}: {
  session: GymSession;
  onChanged: () => void;
}) {
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
      title: 'Çağrıyı geri çek',
      message: 'Takımdan bu antrenmana çağrın kalkacak.',
      confirmLabel: 'Geri çek',
      destructive: true,
      icon: 'megaphone-outline',
    });
    if (!ok) return;
    const { error } = await deleteSession(session.id);
    if (error) return toast(error, 'error');
    toast('Çağrı geri çekildi', 'info');
    onChanged();
  };

  const goingCount = session.going.length;

  return (
    <LinearGradient
      colors={[colors.brandBg, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadow.card]}
    >
      <View style={styles.head}>
        <LinearGradient
          colors={gradientColors}
          start={gradientStart}
          end={gradientEnd}
          style={[styles.bolt, shadow.glowSoft]}
        >
          <Ionicons name="flash" size={16} color="#fff" />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={styles.host}>
            {session.isMine ? 'Sen çağırdın' : `${session.hostName} çağırıyor`}
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
              {goingCount === 1 ? `${session.going[0].username} geliyor` : `${goingCount} kişi geliyor`}
            </Text>
          </>
        ) : (
          <Text style={styles.peopleText}>Henüz kimse söz vermedi</Text>
        )}
      </View>

      {!session.isMine && (
        <View style={styles.actions}>
          <Touchable
            style={[styles.btn, myStatus === 'in' && styles.btnIn]}
            onPress={() => respond('in')}
            haptic={false}
            scaleTo={0.95}
          >
            <Ionicons
              name={myStatus === 'in' ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={17}
              color={myStatus === 'in' ? colors.success : colors.textDim}
            />
            <Text style={[styles.btnText, myStatus === 'in' && { color: colors.success }]}>
              Geliyorum
            </Text>
          </Touchable>

          <Touchable
            style={[styles.btn, myStatus === 'out' && styles.btnOut]}
            onPress={() => respond('out')}
            haptic={false}
            scaleTo={0.95}
          >
            <Ionicons
              name={myStatus === 'out' ? 'close-circle' : 'close-circle-outline'}
              size={17}
              color={myStatus === 'out' ? colors.danger : colors.textDim}
            />
            <Text style={[styles.btnText, myStatus === 'out' && { color: colors.danger }]}>
              Yokum
            </Text>
          </Touchable>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brandBg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bolt: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
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
  btnIn: { backgroundColor: colors.successBg, borderColor: colors.success },
  btnOut: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  btnText: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: '600' },
});
