// Akış (Feed) — cam başlık, ekip şeridi, Takım/Sosyal geçişi + paylaşım kartları.

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrewStrip } from '@/components/CrewStrip';
import { EmptyState } from '@/components/EmptyState';
import { useVisibleVideo } from '@/components/InlineVideo';
import { Logo } from '@/components/Logo';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { SessionCard } from '@/components/SessionCard';
import { FeedSkeleton } from '@/components/Skeleton';
import { StarterChecklist } from '@/components/StarterChecklist';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { getCrew, type CrewMember } from '@/lib/crew';
import { getFeed } from '@/lib/posts';
import { getActiveSessions, type GymSession } from '@/lib/sessions';
import { getStarterState, type StarterState } from '@/lib/starter';
import type { FeedKind, Post } from '@/lib/types';
import { colors, font, fontSize, radius, spacing } from '@/theme';

const FEEDS = [
  { key: 'takim' as const, label: 'Takım' },
  { key: 'sosyal' as const, label: 'Sosyal' },
];

const HEADER_HEIGHT = 52;

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarPadding();

  const [feed, setFeed] = useState<FeedKind>('takim');
  const [posts, setPosts] = useState<Post[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [starter, setStarter] = useState<StarterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [focused, setFocused] = useState(true);
  const { visibleId, viewabilityConfigCallbackPairs } = useVisibleVideo();

  // Görünürlük geri bildirimi gelene kadar ilk kart oynasın.
  const activeId = visibleId ?? posts[0]?.id ?? null;

  // Ekran her odaklandığında (paylaşımdan dönünce dahil) feed'i tazele.
  // Odak bilgisi ayrıca videoları susturmak için kullanılıyor.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setFocused(true);
      Promise.all([getFeed(feed), getCrew(), getActiveSessions(), getStarterState()]).then(
        ([data, members, calls, setup]) => {
          if (!active) return;
          setPosts(data);
          setCrew(members);
          setSessions(calls);
          setStarter(setup);
          setLoading(false);
        }
      );
      return () => {
        active = false;
        setFocused(false);
      };
    }, [feed])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [data, members, calls, setup] = await Promise.all([
      getFeed(feed),
      getCrew(),
      getActiveSessions(),
      getStarterState(),
    ]);
    setPosts(data);
    setCrew(members);
    setSessions(calls);
    setStarter(setup);
    setRefreshing(false);
  }, [feed]);

  const reloadSessions = useCallback(() => {
    getActiveSessions().then(setSessions);
  }, []);

  const switchFeed = (next: FeedKind) => {
    setFeed(next);
    setLoading(true);
  };

  const listHeader = (
    <View>
      <CrewStrip crew={crew} />

      {starter && !starter.done && <StarterChecklist state={starter} />}

      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} onChanged={reloadSessions} />
      ))}

      {sessions.length === 0 && (
        <Touchable style={styles.callRow} onPress={() => router.push('/cagri')} scaleTo={0.98}>
          <View style={styles.callIcon}>
            <Ionicons name="flash" size={17} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.callTitle}>Bugün gym var mı?</Text>
            <Text style={styles.callSub}>Takımı çağır, gelen gelsin</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Touchable>
      )}

      <Segmented options={FEEDS} value={feed} onChange={switchFeed} />
      <View style={{ height: spacing.lg }} />
    </View>
  );

  return (
    <Screen edges={[]} padded={false}>
      <FlatList
        data={loading ? [] : posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          // Sadece ilk ekrandakiler sıraya girsin; aşağıdakiler gecikmesiz açılsın.
          <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 70).duration(420)}>
            <PostCard
              post={item}
              active={focused && activeId === item.id}
              onDeleted={() => getFeed(feed).then(setPosts)}
            />
          </Animated.View>
        )}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top + HEADER_HEIGHT + spacing.md,
          paddingBottom: bottomPad,
        }}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            progressViewOffset={insets.top + HEADER_HEIGHT}
          />
        }
        ListEmptyComponent={
          loading ? (
            <FeedSkeleton />
          ) : (
            <EmptyState
              icon={feed === 'takim' ? 'barbell-outline' : 'planet-outline'}
              title={feed === 'takim' ? 'Takım sessiz' : 'Ortalık sakin'}
              body={
                feed === 'takim'
                  ? 'Takım arkadaşların pump attıkça burası dolacak. İlk hamleyi sen yap.'
                  : 'Sosyal akışta kimse yok. Paylaşımını sosyale açarsan seni burada görürler.'
              }
              actionLabel="Bir kare at"
              onAction={() => router.push('/paylas')}
            />
          )
        }
      />

      <View style={[styles.header, { height: insets.top + HEADER_HEIGHT, paddingTop: insets.top }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.headerTint]} />
        <View style={styles.headerRow}>
          <Logo size={26} showWordmark={false} />
          <Text style={styles.wordmark}>TÜNEL</Text>
          <View style={{ flex: 1 }} />
          <Touchable onPress={() => router.push('/cagri')} hitSlop={10} scaleTo={0.88} style={styles.headerCall}>
            <Ionicons name="flash" size={16} color={colors.accent} />
            <Text style={styles.headerCallText}>Çağır</Text>
          </Touchable>
          <Pressable onPress={() => router.push('/bildirimler')} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color={colors.textDim} />
          </Pressable>
        </View>
        <View style={styles.hairline} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  headerTint: { backgroundColor: colors.glass },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: font.displayBold,
    letterSpacing: 2.5,
  },
  hairline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  headerCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentBg,
  },
  headerCallText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700' },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  callIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  callSub: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 1 },
});
