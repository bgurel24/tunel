// Paylaş — anlık kamera. Çek → önizle → açıklama + "feed'e de ekle" → paylaş.
// Galeri yok; sadece uygulama içi canlı çekim (kanıt doğruluğu için).

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { getPrefs } from '@/lib/prefs';
import { Touchable } from '@/components/Touchable';
import { createPost } from '@/lib/posts';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

/** Antrenman etiketleri — paylaşımı "genel sosyal medya" olmaktan çıkarır. */
const WORKOUT_TAGS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Göğüs', icon: 'body-outline' },
  { label: 'Sırt', icon: 'accessibility-outline' },
  { label: 'Bacak', icon: 'walk-outline' },
  { label: 'Omuz', icon: 'barbell-outline' },
  { label: 'Kol', icon: 'fitness-outline' },
  { label: 'Kardiyo', icon: 'heart-outline' },
  { label: 'Full body', icon: 'flame-outline' },
];

export default function PaylasScreen() {
  useThemeTick();
  const router = useRouter();
  const { celebrate } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [workoutTag, setWorkoutTag] = useState<string | null>(null);
  const [addToSocial, setAddToSocial] = useState(getPrefs().defaultShare !== 'team');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    const shot = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
    if (shot?.uri) setPhotoUri(shot.uri);
  };

  const share = async () => {
    if (!photoUri) return;
    setError(null);
    setSharing(true);
    const { error } = await createPost({ caption, imageUri: photoUri, addToSocial, workoutTag });
    setSharing(false);
    if (error) {
      setError(error);
      return;
    }
    celebrate('Paylaşıldı');
    router.back();
  };

  // --- İzin durumu ---
  if (!permission) {
    return (
      <View style={styles.fill}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.fill}>
        <View style={styles.permBox}>
          <Ionicons name="camera-outline" size={48} color={colors.accent} />
          <Text style={styles.permTitle}>Kamera izni gerekli</Text>
          <Text style={styles.permBody}>
            Tünel anlık paylaşım için kameraya erişir. Galeriden yükleme yok — sadece o an çekim.
          </Text>
          <GradientButton label="İzin ver" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>Vazgeç</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Önizleme + paylaşım formu ---
  if (photoUri) {
    return (
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.composeContent} keyboardShouldPersistTaps="handled">
            <View style={styles.composeHeader}>
              <Pressable onPress={() => setPhotoUri(null)} hitSlop={12}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>Yeni paylaşım</Text>
              <View style={{ width: 26 }} />
            </View>

            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
              <View style={styles.liveBadge}>
                <Ionicons name="flash" size={12} color={colors.accent} />
                <Text style={styles.liveText}>canlı</Text>
              </View>
            </View>

            <View>
              <Text style={styles.tagLabel}>Ne çalıştın?</Text>
              <View style={styles.tagWrap}>
                {WORKOUT_TAGS.map((t) => {
                  const active = workoutTag === t.label;
                  return (
                    <Touchable
                      key={t.label}
                      onPress={() => setWorkoutTag(active ? null : t.label)}
                      scaleTo={0.93}
                      style={[styles.tag, active && styles.tagActive]}
                    >
                      <Ionicons
                        name={t.icon}
                        size={14}
                        color={active ? colors.accent : colors.textDim}
                      />
                      <Text style={[styles.tagText, active && styles.tagTextActive]}>{t.label}</Text>
                    </Touchable>
                  );
                })}
              </View>
            </View>

            <Field
              label="Açıklama"
              value={caption}
              onChangeText={setCaption}
              placeholder="Nasıl geçti?"
              multiline
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />

            <Pressable style={styles.musicRow}>
              <Ionicons name="musical-notes-outline" size={20} color={colors.accent} />
              <Text style={styles.musicLabel}>Şarkı ekle</Text>
              <View style={styles.soonPill}>
                <Text style={styles.soonText}>yakında</Text>
              </View>
            </Pressable>

            <Pressable style={styles.toggleRow} onPress={() => setAddToSocial((v) => !v)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Feed'e de ekle</Text>
                <Text style={styles.toggleSub}>Takım dışında sosyal feed'de de görünsün</Text>
              </View>
              <View style={[styles.switch, addToSocial && styles.switchOn]}>
                <View style={[styles.knob, addToSocial && styles.knobOn]} />
              </View>
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}

            <GradientButton
              label="Paylaş"
              onPress={share}
              loading={sharing}
              style={{ marginTop: spacing.sm }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- Canlı kamera ---
  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
        <View style={styles.cameraTop}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.roundBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <View style={styles.livePill}>
            <Ionicons name="flash" size={13} color={colors.accent} />
            <Text style={styles.livePillText}>anlık · galeri kapalı</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cameraBottom}>
          <View style={{ width: 48 }} />
          <Pressable onPress={capture} style={styles.shutterOuter}>
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={styles.roundBtn}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  fill: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // İzin
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  permBody: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cancel: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  // Kamera overlay
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  livePillText: {
    color: '#fff',
    fontSize: fontSize.xs,
  },
  cameraBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
  },
  // Önizleme / compose
  composeContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  previewWrap: {
    height: 320,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  preview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  liveText: {
    color: colors.text,
    fontSize: fontSize.xs,
  },
  tagLabel: { color: colors.textDim, fontSize: fontSize.sm, marginBottom: spacing.sm },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagActive: { backgroundColor: colors.accentBg, borderColor: colors.accent },
  tagText: { color: colors.textDim, fontSize: fontSize.sm },
  tagTextActive: { color: colors.text, fontWeight: '600' },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  musicLabel: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  soonPill: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  soonText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  toggleSub: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.accent,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
}));
