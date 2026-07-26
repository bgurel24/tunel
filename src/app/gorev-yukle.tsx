// Görev kanıtı yükleme — hareket videosu. Canlı çekim ZORUNLU DEĞİL:
// galeriden video seçilebilir ya da istenirse kamerayla çekilebilir.

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, } from 'react-native';

import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { createVideoPost } from '@/lib/posts';
import { submitProof, uploadVideo } from '@/lib/tasks';
import { colors, fontSize, radius, spacing } from '@/theme';

function durationLabel(ms?: number | null) {
  if (!ms) return null;
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GorevYukleScreen() {
  const router = useRouter();
  const { celebrate } = useToast();
  const { configured } = useAuth();
  const params = useLocalSearchParams<{ task?: string; taskId?: string; teamId?: string }>();
  const taskLabel = params.task ?? 'Hareket videosu';

  const [uri, setUri] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [shareOn, setShareOn] = useState(false);
  const [shareScope, setShareScope] = useState<'takim' | 'sosyal' | 'ikisi'>('takim');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAsset = (asset: ImagePicker.ImagePickerAsset) => {
    setError(null);
    setUri(asset.uri);
    const d = durationLabel(asset.duration);
    setLabel(d ? `Video · ${d}` : 'Video seçildi');
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (!res.canceled && res.assets[0]) applyAsset(res.assets[0]);
  };

  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Kamera izni verilmedi.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
    });
    if (!res.canceled && res.assets[0]) applyAsset(res.assets[0]);
  };

  const submit = async () => {
    if (!uri) {
      setError('Önce bir video seç veya çek.');
      return;
    }
    setError(null);
    setSubmitting(true);

    if (!configured) {
      setSubmitting(false);
      router.back();
      return;
    }

    // Videoyu bir kez yükle, hem kanıt hem paylaşım için kullan.
    const up = await uploadVideo(uri);
    if (up.error || !up.path) {
      setSubmitting(false);
      setError(up.error ?? 'Video yüklenemedi.');
      return;
    }

    if (params.taskId) {
      const { error } = await submitProof(params.taskId, up.path, note);
      if (error) {
        setSubmitting(false);
        setError(error);
        return;
      }
    }

    if (shareOn) {
      const taskTeamId = params.teamId ?? null;
      const teamForPost = shareScope === 'sosyal' ? null : taskTeamId;
      const toSocial = shareScope !== 'takim';
      const { error } = await createVideoPost(up.path, note, teamForPost, toSocial);
      if (error) {
        setSubmitting(false);
        setError(error);
        return;
      }
    }

    setSubmitting(false);
    celebrate(params.taskId ? 'Kanıt gönderildi' : 'Paylaşıldı');
    router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Görev kanıtı</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.taskLabel}>{taskLabel}</Text>
      <Text style={styles.lead}>
        Hareketin videosunu galeriden seçebilir ya da kamerayla çekebilirsin. Canlı çekim
        zorunlu değil.
      </Text>

      {uri ? (
        <View style={styles.selected}>
          <View style={styles.selectedIcon}>
            <Ionicons name="videocam" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedTitle}>{label}</Text>
            <Text style={styles.selectedSub}>Yüklemeye hazır</Text>
          </View>
          <Pressable onPress={pickFromGallery} hitSlop={8}>
            <Text style={styles.change}>Değiştir</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.pickRow}>
          <Pressable style={styles.pickBtn} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={26} color={colors.accent} />
            <Text style={styles.pickText}>Galeriden seç</Text>
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={recordVideo}>
            <Ionicons name="videocam-outline" size={26} color={colors.accent} />
            <Text style={styles.pickText}>Kamerayla çek</Text>
          </Pressable>
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Field
          label="Not (opsiyonel)"
          value={note}
          onChangeText={setNote}
          placeholder="Ağırlık, tekrar, ek bilgi…"
        />
      </View>

      <Pressable style={styles.shareRow} onPress={() => setShareOn((v) => !v)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareTitle}>Feed'e de paylaş</Text>
          <Text style={styles.shareSub}>Kanıt videon feed'de de görünsün</Text>
        </View>
        <View style={[styles.switch, shareOn && styles.switchOn]}>
          <View style={[styles.knob, shareOn && styles.knobOn]} />
        </View>
      </Pressable>

      {shareOn && (
        <View style={styles.scopeToggle}>
          {(['takim', 'sosyal', 'ikisi'] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.scopeSeg, shareScope === s && styles.scopeSegActive]}
              onPress={() => setShareScope(s)}
            >
              <Text style={[styles.scopeText, shareScope === s && styles.scopeTextActive]}>
                {s === 'takim' ? 'Takım' : s === 'sosyal' ? 'Sosyal' : 'İkisi'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <GradientButton
        label="Gönder"
        onPress={submit}
        loading={submitting}
        style={{ marginTop: spacing.xl }}
      />

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
        <Text style={styles.infoText}>
          Kaptan onayladıktan sonra görev tamamlanır ve takım puanı işlenir.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  taskLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  lead: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  pickRow: { flexDirection: 'row', gap: spacing.md },
  pickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
  },
  pickText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  selectedIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  selectedSub: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  change: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '500' },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  shareTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  shareSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  scopeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.md,
  },
  scopeSeg: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  scopeSegActive: { backgroundColor: colors.surface2 },
  scopeText: { color: colors.textDim, fontSize: fontSize.sm },
  scopeTextActive: { color: colors.text, fontWeight: '600' },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  infoText: { color: colors.textFaint, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },
});
