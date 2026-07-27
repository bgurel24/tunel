// Faz 0 için basit "yakında" ekran içeriği.

import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useT } from '@/lib/i18n';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { useTabBarPadding } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { font, fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

export function Placeholder({ title, icon, description }: Props) {
  useThemeTick();
  const t = useT();
  const bottomPad = useTabBarPadding();

  return (
    <Screen edges={['top']}>
      <Text style={styles.title}>{title}</Text>
      <View style={{ flex: 1, paddingBottom: bottomPad }}>
        <EmptyState icon={icon} title={t('common.soon')} body={description} />
      </View>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: font.display,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
}));
