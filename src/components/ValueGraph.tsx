/** THE VALUE LINE WITH A Y AXIS — one graph, one definition (2026-10-01).
 *
 *  Mock v14 mark 11: a rising line with no figures beside it can mean $20 or $20,000, so four dollar
 *  gridlines say which. Every point comes from the daily record, so the line starts where the record
 *  starts and not a day earlier.
 *
 *  It lived inside PerformanceScreen. The Account portfolio screen (his DEC-0646, built to Performance
 *  v17 frame 2) draws the same line for one account, and a second copy of the graph would be a second
 *  place for the two to disagree — so it moved here and both screens ask for it.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { Colors, Spacing } from '../utils/theme';
import { maskedMoney } from './useMoney';

export function ValueGraph({ points, dayOneNote }: { points: { date: string; value: number }[]; dayOneNote?: string }) {
  const [w, setW] = useState(0);
  if (points.length < 2) return null;
  const H = 120, padTop = 10, padBot = 16, gutter = 52;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const ticks = niceTicks(lo, hi, 4);
  const top = ticks[0], bottom = ticks[ticks.length - 1];
  const y = (v: number) => padTop + (1 - (v - bottom) / ((top - bottom) || 1)) * (H - padTop - padBot);
  const x = (i: number) => gutter + (i / (points.length - 1 || 1)) * ((w || 1) - gutter - 4);
  const path = 'M ' + points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' L ');
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ paddingHorizontal: Spacing.base, paddingBottom: 10 }}>
      {w > 0 && (
        <>
          <Svg width={w} height={H}>
            {ticks.map((t) => (
              <React.Fragment key={t}>
                <Line x1={gutter} y1={y(t)} x2={w} y2={y(t)} stroke={Colors.border} strokeWidth={1} />
                <SvgText x={0} y={y(t) + 3} fontSize={11} fill={Colors.textTertiary}>{maskedMoney(t)}</SvgText>
              </React.Fragment>
            ))}
            <Path d={path} stroke={Colors.primary} strokeWidth={2.5} fill="none" />
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: gutter }}>
            <Text style={s.axisDay}>{day(points[0].date)}</Text>
            {points.length > 1 ? (
              <Text style={s.axisDay}>{day(points[points.length - 1].date)}</Text>
            ) : !!dayOneNote && <Text style={s.axisDay}>{dayOneNote}</Text>}
          </View>
        </>
      )}
    </View>
  );
}

/** Four round-number gridlines that bracket the line — never a tick at $23,417. */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  if (!(hi > lo)) { const v = Math.round(hi); return [v + 1, v, v - 1].slice(0, count); }
  const rawStep = (hi - lo) / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= rawStep) ?? 10 * mag;
  const bottom = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(Math.round(bottom + i * step));
  return out;
}

const s = StyleSheet.create({
  axisDay: { fontSize: 11, color: Colors.textSecondary },
});
