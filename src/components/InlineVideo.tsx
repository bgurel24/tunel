// Satır içi video: sessiz başlar, döngüde kendi oynar, tek dokunuş sesi açar.
// Kart görünür alandan çıkınca, ekran odağını kaybedince ya da uygulama arka
// plana gidince durur ve susar — yoksa başka ekrana geçince ses devam ediyordu.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  type ViewToken,
} from 'react-native';

import { colors } from '@/theme';

/** Ekran şu an odakta mı — sekme/sayfa değişince videoları susturmak için. */
export function useScreenFocused() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  return focused;
}

/** Uygulama ön planda mı — arka plana alınca ses devam etmesin. */
function useAppForeground() {
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s !== 'background'));
    return () => sub.remove();
  }, []);
  return foreground;
}

/**
 * FlatList'te görünür alandaki tek kartı aktif tutar; böylece aynı anda tek video
 * oynar. Dönen `viewabilityConfigCallbackPairs` referansı sabit olmalı (FlatList şartı).
 */
export function useVisibleVideo() {
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const pairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 60, minimumViewTime: 120 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const first = viewableItems[0]?.item as { id?: string } | undefined;
        setVisibleId(first?.id ?? null);
      },
    },
  ]);
  return { visibleId, viewabilityConfigCallbackPairs: pairs.current };
}

/** Oynatıcı + ses durumu. `active` false olduğunda video durur ve sesi kapanır. */
export function useInlineVideo(uri: string | null | undefined, active: boolean) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const foreground = useAppForeground();
  const playing = !!uri && active && foreground;

  useEffect(() => {
    if (!uri) return;
    if (playing) {
      player.play();
    } else {
      player.pause();
      player.muted = true;
      setMuted(true);
    }
  }, [playing, uri, player]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  }, [muted, player]);

  return { player, muted, toggleMute };
}

export function InlineVideo({
  uri,
  active,
  style,
  contentFit = 'cover',
}: {
  uri: string;
  active: boolean;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const { player, muted, toggleMute } = useInlineVideo(uri, active);

  return (
    <Pressable style={style} onPress={toggleMute}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={false}
      />
      <View style={styles.muteBtn}>
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
