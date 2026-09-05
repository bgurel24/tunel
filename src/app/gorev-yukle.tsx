// Görev kanıtı yükleme — hareket videosu. Canlı çekim ZORUNLU DEĞİL:
// galeriden video seçilebilir ya da istenirse kamerayla çekilebilir.

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { createVideoPost } from '@/lib/posts';
import { getPrefs, type ShareTarget } from '@/lib/prefs';
import { submitProof, uploadVideo } from '@/lib/tasks';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, tooBigMessage } from '@/lib/upload';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

/** Kayıt süresi — depolama maliyetinin asıl kaldıracı bu. */
const MAX_SECONDS = 30;

function durationLabel(ms?: number | null) {
  if (!ms) return null;
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function sizeLabel(bytes?: number | null) {
  if (!bytes) return null;
  return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;
}

const SCOPE_BY_PREF: Record<ShareTarget, 'takim' | 'sosyal' | 'ikisi'> = {
  team: 'takim',
  social: 'sosyal',
  both: 'ikisi',
};

export default function GorevYukleScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { celebrate } = useToast();
  const { configured } = useAuth();
  const params = useLocalSearchParams<{ task?: string; taskId?: string; teamId?: string }>();
  const taskLabel = params.task ?? 'Hareket videosu';

  const [uri, setUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [shareOn, setShareOn] = useState(false);
  const [shareScope, setShareScope] = useState<'takim' | 'sosyal' | 'ikisi'>(
    SCOPE_BY_PREF[getPrefs().defaultShare]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Boyut kontrolü SEÇİM anında — yükleme başlayınca dosya zaten belleğe
  // alınmış olur, orada yakalamak geç kalır.
  const applyAsset = (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
      setUri(null);
      setLabel(null);
      setError(tooBigMessage());
      return;
    }
    setError(null);
    setUri(asset.uri);
    setMimeType(asset.mimeType ?? null);
    const bits = [durationLabel(asset.duration), sizeLabel(asset.fileSize)].filter(Boolean);
    setLabel(bits.length ? `Video · ${bits.join(' · ')}` : t('proof.selected'));
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
    });
    if (!res.canceled && res.assets[0]) applyAsset(res.assets[0]);
  };

  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError(t('proof.noCamera'));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_SECONDS,
      // Yalnızca iOS'ta etkili; Android'de expo-image-picker sıkıştırma yapmıyor,
      // orada süre limiti + boyut kontrolü devrede.
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!res.canceled && res.assets[0]) applyAsset(res.assets[0]);
  };

  const submit = async () => {
    if (!uri) {
      setError(t('proof.needVideo'));
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
    const up = await uploadVideo(uri, mimeType);
    if (up.error || !up.path) {
      setSubmitting(false);
      setError(up.error ?? t('proof.uploadFailed'));
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
      const { error } = await createVideoPost(
        up.path,
        note,
        teamForPost,
        toSocial,
        params.taskId ?? null
      );
      if (error) {
        setSubmitting(false);
        setError(error);
        return;
      }
    }

    setSubmitting(false);
    celebrate(t(params.taskId ? 'proof.sent' : 'share.done'));
    router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('proof.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.taskLabel}>{taskLabel}</Text>
      <Text style={styles.lead}>
        {t('proof.lead')} {t('proof.limits', { sec: MAX_SECONDS, mb: MAX_UPLOAD_MB })}
      </Text>

      {uri ? (
        <View style={styles.selected}>
          <View style={styles.selectedIcon}>
            <Ionicons name="videocam" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedTitle}>{label}</Text>
            <Text style={styles.selectedSub}>{t('proof.ready')}</Text>
          </View>
          <Pressable onPress={pickFromGallery} hitSlop={8}>
            <Text style={styles.change}>{t('proof.change')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.pickRow}>
          <Pressable style={styles.pickBtn} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={26} color={colors.accent} />
            <Text style={styles.pickText}>{t('proof.pickGallery')}</Text>
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={recordVideo}>
            <Ionicons name="videocam-outline" size={26} color={colors.accent} />
            <Text style={styles.pickText}>{t('proof.record')}</Text>
          </Pressable>
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Field
          label="Not (opsiyonel)"
          value={note}
          onChangeText={setNote}
          placeholder={t('proof.notePlaceholder')}
        />
      </View>

      <Pressable style={styles.shareRow} onPress={() => setShareOn((v) => !v)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareTitle}>{t('proof.shareTitle')}</Text>
          <Text style={styles.shareSub}>{t('proof.shareSub')}</Text>
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
                {t(s === 'takim' ? 'share.team' : s === 'sosyal' ? 'share.social' : 'share.both')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <GradientButton
        label={t('proof.send')}
        onPress={submit}
        loading={submitting}
        style={{ marginTop: spacing.xl }}
      />

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
        <Text style={styles.infoText}>
          {t('proof.info')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
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
}));
