// Marka gradyanlı ana buton. Yükleme durumunda spinner gösterir.

import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { colors, fontSize, gradientColors, gradientEnd, gradientStart, makeStyles, radius, useThemeTick } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GradientButton({ label, onPress, loading, disabled, style }: Props) {
  useThemeTick();
  const inactive = disabled || loading;
  return (
    <Touchable
      onPress={onPress}
      disabled={inactive}
      scaleTo={0.97}
      style={[styles.pressable, { opacity: inactive ? 0.55 : 1 }, style]}
    >
      <LinearGradient
        colors={gradientColors}
        start={gradientStart}
        end={gradientEnd}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </Touchable>
  );
}

// İkincil (çerçeveli) buton.
export function OutlineButton({ label, onPress, style }: Props) {
  useThemeTick();
  return (
    <Touchable onPress={onPress} scaleTo={0.97} style={[styles.outline, style]}>
      <View>
        <Text style={styles.outlineLabel}>{label}</Text>
      </View>
    </Touchable>
  );
}

const styles = makeStyles((colors) => ({
  pressable: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  outline: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
}));
