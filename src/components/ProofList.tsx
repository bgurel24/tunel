// Profildeki görev kanıtları — kişinin yüklediği görev videoları burada durur.
// Kaptan onay ekranında karar verdikten sonra kanıt oradan düşer, bu liste kalır;
// kaptan profile girip videoyu buradan tekrar izleyebilir.
//
// Video kendiliğinden oynamaz: kart bir ScrollView içinde olduğu için görünürlük
// takibi yok. Dokunulan kart açılır, aynı anda tek video oynar, diğerleri hiç
// indirilmez.

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineVideo, useScreenFocused } from '@/components/InlineVideo';
import { Text } from '@/components/Text';
import { useT, type TranslationKey } from '@/lib/i18n';
import type { ProofStatus, UserProof } from '@/lib/proofs';
import { timeAgo } from '@/lib/time';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

const STATUS: Record<ProofStatus, { color: string; bg: string; label: TranslationKey }> = {
  approved: { color: colors.success, bg: colors.successBg, label: 'status.approved' },
  pending: { color: colors.warning, bg: colors.warningBg, label: 'status.pending' },
  rejected: { color: colors.danger, bg: colors.dangerBg, label: 'status.rejected' },
};

export function ProofList({ proofs, emptyLabel }: { proofs: UserProof[]; emptyLabel: string }) {
  useThemeTick();
  const t = useT();
  const focused = useScreenFocused();
  const [openId, setOpenId] = useState<string | null>(null);

  if (proofs.length === 0) return <Text style={styles.empty}>{emptyLabel}</Text>;

  return (
    <View style={{ gap: spacing.md }}>
      {proofs.map((p) => {
        const status = STATUS[p.status];
        const open = openId === p.id;
        return (
          <View key={p.id} style={styles.card}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.task} numberOfLines={1}>
                  {p.taskTitle}
                </Text>
                <Text style={styles.meta}>
                  {[p.teamName, p.submittedAt ? timeAgo(p.submittedAt) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {p.late && (
                <View style={styles.latePill}>
                  <Text style={styles.lateText}>{t('tasks.late')}</Text>
                </View>
              )}
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{t(status.label)}</Text>
              </View>
            </View>

            {!p.videoUrl ? (
              <View style={styles.noVideo}>
                <Text style={styles.dim}>{t('proofs.noVideo')}</Text>
              </View>
            ) : open ? (
              <InlineVideo uri={p.videoUrl} active={focused} contentFit="contain" style={styles.video} />
            ) : (
              <Pressable style={[styles.video, styles.poster]} onPress={() => setOpenId(p.id)}>
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={20} color="#fff" />
                </View>
                <Text style={styles.dim}>{t('proofs.watch')}</Text>
              </Pressable>
            )}

            {p.note ? <Text style={styles.note}>“{p.note}”</Text> : null}
            {p.rejectNote ? (
              <Text style={styles.rejectNote}>
                {t('tasks.rejectReason')}: {p.rejectNote}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = makeStyles((colors) => ({
  empty: { color: colors.textDim, fontSize: fontSize.sm },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  task: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  meta: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 2 },
  latePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
  },
  lateText: { color: colors.warning, fontSize: fontSize.xs, fontWeight: '500' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontSize: fontSize.xs, fontWeight: '500' },
  video: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  poster: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  playBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideo: {
    minHeight: 88,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { color: colors.textFaint, fontSize: fontSize.xs },
  note: { color: colors.textDim, fontSize: fontSize.xs, marginTop: spacing.sm },
  rejectNote: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
}));
