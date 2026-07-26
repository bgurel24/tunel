// Son 5 haftanın aktivite ısı haritası — paylaşım yapılan gün yanar.

import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { colors, fontSize, gradientEnd, gradientStart, makeStyles, radius, spacing, useThemeTick } from '@/theme';

const WEEKS = 5;


function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function ActivityHeatmap({ activeDays }: { activeDays: string[] }) {
  useThemeTick();
  const t = useT();
  const { cells, todayKey } = useMemo(() => {
    const active = new Set(activeDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Bu haftanın pazartesisini bul, oradan 4 hafta geriye git.
    const weekday = (today.getDay() + 6) % 7; // Pazartesi = 0
    const start = new Date(today);
    start.setDate(today.getDate() - weekday - (WEEKS - 1) * 7);

    const list = Array.from({ length: WEEKS * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = iso(d);
      return { key, active: active.has(key), future: d > today };
    });

    return { cells: list, todayKey: iso(today) };
  }, [activeDays]);

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        {t('heatmap.days').split(',').map((l: string, i: number) => (
          <Text key={i} style={styles.label}>
            {l}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c) =>
          c.active ? (
            <LinearGradient
              key={c.key}
              colors={[colors.brandFrom, colors.brandTo]}
              start={gradientStart}
              end={gradientEnd}
              style={[styles.cell, c.key === todayKey && styles.today]}
            />
          ) : (
            <View
              key={c.key}
              style={[
                styles.cell,
                c.future ? styles.futureCell : styles.emptyCell,
                c.key === todayKey && styles.today,
              ]}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = makeStyles((colors) => ({
  wrap: { gap: 6 },
  labels: { flexDirection: 'row', flexWrap: 'wrap' },
  label: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs },
  cell: {
    width: '12.2%',
    aspectRatio: 1,
    marginHorizontal: '1%',
    borderRadius: radius.sm,
  },
  emptyCell: { backgroundColor: colors.surface2 },
  futureCell: { backgroundColor: colors.surface, opacity: 0.5 },
  today: { borderWidth: 1.5, borderColor: colors.text },
}));
