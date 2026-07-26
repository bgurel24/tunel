// Marka gradyanlı ana buton. Yükleme durumunda spinner gösterir.

import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/Text';
import { colors, fontSize, gradientColors, gradientEnd, gradientStart, radius, } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GradientButton({ label, onPress, loading, disabled, style }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.pressable,
        { opacity: inactive ? 0.55 : pressed ? 0.9 : 1 },
        style,
      ]}
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
    </Pressable>
  );
}

// İkincil (çerçeveli) buton.
export function OutlineButton({ label, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.outline, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <View>
        <Text style={styles.outlineLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
