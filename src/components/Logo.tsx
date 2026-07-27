// Tünel logosu — react-native-svg. Portal + segmentler + top + perspektif yol.
// showWordmark ile altına gradyan "TÜNEL" + "TUNNEL VISION" alt başlığı gelir.

import Svg, {
  Defs,
  Ellipse,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { View } from 'react-native';

import { colors, font, makeStyles, useThemeTick } from '@/theme';

type Props = {
  size?: number;
  showWordmark?: boolean;
};

const MARK_W = 280;
const MARK_H = 345;

export function Logo({ size = 150, showWordmark = true }: Props) {
  useThemeTick();
  const markHeight = (size * MARK_H) / MARK_W;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={markHeight} viewBox="60 40 280 345">
        <Defs>
          <LinearGradient id="tg" x1="0.12" y1="0.05" x2="0.9" y2="1">
            <Stop offset="0" stopColor={colors.brandFrom} />
            <Stop offset="0.5" stopColor={colors.brandMid} />
            <Stop offset="1" stopColor={colors.brandTo} />
          </LinearGradient>
        </Defs>

        {/* Portal + segmentler + yol (gradyan) */}
        <Path
          d="M88 366 L88 176 A112 112 0 0 1 312 176 L312 366"
          fill="none"
          stroke="url(#tg)"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M126 366 L126 186 A74 74 0 0 1 274 186 L274 366"
          fill="none"
          stroke="url(#tg)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[
          [271.4, 154, 306.2, 141.4],
          [243.6, 117.8, 264.8, 87.5],
          [200, 104, 200, 67],
          [156.4, 117.8, 135.2, 87.5],
          [128.6, 154, 93.8, 141.4],
          [88, 252, 126, 252],
          [88, 312, 126, 312],
          [274, 252, 312, 252],
          [274, 312, 312, 312],
        ].map(([x1, y1, x2, y2], i) => (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#tg)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        ))}
        {/* Yol */}
        <Line x1={190} y1={242} x2={150} y2={362} stroke="url(#tg)" strokeWidth={3.2} strokeLinecap="round" />
        <Line x1={210} y1={242} x2={250} y2={362} stroke="url(#tg)" strokeWidth={3.2} strokeLinecap="round" />
        <Line
          x1={200}
          y1={246}
          x2={200}
          y2={362}
          stroke="url(#tg)"
          strokeWidth={3.4}
          strokeDasharray="7 12"
          strokeLinecap="round"
        />

        {/* Amerikan futbolu topu (beyaz) — top yatay durduğu için bağcık şeridi de
            yatay uzanır, dikişler şeridi dik keser. */}
        <Ellipse cx={200} cy={214} rx={34} ry={20} fill="none" stroke={colors.text} strokeWidth={3} />
        <Line x1={184} y1={214} x2={216} y2={214} stroke={colors.text} strokeWidth={3} strokeLinecap="round" />
        {[188, 196, 204, 212].map((x) => (
          <Line key={x} x1={x} y1={207} x2={x} y2={221} stroke={colors.text} strokeWidth={3} strokeLinecap="round" />
        ))}
        <Line x1={176} y1={208} x2={176} y2={220} stroke={colors.text} strokeWidth={3} strokeLinecap="round" />
        <Line x1={224} y1={208} x2={224} y2={220} stroke={colors.text} strokeWidth={3} strokeLinecap="round" />
      </Svg>

      {showWordmark && (
        <Svg width={size} height={size * 0.34} viewBox="0 0 280 96">
          <Defs>
            <LinearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.brandFrom} />
              <Stop offset="1" stopColor={colors.brandTo} />
            </LinearGradient>
          </Defs>
          <SvgText
            x="140"
            y="52"
            fontSize="44"
            fontFamily={font.displayBold}
            letterSpacing="6"
            textAnchor="middle"
            fill="url(#wg)"
          >
            TÜNEL
          </SvgText>
          <SvgText
            x="140"
            y="80"
            fontSize="13"
            fontFamily={font.bodyMedium}
            letterSpacing="7"
            textAnchor="middle"
            fill={colors.textDim}
          >
            TUNNEL VISION
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

const styles = makeStyles(() => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
