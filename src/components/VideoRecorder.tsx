// Kanıt videosu için uygulama içi kamera. Sistem kamerası (ImagePicker)
// yerine kendi CameraView'ımız: ön kamera çıktısı önizlemeyle aynı (mirror), çift dokunma
// ile ön/arka değişir, görünüm paylaşım kamerasıyla aynı.

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/GradientButton';
import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { colors, fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

export type RecordedVideo = { uri: string; durationMs: number; fileSize: number | null; mimeType: string };

type Props = {
  visible: boolean;
  maxSeconds: number;
  onClose: () => void;
  onRecorded: (video: RecordedVideo) => void;
};

export function VideoRecorder({ visible, maxSeconds, onClose, onRecorded }: Props) {
  useThemeTick();
  const t = useT();
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);

  const flip = () => {
    if (!recording) setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };

  // Çift dokunma: 300 ms içinde ikinci dokunuş kamerayı çevirir.
  const lastTap = useRef(0);
  const onCameraTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      flip();
    } else {
      lastTap.current = now;
    }
  };

  // Kayıt sayacı
  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  const start = async () => {
    if (!cameraRef.current || recording) return;
    setRecording(true);
    try {
      const started = Date.now();
      // maxDuration dolunca kamera kendi durur ve promise çözülür.
      const res = await cameraRef.current.recordAsync({ maxDuration: maxSeconds });
      const durationMs = Date.now() - started;
      setRecording(false);
      if (!res?.uri) return;
      setBusy(true);
      let fileSize: number | null = null;
      try {
        const buf = await (await fetch(res.uri)).arrayBuffer();
        fileSize = buf.byteLength;
      } catch {}
      setBusy(false);
      const mimeType = res.uri.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/quicktime';
      onRecorded({ uri: res.uri, durationMs, fileSize, mimeType });
    } catch {
      setRecording(false);
      setBusy(false);
    }
  };

  const stop = () => {
    cameraRef.current?.stopRecording();
  };

  const permsReady = camPerm?.granted && micPerm?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        {!camPerm || !micPerm ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : !permsReady ? (
          <SafeAreaView style={styles.fill}>
            <View style={styles.permBox}>
              <Ionicons name="videocam-outline" size={48} color={colors.accent} />
              <Text style={styles.permTitle}>{t('proof.camPermissionTitle')}</Text>
              <Text style={styles.permBody}>{t('proof.camPermission')}</Text>
              <GradientButton
                label={t('share.allow')}
                onPress={async () => {
                  if (!camPerm.granted) await requestCam();
                  if (!micPerm.granted) await requestMic();
                }}
                style={{ alignSelf: 'stretch' }}
              />
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" mirror />
            <Pressable style={StyleSheet.absoluteFill} onPress={onCameraTap} />
            <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
              <View style={styles.top} pointerEvents="box-none">
                <Pressable onPress={onClose} hitSlop={12} style={styles.roundBtn} disabled={recording}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
                <View style={[styles.pill, recording && styles.pillRec]}>
                  <View style={[styles.dot, recording && styles.dotRec]} />
                  <Text style={styles.pillText}>
                    {recording ? `${elapsed}s / ${maxSeconds}s` : t('proof.recordHint', { s: maxSeconds })}
                  </Text>
                </View>
                <View style={{ width: 40 }} />
              </View>

              <View style={styles.bottom} pointerEvents="box-none">
                <View style={{ width: 48 }} />
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Pressable onPress={recording ? stop : start} style={styles.shutterOuter}>
                    <View style={[styles.shutterInner, recording && styles.shutterStop]} />
                  </Pressable>
                )}
                <Pressable onPress={flip} style={[styles.roundBtn, recording && { opacity: 0.4 }]} disabled={recording}>
                  <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
                </Pressable>
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = makeStyles((colors) => ({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pillRec: { backgroundColor: 'rgba(220,40,40,0.75)' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  dotRec: { backgroundColor: '#fff' },
  pillText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e33' },
  shutterStop: { width: 30, height: 30, borderRadius: 6 },
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  permTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center' },
  permBody: { color: colors.textDim, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  cancel: { color: colors.textDim, fontSize: fontSize.sm, padding: spacing.sm },
}));
