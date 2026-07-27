// Video ilerleme çubuğu — sürükleyerek sarma, dokununca o ana atlama,
// 10 sn ileri/geri. Videonun altına, medyanın içine oturur.
//
// Sürüklerken `timeUpdate` yok sayılır (yoksa çubuk parmağın altında zıplar);
// bırakınca oynatıcı yeniden söz sahibi olur.
//
// Çubuk UI thread'de (shared value) çizilir, JS tarafı saniyede ~10 kez
// güncellenir: sarma akıcı kalırken kart yeniden çizimlerle boğulmaz.

import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import type { VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { Haptics } from '@/lib/haptics';
import { fontSize, makeStyles, radius, spacing, tabularNums, useThemeTick } from '@/theme';

const SKIP = 10;
/** Sürükleme sırasında JS tarafına en fazla bu sıklıkta iş düşer. */
const SCRUB_MS = 100;

function clamp01(v: number) {
  'worklet';
  return Math.min(Math.max(v, 0), 1);
}

function clock(sec: number) {
  const s = Math.max(0, Math.floor(isFinite(sec) ? sec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function VideoScrubber({ player }: { player: VideoPlayer }) {
  useThemeTick();
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [dragging, setDragging] = useState(false);

  const durRef = useRef(0);
  const draggingRef = useRef(false);
  const lastScrub = useRef(0);
  const trackW = useSharedValue(0);
  const ratio = useSharedValue(0);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!draggingRef.current) setPos(currentTime);
    // Süre metadata gelince belli oluyor; ilk timeUpdate'te yakalayıp saklıyoruz.
    const d = player.duration;
    if (d > 0 && d !== durRef.current) {
      durRef.current = d;
      setDur(d);
    }
  });

  // Oynatma ilerledikçe çubuğu takip ettir (sürükleme sırasında dokunma).
  useEffect(() => {
    if (!dragging && dur > 0) ratio.value = Math.min(Math.max(pos / dur, 0), 1);
  }, [pos, dur, dragging, ratio]);

  // Aşağıdakilerin hepsi ref/player üzerinden çalışıyor → referansları sabit,
  // böylece hareketler her karede yeniden kurulmuyor.
  const applyRatio = useCallback(
    (r: number) => {
      const d = durRef.current;
      if (d <= 0) return;
      player.currentTime = r * d;
      setPos(r * d);
    },
    [player]
  );

  const startDrag = useCallback(() => {
    draggingRef.current = true;
    setDragging(true);
    Haptics.selectionAsync();
  }, []);

  const dragTo = useCallback(
    (r: number) => {
      const now = Date.now();
      if (now - lastScrub.current < SCRUB_MS) return;
      lastScrub.current = now;
      applyRatio(r);
    },
    [applyRatio]
  );

  const endDrag = useCallback(
    (r: number) => {
      applyRatio(r);
      draggingRef.current = false;
      setDragging(false);
    },
    [applyRatio]
  );

  const jumpTo = useCallback(
    (r: number) => {
      applyRatio(r);
      Haptics.selectionAsync();
    },
    [applyRatio]
  );

  const gesture = useMemo(() => {
    // Yatay hareket eşiği: dikey kaydırma feed'de çalışmaya devam etsin.
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-14, 14])
      .onStart((e) => {
        runOnJS(startDrag)();
        if (trackW.value > 0) ratio.value = clamp01(e.x / trackW.value);
      })
      .onUpdate((e) => {
        if (trackW.value <= 0) return;
        const r = clamp01(e.x / trackW.value);
        ratio.value = r;
        runOnJS(dragTo)(r);
      })
      .onFinalize(() => {
        runOnJS(endDrag)(ratio.value);
      });

    const tap = Gesture.Tap().onEnd((e) => {
      if (trackW.value <= 0) return;
      const r = clamp01(e.x / trackW.value);
      ratio.value = r;
      runOnJS(jumpTo)(r);
    });

    return Gesture.Exclusive(pan, tap);
  }, [startDrag, dragTo, endDrag, jumpTo, ratio, trackW]);

  const fillStyle = useAnimatedStyle(() => ({ width: ratio.value * trackW.value }));
  const knobStyle = useAnimatedStyle(() => ({ left: ratio.value * trackW.value }));

  const skip = (seconds: number) => {
    player.seekBy(seconds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Süre bilinmeden sarmanın anlamı yok — metadata gelene kadar gizli.
  if (dur <= 0) return null;

  return (
    // Dokunuşu burada tutuyoruz: yoksa çubuğa basmak alttaki karta da geçip
    // videoyu durduruyor.
    <View style={styles.wrap} onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => skip(-SKIP)} hitSlop={8} style={styles.skip}>
        <Ionicons name="play-back" size={14} color="#fff" />
      </Pressable>

      <GestureDetector gesture={gesture}>
        <View
          style={styles.trackHit}
          onLayout={(e) => {
            trackW.value = e.nativeEvent.layout.width;
          }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.knob, dragging && styles.knobBig, knobStyle]} />
        </View>
      </GestureDetector>

      <Pressable onPress={() => skip(SKIP)} hitSlop={8} style={styles.skip}>
        <Ionicons name="play-forward" size={14} color="#fff" />
      </Pressable>

      <Text style={styles.time}>
        {clock(pos)} / {clock(dur)}
      </Text>
    </View>
  );
}

const KNOB = 10;

const styles = makeStyles(() => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  skip: { paddingVertical: 4 },
  trackHit: { flex: 1, justifyContent: 'center', paddingVertical: 10 },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    marginLeft: -KNOB / 2,
    backgroundColor: '#fff',
  },
  knobBig: { transform: [{ scale: 1.4 }] },
  time: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.xs, ...tabularNums },
}));
