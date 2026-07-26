// Kullanıcı profili — bir kişinin streak/rozet, rekor ve paylaşımları (herkese açık).

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { getUserPosts } from '@/lib/posts';
import { getUserRecords, type MovementGroup } from '@/lib/records';
import { getUserStats, type MyStats } from '@/lib/stats';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function KullaniciScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState<MyStats | null>(null);
  const [records, setRecords] = useState<MovementGroup[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const [prof, s, r, p] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', id).maybeSingle(),
        getUserStats(id),
        getUserRecords(id),
        getUserPosts(id),
      ]);
      if (!active) return;
      setUsername((prof.data as any)?.username ?? 'kullanıcı');
      setStats(s);
      setRecords(r);
      setPosts(p);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const initials = (username || '?').slice(0, 2).toUpperCase();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={26} color={colors.text} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{username || 'Profil'}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.top}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.username}>{username}</Text>
          </View>

          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <View style={styles.streakTop}>
                  <Ionicons name="flame" size={16} color={colors.accent} />
                  <Text style={styles.statNum}>{stats.currentStreak}</Text>
                </View>
                <Text style={styles.statLabel}>gün seri</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.longestStreak}</Text>
                <Text style={styles.statLabel}>en uzun</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.totalPosts}</Text>
                <Text style={styles.statLabel}>paylaşım</Text>
              </View>
            </View>
          )}

          {stats && stats.badges.length > 0 && (
            <View style={styles.badges}>
              {stats.badges.map((b, i) => (
                <View key={i} style={styles.badge}>
                  <Ionicons name={b.icon as any} size={13} color={colors.accent} />
                  <Text style={styles.badgeText}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}

          {records.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rekorlar</Text>
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
            <Text style={styles.sectionTitle}>Paylaşımlar</Text>
            {posts.length === 0 ? (
              <Text style={styles.empty}>Henüz paylaşım yok.</Text>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  top: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontSize: fontSize.xl, fontWeight: '700' },
  username: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
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
    backgroundColor: 'rgba(245,101,46,0.12)',
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
});
