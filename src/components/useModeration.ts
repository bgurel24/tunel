// Şikayet ve engelleme akışları — PostCard ve kullanıcı profili aynı adımları
// kullanır: sebep seç → gönder → toast. Diyalog yok, markalı alt sayfa var.

import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n';
import {
  REPORT_REASONS,
  blockUser,
  reasonKey,
  reportPost,
  reportUser,
  type ReportReason,
} from '@/lib/moderation';

export function useModeration() {
  const t = useT();
  const { menu, confirm, toast } = useToast();

  const pickReason = async (): Promise<ReportReason | null> => {
    const key = await menu({
      title: t('report.title'),
      message: t('report.lead'),
      options: REPORT_REASONS.map((reason) => ({ key: reason, label: t(reasonKey(reason)) })),
    });
    return (key as ReportReason | null) ?? null;
  };

  /** Paylaşımı şikayet eder. */
  const reportPostFlow = async (postId: string, authorId: string | null) => {
    const reason = await pickReason();
    if (!reason) return false;
    const { error } = await reportPost(postId, authorId, reason);
    if (error) {
      toast(error, 'error');
      return false;
    }
    toast(t('report.sent'), 'info');
    return true;
  };

  /** Kullanıcıyı şikayet eder. */
  const reportUserFlow = async (userId: string) => {
    const reason = await pickReason();
    if (!reason) return false;
    const { error } = await reportUser(userId, reason);
    if (error) {
      toast(error, 'error');
      return false;
    }
    toast(t('report.sent'), 'info');
    return true;
  };

  /** Onay alıp kullanıcıyı engeller; engellendiyse true döner. */
  const blockUserFlow = async (userId: string, username: string) => {
    const ok = await confirm({
      title: t('block.title', { name: username }),
      message: t('block.message'),
      confirmLabel: t('block.action'),
      destructive: true,
      icon: 'ban-outline',
    });
    if (!ok) return false;
    const { error } = await blockUser(userId);
    if (error) {
      toast(error, 'error');
      return false;
    }
    toast(t('block.done', { name: username }), 'info');
    return true;
  };

  return { reportPostFlow, reportUserFlow, blockUserFlow };
}
