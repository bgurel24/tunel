// Koyu güvenli-alan ekran sarmalayıcı. Tüm ekranların ortak zemini.

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, makeStyles, spacing, themeInfo, useThemeTick } from '@/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  padded?: boolean;
};

export function Screen({ children, style, edges = ['top', 'bottom'], padded = true }: Props) {
  useThemeTick();
  return (
    <View style={styles.root}>
      <StatusBar style={themeInfo.statusBar} />
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={[styles.fill, padded && styles.padded, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.xl,
  },
}));
