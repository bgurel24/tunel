// Profil — gradyan kapak, istatistik kartları, rozetler, aktivite ısı haritası,
// takımların (isim/rol/kod, kaptan silebilir) ve kısayollar.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { ListSkeleton, Skeleton } from '@/components/Skeleton';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { useAuth } from '@/lib/auth';
import { getMyProfile, pickAvatarImage, uploadAvatar } from '@/lib/profile';
import { getMyStats, type MyStats } from '@/lib/stats';
import { deleteTeam, getMyTeams, type MyTeam } from '@/lib/teams';
import {
  colors,
  font,
  fontSize,
  radius,
  shadow,
  spacing,
  tabularNums,
} from '@/theme';

const COVER_HEIGHT = 132;

export default function ProfilScreen() {
  const { session, signOut, configured } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarPadding();
  const { toast, confirm } = useToast();

  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const load = useCallback(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    Promise.all([getMyTeams(), getMyStats(), getMyProfile()]).then(([t, s, p]) => {
      setTeams(t);
      setStats(s);
      setAvatarUrl(p?.avatarUrl ?? null);
      setLoading(false);
    });
  }, [configured]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = async (team: MyTeam) => {
    const ok = await confirm({
      title: 'Takımı sil',
      message: `"${team.name}" tamamen gider: üyeler, görevler, puanlar. Geri dönüşü yok.`,
      confirmLabel: 'Takımı sil',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteTeam(team.id);
    if (error) toast(error, 'error');
    else {
      toast(`"${team.name}" silindi`, 'info');
      load();
    }
  };

  const changeAvatar = async () => {
    const uri = await pickAvatarImage();
    if (!uri) return;
    setUploadingAvatar(true);
    const { error, avatarUrl: url } = await uploadAvatar(uri);
    setUploadingAvatar(false);
    if (error) return toast(error, 'error');
    setAvatarUrl(url ?? null);
    toast('Profil fotoğrafın güncellendi');
  };

  const email = session?.user?.email ?? 'Demo kullanıcı';
  const username = (session?.user?.user_metadata?.username as string | undefined) ?? 'tünel';

  return (
    <Screen edges={[]} padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Kapak */}
        <View style={[styles.cover, { height: COVER_HEIGHT + insets.top }]}>
          <LinearGradient
            colors={['rgba(255,61,113,0.32)', 'rgba(255,138,61,0.10)', 'transparent']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.coverLogo, { top: insets.top + 6 }]}>
            <Logo size={96} showWordmark={false} />
          </View>
        </View>

        <View style={styles.body}>
          {/* Kimlik */}
          <View style={styles.identity}>
            <Touchable style={styles.avatarRing} onPress={changeAvatar} scaleTo={0.93}>
              <Avatar username={username} url={avatarUrl} size={AVATAR} style={shadow.glowSoft} />
              <View style={styles.avatarEdit}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </Touchable>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.email}>{email}</Text>
            {!avatarUrl && (
              <Text style={styles.avatarHint}>Fotoğraf ekle — takımın seni tanısın</Text>
            )}
          </View>

          {loading ? (
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <Skeleton height={86} rounded={radius.lg} />
              <ListSkeleton count={3} height={54} />
            </View>
          ) : (
            <>
              {stats && (
                <Animated.View entering={FadeInDown.duration(360)}>
                  <View style={styles.statsRow}>
                    <StatBox
                      value={stats.currentStreak}
                      label="gün seri"
                      icon="flame"
                      highlight={stats.currentStreak > 0}
                    />
                    <StatBox value={stats.longestStreak} label="en uzun" />
                    <StatBox value={stats.totalPosts} label="paylaşım" />
                  </View>

                  {stats.badges.length > 0 && (
                    <View style={styles.badges}>
                      {stats.badges.map((b, i) => (
                        <View key={i} style={styles.badge}>
                          <Ionicons name={b.icon as any} size={12} color={colors.accent} />
                          <Text style={styles.badgeText}>{b.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardTitle}>Son 5 hafta</Text>
                      <Text style={styles.cardHint}>
                        {stats.activeDays.length} gün aktif
                      </Text>
                    </View>
                    <ActivityHeatmap activeDays={stats.activeDays} />
                  </View>
                </Animated.View>
              )}

              {!configured && (
                <View style={styles.warn}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                  <Text style={styles.warnText}>
                    Supabase bağlı değil — demo modu. Giriş ve veriler için .env yapılandırın.
                  </Text>
                </View>
              )}

              {/* Takımlar */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Takımların</Text>
                {teams.length > 0 && <Text style={styles.count}>{teams.length}</Text>}
              </View>

              {teams.length === 0 ? (
                <View style={styles.emptyTeams}>
                  <Text style={styles.emptyText}>Henüz bir takımda değilsin.</Text>
                  <Text style={styles.emptySub}>Aşağıdan katıl ya da yeni takım oluştur.</Text>
                </View>
              ) : (
                teams.map((team) => (
                  <View key={team.id} style={styles.teamRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.teamNameRow}>
                        <Text style={styles.teamName}>{team.name}</Text>
                        <View
                          style={[
                            styles.roleBadge,
                            team.role === 'captain' ? styles.roleCaptain : styles.roleMember,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleText,
                              { color: team.role === 'captain' ? colors.accent : colors.textDim },
                            ]}
                          >
                            {team.role === 'captain' ? 'Kaptan' : 'Üye'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.teamCode}>Kod: {team.inviteCode}</Text>
                    </View>
                    {team.role === 'captain' && (
                      <Pressable onPress={() => confirmDelete(team)} hitSlop={8} style={styles.trash}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {/* Kısayollar */}
          <View style={styles.menu}>
            <MenuRow icon="barbell-outline" label="Kişisel rekorlar (PR)" onPress={() => router.push('/pr')} />
            <MenuRow icon="notifications-outline" label="Bildirimler" onPress={() => router.push('/bildirimler')} />
            <MenuRow icon="people-outline" label="Takıma katıl / oluştur" onPress={() => router.push('/join-team')} />
            <MenuRow icon="shield-checkmark-outline" label="Kaptan paneli" onPress={() => router.push('/kaptan')} />
            <MenuRow icon="trophy-outline" label="Liderlik" onPress={() => router.push('/liderlik')} last />
          </View>

          {configured && session ? (
            <Pressable onPress={signOut} style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.signOutText}>Çıkış yap</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatBox({
  value,
  label,
  icon,
  highlight,
}: {
  value: number;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statBox, highlight && styles.statBoxHot]}>
      <View style={styles.statTop}>
        {icon && <Ionicons name={icon} size={16} color={highlight ? colors.accent : colors.textDim} />}
        <Text style={[styles.statNum, highlight && { color: colors.accent }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuDivider,
        pressed && { backgroundColor: colors.surface2 },
      ]}
    >
      <Ionicons name={icon} size={19} color={colors.textDim} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
    </Pressable>
  );
}

const AVATAR = 78;

const styles = StyleSheet.create({
  cover: { width: '100%', overflow: 'hidden' },
  coverLogo: { position: 'absolute', right: -14, opacity: 0.12 },
  body: { paddingHorizontal: spacing.xl, marginTop: -AVATAR / 2 },
  identity: { alignItems: 'center', gap: 2 },
  avatarRing: {
    width: AVATAR + 8,
    height: AVATAR + 8,
    borderRadius: (AVATAR + 8) / 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarEdit: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: spacing.xs },
  username: { color: colors.text, fontSize: fontSize.xl, fontFamily: font.display },
  email: { color: colors.textDim, fontSize: fontSize.sm },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statBoxHot: { backgroundColor: colors.accentBg, borderColor: 'rgba(255,138,61,0.35)' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statNum: { color: colors.text, fontSize: fontSize.xl, fontFamily: font.displayBold, ...tabularNums },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,138,61,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '500' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  cardHint: { color: colors.textFaint, fontSize: fontSize.xs },

  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  warnText: { color: colors.warning, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontFamily: font.display },
  count: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  emptyTeams: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4,
  },
  emptyText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  emptySub: { color: colors.textDim, fontSize: fontSize.xs },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamName: { color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  roleCaptain: { backgroundColor: colors.accentBg },
  roleMember: { backgroundColor: colors.surface2 },
  roleText: { fontSize: fontSize.xs, fontWeight: '500' },
  teamCode: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 3, letterSpacing: 1 },
  trash: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menu: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
  },
  menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  menuLabel: { flex: 1, color: colors.text, fontSize: fontSize.md },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: 13,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,90,110,0.3)',
  },
  signOutText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '500' },
});
