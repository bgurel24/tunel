// Keşfet — henüz yapılmadı; konum bazlı akış buraya gelecek.

import { Placeholder } from '@/components/Placeholder';
import { useT } from '@/lib/i18n';

export default function KesfetScreen() {
  const t = useT();
  return (
    <Placeholder
      title={t('explore.title')}
      icon="search-outline"
      description={t('explore.body')}
    />
  );
}
