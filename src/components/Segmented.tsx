// İki/üç seçenekli geçiş — seçili sekmenin altındaki hap kayarak gelir.

import { Haptics } from '@/lib/haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

type Option<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PAD = 3;

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(options.findIndex((o) => o.key === value), 0);
  const itemWidth = width ? (width - PAD * 2) / options.length : 0;

  const pill = useAnimatedStyle(() => ({
    width: itemWidth,
    transform: [{ translateX: withSpring(index * itemWidth, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {itemWidth > 0 && <Animated.View style={[styles.pill, pill]} />}

      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={styles.segment}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync();
                onChange(o.key);
              }
            }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = makeStyles((colors) => ({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: PAD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineSoft,
  },
  pill: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    bottom: PAD,
    backgroundColor: colors.surface3,
    borderRadius: radius.sm,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  label: { color: colors.textDim, fontSize: fontSize.sm },
  labelActive: { color: colors.text, fontWeight: '600' },
}));
