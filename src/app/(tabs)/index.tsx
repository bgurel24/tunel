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
import { Logo } from '@/components/Logo';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { FeedSkeleton } from '@/components/Skeleton';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { getCrew, type CrewMember } from '@/lib/crew';
import { getFeed } from '@/lib/posts';
import type { FeedKind, Post } from '@/lib/types';
import { colors, font, fontSize, spacing } from '@/theme';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ekran her odaklandığında (paylaşımdan dönünce dahil) feed'i tazele.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getFeed(feed), getCrew()]).then(([data, members]) => {
        if (!active) return;
        setPosts(data);
        setCrew(members);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [feed])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [data, members] = await Promise.all([getFeed(feed), getCrew()]);
    setPosts(data);
    setCrew(members);
    setRefreshing(false);
  }, [feed]);

  const switchFeed = (next: FeedKind) => {
    setFeed(next);
    setLoading(true);
  };

  const listHeader = (
    <View>
      <CrewStrip crew={crew} />
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
            <PostCard post={item} onDeleted={() => getFeed(feed).then(setPosts)} />
          </Animated.View>
        )}
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
              title="Henüz paylaşım yok"
              body={
                feed === 'takim'
                  ? 'Takım arkadaşların pump attıkça burada görünecek. İlk hamleyi sen yap.'
                  : 'Sosyal akış boş görünüyor. Paylaşımını sosyale de açarsan burada yer alır.'
              }
              actionLabel="Paylaşım yap"
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
});
