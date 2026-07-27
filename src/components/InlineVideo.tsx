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

import { VideoScrubber } from '@/components/VideoScrubber';
import { usePref } from '@/lib/prefs';
import { makeStyles, useThemeTick } from '@/theme';

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

/**
 * Oynatıcı + ses/durdurma durumu.
 *
 * - `active` false olduğunda (kart görünürden çıktı, ekran odağını yitirdi)
 *   video durur, sesi kapanır ve elle verilen kararlar sıfırlanır.
 * - Videoya dokunmak oynat/durdur yapar; ses ayrı düğmede.
 * - Ayarlarda "otomatik oynat" kapalıysa video ilk dokunuşa kadar bekler.
 */
export function useInlineVideo(uri: string | null | undefined, active: boolean) {
  const autoplay = usePref('autoplay');
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const player = useVideoPlayer(uri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    // İlerleme çubuğunun akıcı görünmesi için (VideoScrubber bunu dinliyor).
    p.timeUpdateEventInterval = 0.25;
  });
  const foreground = useAppForeground();
  const playing = !!uri && active && foreground && !paused && (autoplay || started);

  useEffect(() => {
    if (!uri) return;
    if (playing) player.play();
    else player.pause();
  }, [playing, uri, player]);

  // Kart görünürden çıkınca temiz sayfa: ses kapanır, elle durdurma unutulur.
  // (Elle durdurmada sesi sıfırlamıyoruz — devam ettirince ses geri gelsin.)
  useEffect(() => {
    if (active) return;
    setStarted(false);
    setPaused(false);
    setMuted(true);
    player.muted = true;
  }, [active, player]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  }, [muted, player]);

  /** Videoya dokunuş: beklemedeyse başlatır, oynuyorsa durdurur, duruyorsa devam eder. */
  const press = useCallback(() => {
    if (!autoplay && !started) {
      setStarted(true);
      setPaused(false);
      return;
    }
    setPaused((p) => !p);
  }, [autoplay, started]);

  return { player, muted, toggleMute, playing, paused, press };
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
  useThemeTick();
  const { player, muted, toggleMute, playing, press } = useInlineVideo(uri, active);

  return (
    <Pressable style={[style, styles.container]} onPress={press}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={false}
      />
      {!playing && (
        <View style={styles.playBadge} pointerEvents="none">
          <Ionicons name="play" size={22} color="#fff" />
        </View>
      )}
      <Pressable style={styles.muteBtn} onPress={toggleMute} hitSlop={8}>
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
      </Pressable>
      <VideoScrubber player={player} />
    </Pressable>
  );
}

const styles = makeStyles((colors) => ({
  // Sarma çubuğu akış içinde en altta dursun.
  container: { justifyContent: 'flex-end' },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sarma çubuğu alta geldiği için ses düğmesi üste taşındı.
  muteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
