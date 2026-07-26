// Profil — gradyan kapak, istatistik kartları, rozetler, aktivite ısı haritası,
// takımların (isim/rol/kod, kaptan silebilir) ve kısayollar.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
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
import { useT } from '@/lib/i18n';
import { getMyProfile, pickAvatarImage, uploadAvatar } from '@/lib/profile';
import { getMyStats, type MyStats } from '@/lib/stats';
import {
  deleteTeam,
  getMyTeams,
  leaveTeam,
  regenerateInviteCode,
  renameTeam,
  type MyTeam,
} from '@/lib/teams';
import {
  colors,
  font,
  fontSize,
  makeStyles,
  radius,
  shadow,
  spacing,
  tabularNums,
  useThemeTick,
  withAlpha,
} from '@/theme';

const COVER_HEIGHT = 132;

export default function ProfilScreen() {
  useThemeTick();
  const { session, configured } = useAuth();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarPadding();
  const { toast, confirm, menu, prompt } = useToast();

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
      title: t('profile.deleteTeam'),
      message: t('profile.deleteTeamMessage', { name: team.name }),
      confirmLabel: t('profile.deleteTeam'),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteTeam(team.id);
    if (error) toast(error, 'error');
    else {
      toast(t('profile.teamDeleted', { name: team.name }), 'info');
      load();
    }
  };

  const askRename = async (team: MyTeam) => {
    const name = await prompt({
      title: t('team.rename'),
      placeholder: t('team.namePlaceholder'),
      initialValue: team.name,
      confirmLabel: t('common.save'),
      icon: 'create-outline',
    });
    if (!name || name === team.name) return;
    const { error } = await renameTeam(team.id, name);
    if (error) return toast(error, 'error');
    toast(t('team.renamed', { name }));
    load();
  };

  const askNewCode = async (team: MyTeam) => {
    const ok = await confirm({
      title: t('team.newCodeTitle'),
      message: t('team.newCodeMessage'),
      confirmLabel: t('team.newCode'),
      icon: 'refresh-outline',
    });
    if (!ok) return;
    const { error, inviteCode } = await regenerateInviteCode(team.id);
    if (error) return toast(error, 'error');
    toast(t('team.newCodeDone', { code: inviteCode ?? '' }));
    load();
  };

  const shareCode = (team: MyTeam) => {
    Share.share({
      message: t('team.shareText', { name: team.name, code: team.inviteCode }),
    }).catch(() => {});
  };

  const askLeave = async (team: MyTeam) => {
    const ok = await confirm({
      title: t('team.leaveTitle', { name: team.name }),
      message: t(team.role === 'captain' ? 'team.leaveCaptainMessage' : 'team.leaveMessage'),
      confirmLabel: t('team.leave'),
      destructive: true,
      icon: 'exit-outline',
    });
    if (!ok) return;
    const { error } = await leaveTeam(team.id);
    if (error) return toast(error, 'error');
    toast(t('team.left', { name: team.name }), 'info');
    load();
  };

  const openTeamMenu = async (team: MyTeam) => {
    const captain = team.role === 'captain';
    const choice = await menu({
      title: team.name,
      message: `${t('profile.code')}: ${team.inviteCode}`,
      options: [
        { key: 'share', label: t('team.shareCode'), icon: 'share-outline' },
        ...(captain
          ? [
              { key: 'rename', label: t('team.rename'), icon: 'create-outline' as const },
              { key: 'code', label: t('team.newCode'), icon: 'refresh-outline' as const },
            ]
          : []),
        { key: 'leave', label: t('team.leave'), icon: 'exit-outline', destructive: true },
        ...(captain
          ? [
              {
                key: 'delete',
                label: t('profile.deleteTeam'),
                icon: 'trash-outline' as const,
                destructive: true,
              },
            ]
          : []),
      ],
    });

    if (choice === 'share') shareCode(team);
    if (choice === 'rename') askRename(team);
    if (choice === 'code') askNewCode(team);
    if (choice === 'leave') askLeave(team);
    if (choice === 'delete') confirmDelete(team);
  };

  const changeAvatar = async () => {
    const uri = await pickAvatarImage();
    if (!uri) return;
    setUploadingAvatar(true);
    const { error, avatarUrl: url } = await uploadAvatar(uri);
    setUploadingAvatar(false);
    if (error) return toast(error, 'error');
    setAvatarUrl(url ?? null);
    toast(t('profile.avatarUpdated'));
  };

  const email = session?.user?.email ?? 'demo';
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
            colors={[withAlpha(colors.brandFrom, 0.32), withAlpha(colors.brandTo, 0.1), 'transparent']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.coverLogo, { top: insets.top + 6 }]}>
            <Logo size={96} showWordmark={false} />
          </View>
          <Touchable
            style={[styles.gear, { top: insets.top + 4 }]}
            onPress={() => router.push('/ayarlar')}
            scaleTo={0.9}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Touchable>
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
              <Text style={styles.avatarHint}>{t('profile.avatarHint')}</Text>
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
                      label={t('profile.streak')}
                      icon="flame"
                      highlight={stats.currentStreak > 0}
                    />
                    <StatBox value={stats.longestStreak} label={t('profile.longest')} />
                    <StatBox value={stats.totalPosts} label={t('profile.posts')} />
                  </View>

                  {stats.badges.length > 0 && (
                    <View style={styles.badges}>
                      {stats.badges.map((b, i) => (
                        <View key={i} style={styles.badge}>
                          <Ionicons name={b.icon as any} size={12} color={colors.accent} />
                          <Text style={styles.badgeText}>{t(b.key)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardTitle}>{t('profile.lastWeeks')}</Text>
                      <Text style={styles.cardHint}>
                        {t('profile.activeDays', { n: stats.activeDays.length })}
                      </Text>
                    </View>
                    <ActivityHeatmap activeDays={stats.activeDays} />
                  </View>
                </Animated.View>
              )}

              {!configured && (
                <View style={styles.warn}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                  <Text style={styles.warnText}>{t('settings.demoMode')}</Text>
                </View>
              )}

              {/* Takımlar */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('profile.yourTeams')}</Text>
                {teams.length > 0 && <Text style={styles.count}>{teams.length}</Text>}
              </View>

              {teams.length === 0 ? (
                <View style={styles.emptyTeams}>
                  <Text style={styles.emptyText}>{t('profile.noTeamTitle')}</Text>
                  <Text style={styles.emptySub}>{t('profile.noTeamSub')}</Text>
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
                            {team.role === 'captain' ? t('profile.captain') : t('profile.member')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.teamCode}>{t('profile.code')}: {team.inviteCode}</Text>
                    </View>
                    <Touchable
                      onPress={() => openTeamMenu(team)}
                      hitSlop={8}
                      style={styles.teamMenu}
                      scaleTo={0.92}
                    >
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textDim} />
                    </Touchable>
                  </View>
                ))
              )}
            </>
          )}

          {/* Kısayollar */}
          <View style={styles.menu}>
            <MenuRow icon="barbell-outline" label={t('profile.records')} onPress={() => router.push('/pr')} />
            <MenuRow icon="people-outline" label={t('profile.joinTeam')} onPress={() => router.push('/join-team')} />
            <MenuRow icon="shield-checkmark-outline" label={t('profile.captainPanel')} onPress={() => router.push('/kaptan')} />
            <MenuRow icon="trophy-outline" label={t('profile.leaderboard')} onPress={() => router.push('/liderlik')} />
            <MenuRow icon="settings-outline" label={t('profile.settings')} onPress={() => router.push('/ayarlar')} last />
          </View>

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

const styles = makeStyles((colors) => ({
  cover: { width: '100%', overflow: 'hidden' },
  coverLogo: { position: 'absolute', right: -14, opacity: 0.12 },
  gear: {
    position: 'absolute',
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  teamMenu: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
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
}));
