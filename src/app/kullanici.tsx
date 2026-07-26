// Kullanıcı profili — bir kişinin streak/rozet, rekor ve paylaşımları.
// Profil gizliyse (ve takım arkadaşı değilsem) kilitli görünür.
// Sağ üstteki "…" menüsünden şikayet / engelleme.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { useModeration } from '@/components/useModeration';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { isHidden, unblockUser } from '@/lib/moderation';
import { getPublicProfile, type PublicProfile } from '@/lib/profile';
import { getUserPosts } from '@/lib/posts';
import { getUserRecords, type MovementGroup } from '@/lib/records';
import { getUserStats, type MyStats } from '@/lib/stats';
import type { Post } from '@/lib/types';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

export default function KullaniciScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { session } = useAuth();
  const { toast, menu, confirm } = useToast();
  const { reportUserFlow, blockUserFlow } = useModeration();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [records, setRecords] = useState<MovementGroup[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const [prof, hidden] = await Promise.all([getPublicProfile(id), isHidden(id)]);
    setProfile(prof);
    setBlocked(hidden);

    // Kilitliyse ağırlık taşıyan sorguları hiç çalıştırma.
    if (hidden || !prof?.canView) {
      setStats(null);
      setRecords([]);
      setPosts([]);
      setLoading(false);
      return;
    }

    const [s, r, p] = await Promise.all([getUserStats(id), getUserRecords(id), getUserPosts(id)]);
    setStats(s);
    setRecords(r);
    setPosts(p);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const username = profile?.username ?? '';
  const isMe = !!id && id === session?.user?.id;
  const locked = blocked || (!!profile && !profile.canView);

  const askUnblock = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t('blocked.unblockTitle'),
      message: t('blocked.unblockMessage', { name: username }),
      confirmLabel: t('blocked.unblock'),
      icon: 'person-add-outline',
    });
    if (!ok) return;
    const { error } = await unblockUser(id);
    if (error) return toast(error, 'error');
    toast(t('blocked.unblocked', { name: username }), 'info');
    setLoading(true);
    load();
  };

  const openMenu = async () => {
    if (!id) return;
    const choice = await menu({
      title: username || t('user.menuTitle'),
      options: blocked
        ? [{ key: 'unblock', label: t('blocked.unblock'), icon: 'person-add-outline' }]
        : [
            { key: 'report', label: t('report.user'), icon: 'flag-outline' },
            { key: 'block', label: t('block.user'), icon: 'ban-outline', destructive: true },
          ],
    });
    if (choice === 'unblock') askUnblock();
    if (choice === 'report') await reportUserFlow(id);
    if (choice === 'block') {
      const done = await blockUserFlow(id, username);
      if (done) {
        setLoading(true);
        load();
      }
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.iconBtn} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Touchable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {username || t('user.menuTitle')}
        </Text>
        {isMe || !id ? (
          <View style={styles.iconBtn} />
        ) : (
          <Touchable style={styles.iconBtn} onPress={openMenu} scaleTo={0.9}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textDim} />
          </Touchable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.top}>
            <Avatar username={username || '?'} url={profile?.avatarUrl ?? null} size={72} />
            <Text style={styles.username}>{username}</Text>
          </View>

          {locked ? (
            <View style={styles.locked}>
              <View style={styles.lockIcon}>
                <Ionicons
                  name={blocked ? 'ban-outline' : 'lock-closed-outline'}
                  size={26}
                  color={colors.textDim}
                />
              </View>
              <Text style={styles.lockTitle}>
                {t(blocked ? 'user.blockedTitle' : 'user.private')}
              </Text>
              <Text style={styles.lockBody}>
                {t(blocked ? 'user.blockedBody' : 'user.privateBody')}
              </Text>
              {blocked && (
                <Touchable style={styles.unblock} onPress={askUnblock} scaleTo={0.96}>
                  <Text style={styles.unblockText}>{t('blocked.unblock')}</Text>
                </Touchable>
              )}
            </View>
          ) : (
            <>
              {stats && (
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <View style={styles.streakTop}>
                      <Ionicons name="flame" size={16} color={colors.accent} />
                      <Text style={styles.statNum}>{stats.currentStreak}</Text>
                    </View>
                    <Text style={styles.statLabel}>{t('profile.streak')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{stats.longestStreak}</Text>
                    <Text style={styles.statLabel}>{t('profile.longest')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{stats.totalPosts}</Text>
                    <Text style={styles.statLabel}>{t('profile.posts')}</Text>
                  </View>
                </View>
              )}

              {stats && stats.badges.length > 0 && (
                <View style={styles.badges}>
                  {stats.badges.map((b, i) => (
                    <View key={i} style={styles.badge}>
                      <Ionicons name={b.icon as any} size={13} color={colors.accent} />
                      <Text style={styles.badgeText}>{t(b.key)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {records.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('pr.title')}</Text>
                  <View style={styles.recCard}>
                    {records.map((r) => (
                      <View key={r.movement} style={styles.recRow}>
                        <Text style={styles.recMovement}>{r.movement}</Text>
                        <Text style={styles.recBest}>{r.best} kg</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('user.posts')}</Text>
                {posts.length === 0 ? (
                  <Text style={styles.empty}>{t('user.noPosts')}</Text>
                ) : (
                  posts.map((p) => <PostCard key={p.id} post={p} onDeleted={load} />)
                )}
              </View>
            </>
          )}
        </ScrollView>
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
    paddingBottom: spacing.md,
  },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  top: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  username: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },

  locked: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  lockIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  lockTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  lockBody: { color: colors.textDim, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  unblock: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accentBg,
  },
  unblockText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  statLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '500' },
  section: { marginTop: spacing.xl },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '500', marginBottom: spacing.sm },
  recCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  recRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  recMovement: { color: colors.text, fontSize: fontSize.sm },
  recBest: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
  empty: { color: colors.textDim, fontSize: fontSize.sm },
}));
