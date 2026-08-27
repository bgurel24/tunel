// Ağırlık ilerleme grafiği — PR kayıtlarını kronolojik çizgi olarak çizer.
// Marka gradyanlı çizgi + yumuşak dolgu; en iyi kayıt vurgulu nokta.

import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/Text';
import { colors, fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

const HEIGHT = 96;
const PAD = 8;

// Aynı ekranda birden çok grafik olabilir — gradient id'leri çakışmasın.
let seq = 0;

type Props = {
  /** Kronolojik (eskiden yeniye) ağırlık değerleri. */
  values: number[];
  /** Sol uç etiketi (ilk kaydın tarihi). */
  startLabel: string;
  /** Sağ uç etiketi (son kaydın tarihi). */
  endLabel: string;
};

export function ProgressChart({ values, startLabel, endLabel }: Props) {
  useThemeTick();
  const [width, setWidth] = useState(0);
  const [uid] = useState(() => `prchart${seq++}`);

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const pts =
    width > 0
      ? values.map((v, i) => ({
          x: PAD + (i * (width - PAD * 2)) / (values.length - 1),
          y: PAD + (1 - (v - min) / span) * (HEIGHT - PAD * 2),
        }))
      : [];

  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const area = pts.length
    ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${HEIGHT} L${pts[0].x.toFixed(1)} ${HEIGHT} Z`
    : '';
  const bestIdx = values.indexOf(max);

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.brandFrom} />
              <Stop offset="1" stopColor={colors.brandTo} />
            </LinearGradient>
            <LinearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brandTo} stopOpacity="0.22" />
              <Stop offset="1" stopColor={colors.brandTo} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${uid}-fill)`} />
          <Path
            d={line}
            stroke={`url(#${uid}-line)`}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === bestIdx ? 4 : 2.5}
              fill={i === bestIdx ? colors.accent : colors.surface}
              stroke={colors.accent}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      )}
      <View style={styles.labels}>
        <Text style={styles.label}>{startLabel}</Text>
        <Text style={styles.label}>{endLabel}</Text>
      </View>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  wrap: { marginTop: spacing.md },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { color: colors.textFaint, fontSize: fontSize.xs },
}));
