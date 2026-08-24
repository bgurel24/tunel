// Bildirim köprüsü — oturum açıkken push token'ını kaydeder ve kendi
// bildirimlerimi canlı dinler. Görsel çıktısı yok; kökte bir kez asılı durur.

import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { registerPushToken, subscribeToNotifications } from '@/lib/notifications';

export function NotificationBridge() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    // Expo Go'da token alınamaz — sessizce geçilir, gelen kutusu yine çalışır.
    registerPushToken().catch(() => {});
    return subscribeToNotifications(userId);
  }, [userId]);

  return null;
}
