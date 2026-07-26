// Feed paylaşım kartı — gerçek beğeni/alkış (kalıcı) + yorum, canlı rozeti, müzik barı.

import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '@/lib/haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { useInlineVideo } from '@/components/InlineVideo';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { avatarGradient } from '@/lib/avatar';
import { deletePost } from '@/lib/posts';
import { toggleReaction } from '@/lib/social';
import type { Post } from '@/lib/types';
import {
  colors,
  fontSize,
  gradientColors,
  gradientEnd,
  gradientStart,
  makeStyles,
  radius,
  scrimGradient,
  shadow,
  spacing,
  tabularNums,
  useThemeTick,
} from '@/theme';

export function PostCard({
  post,
  active = true,
  onDeleted,
}: {
  post: Post;
  /** Kart görünür alanda ve ekran odakta mı — false ise video durur, sesi kapanır. */
  active?: boolean;
  onDeleted?: () => void;
}) {
  useThemeTick();
  const router = useRouter();
  const { session } = useAuth();
  const { toast, confirm } = useToast();
  const { width: screenW } = useWindowDimensions();
  const [aspect, setAspect] = useState(1); // en/boy; 0.8 (4:5) ile 1.91 arası sınırlanır
  const [liked, setLiked] = useState(post.myLiked);
  const [clapped, setClapped] = useState(post.myClapped);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [clapCount, setClapCount] = useState(post.clapCount);
  const { player, muted, playing, press } = useInlineVideo(post.videoUrl, active);

  const isMine = !!post.authorId && post.authorId === session?.user?.id;
  const mediaAspect = post.videoUrl ? 0.8 : aspect;
  const avatarColors = avatarGradient(post.username);
  const burst = useSharedValue(0);
  const heartPop = useSharedValue(1);
  const lastTap = useRef(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value,
    transform: [{ scale: 0.6 + burst.value * 0.5 }],
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartPop.value }] }));

  const openProfile = () => {
    if (post.authorId) router.push({ pathname: '/kullanici', params: { id: post.authorId } });
  };

  const confirmDelete = async () => {
    const ok = await confirm({
      title: 'Paylaşımı sil',
      message: 'Bu paylaşım ve altındaki her şey gider. Geri dönüşü yok.',
      confirmLabel: 'Sil',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deletePost(post.id);
    if (error) toast(error, 'error');
    else {
      toast('Paylaşım silindi', 'info');
      onDeleted?.();
    }
  };

  const popHeartIcon = () => {
    heartPop.value = withSequence(
      withSpring(1.35, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 260 })
    );
  };

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(c + (next ? 1 : -1), 0));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next) popHeartIcon();
    toggleReaction(post.id, 'like', next);
  };

  const toggleClap = () => {
    const next = !clapped;
    setClapped(next);
    setClapCount((c) => Math.max(c + (next ? 1 : -1), 0));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleReaction(post.id, 'clap', next);
  };

  const doubleLike = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
      toggleReaction(post.id, 'like', true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    popHeartIcon();
    burst.value = 0;
    burst.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 220 }),
      withDelay(420, withTiming(0, { duration: 280 }))
    );
  };

  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      lastTap.current = 0;
      doubleLike();
    } else {
      lastTap.current = now;
      if (post.videoUrl) {
        tapTimeout.current = setTimeout(() => press(), 280);
      }
    }
  };

  const openComments = () => router.push({ pathname: '/yorumlar', params: { postId: post.id } });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={openProfile}>
          <Avatar username={post.username} url={post.avatarUrl} size={38} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={openProfile}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{post.username}</Text>
            {post.workoutTag ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{post.workoutTag}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sub}>{[post.gym, post.timeLabel].filter(Boolean).join(' · ')}</Text>
        </Pressable>
        {isMine ? (
          <Pressable onPress={confirmDelete} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
          </Pressable>
        ) : post.streakWeeks ? (
          <LinearGradient
            colors={gradientColors}
            start={gradientStart}
            end={gradientEnd}
            style={[styles.streak, shadow.glowSoft]}
          >
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={styles.streakText}>{post.streakWeeks} hafta</Text>
          </LinearGradient>
        ) : null}
      </View>

      <Pressable
        style={[styles.media, { height: (screenW - spacing.xl * 2) / mediaAspect }]}
        onPress={onMediaTap}
      >
        {post.videoUrl ? (
          <>
            <VideoView
              player={player}
              style={styles.mediaImage}
              contentFit="cover"
              nativeControls={false}
            />
            {!playing && (
              <View style={styles.playBadge}>
                <Ionicons name="play" size={24} color="#fff" />
              </View>
            )}
            <View style={styles.muteBtn}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
            </View>
          </>
        ) : post.imageUrl ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.mediaImage}
            contentFit="cover"
            transition={220}
            onLoad={(e) => {
              const s = e.source as { width?: number; height?: number } | null;
              if (s?.width && s?.height) {
                setAspect(Math.min(Math.max(s.width / s.height, 0.8), 1.91));
              }
            }}
          />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Ionicons name="barbell" size={46} color={colors.surface3} />
          </View>
        )}

        {post.music && (
          <LinearGradient colors={scrimGradient} style={styles.scrim} pointerEvents="none" />
        )}

        <Animated.View pointerEvents="none" style={[styles.heartBurst, burstStyle]}>
          <Ionicons name="heart" size={96} color="rgba(255,255,255,0.95)" />
        </Animated.View>

        {post.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>canlı</Text>
          </View>
        )}

        {post.music && (
          <View style={styles.musicBar}>
            <LinearGradient
              colors={gradientColors}
              start={gradientStart}
              end={gradientEnd}
              style={styles.musicIcon}
            >
              <Ionicons name="musical-notes" size={15} color="#fff" />
            </LinearGradient>
            <Text style={styles.musicText} numberOfLines={1}>
              {post.music.title} · {post.music.artist}
            </Text>
            <Ionicons name="play" size={18} color={colors.text} />
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={toggleLike} hitSlop={8}>
          <Animated.View style={heartStyle}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={23}
              color={liked ? colors.magenta : colors.text}
            />
          </Animated.View>
          <Text style={[styles.actionCount, liked && { color: colors.magenta }]}>{likeCount}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={openComments} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={21} color={colors.text} />
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={toggleClap} hitSlop={8}>
          <Ionicons name="flame" size={22} color={clapped ? colors.accent : colors.textDim} />
          <Text style={[styles.actionCount, clapped && { color: colors.accent }]}>{clapCount}</Text>
        </Pressable>

        <View style={{ flex: 1 }} />
        <Ionicons name="paper-plane-outline" size={21} color={colors.textDim} />
      </View>

      {post.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.captionUser}>{post.username} </Text>
          {post.caption}
        </Text>
      ) : null}

      <Pressable onPress={openComments}>
        <Text style={styles.commentHint}>
          {post.commentCount > 0 ? `${post.commentCount} yorumun tümünü gör` : 'Yorum ekle…'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  card: { marginBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  username: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  tag: {
    backgroundColor: colors.accentBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  sub: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  streakText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  media: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  heartBurst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mediaPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.scrim,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brandFrom },
  liveText: { color: colors.text, fontSize: fontSize.xs, fontWeight: '500' },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.scrim,
  },
  musicIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  musicText: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: '500', ...tabularNums },
  caption: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  captionUser: { color: colors.text, fontWeight: '600' },
  commentHint: { color: colors.textFaint, fontSize: fontSize.sm, marginTop: spacing.xs },
}));
