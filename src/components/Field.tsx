// Temalı metin girişi (etiket + input).

import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fontSize, radius, spacing } from '@/theme';

type Props = TextInputProps & {
  label: string;
};

export function Field({ label, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          { borderColor: focused ? colors.magenta : colors.line },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSize.md,
  },
});
