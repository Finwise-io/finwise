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
import { dateShown } from '../domain/_shared/dates';

export function ValueGraph({ points, dayOneNote, dayOneValue, today }: {
  points: { date: string; value: number }[];
  /** DAY ONE (Performance v17, phones 4 and 5): no line yet, so the frame says where it will start —
   *  today's value on the axis, the note in the middle, today's date at both ends. It used to draw
   *  nothing at all with fewer than two points, so the note could never appear. */
  /** today's value ALREADY PRINTED by the screen with its identifier — the graph prints no figure of its own */
  dayOneNote?: string; dayOneValue?: string; today?: string;
}) {
  const [w, setW] = useState(0);
  if (points.length < 2) {
    if (!dayOneNote) return null;
    const d = today ? new Date(`${today}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return (
      <View style={{ paddingHorizontal: Spacing.base, paddingBottom: 10 }}>
        {/* inside the frame the words are the chart's own labels, in the tertiary grey the gridline figures use
            (v17 phones 4 and 5, .axlab); the dates under it stay secondary. Drawing check, 2026-10-12 */}
        <View style={s.dayOneFrame}>
          <Text style={[s.axisDay, { color: Colors.textTertiary }]}>{dayOneValue ?? ''}</Text>
          <View style={s.dayOneLine} />
          <Text style={[s.axisDay, { color: Colors.textTertiary }]}>{dayOneNote}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 52 }}>
          <Text style={s.axisDay}>{d}</Text>
          <Text style={s.axisDay}>{d}</Text>
        </View>
      </View>
    );
  }
  const H = 120, padTop = 10, padBot = 16, gutter = 52;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const ticks = niceTicks(lo, hi, 4);
  const top = ticks[0], bottom = ticks[ticks.length - 1];
  const y = (v: number) => padTop + (1 - (v - bottom) / ((top - bottom) || 1)) * (H - padTop - padBot);
  const x = (i: number) => gutter + (i / (points.length - 1 || 1)) * ((w || 1) - gutter - 4);
  const path = 'M ' + points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' L ');
  // A LINE LONGER THAN A YEAR NAMES THE YEAR AT BOTH ENDS (Performance v17: phone 3's 26-month line reads "Jun 3, 2024"
  // and "Aug 4, 2026"; phone 1's year-long line reads "Oct 1" and "Sep 30"). Without it, "Jun 3 … Aug 4" over 26
  // months reads as two months. Found by the drawing check of 2026-10-12.
  const longerThanAYear = points.length > 1
    && Date.parse(`${points[points.length - 1].date}T12:00:00`) - Date.parse(`${points[0].date}T12:00:00`) > 366 * 86_400_000;
  const day = (iso: string) => (longerThanAYear ? dateShown(iso)
    : new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
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

/** Four round-number gridlines that bracket the line — never a tick at $23,417.
 *  THEY MUST REACH THE TOP OF THE LINE (drawing check, 2026-10-12). Rounding the bottom down could leave the top
 *  gridline under the highest value: $38,000 to $52,704 gave $35,000 … $50,000, and the line ran off the top of its
 *  own chart. The step now grows until the four lines hold the whole line: $30,000 … $60,000. */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  if (!(hi > lo)) { const v = Math.round(hi); return [v + 1, v, v - 1].slice(0, count); }
  const rawStep = (hi - lo) / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map((m) => m * mag).filter((c) => c >= rawStep);
  const step = steps.find((c) => Math.floor(lo / c) * c + (count - 1) * c >= hi) ?? steps[steps.length - 1];
  const bottom = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(Math.round(bottom + i * step));
  return out;
}

const s = StyleSheet.create({
  axisDay: { fontSize: 11, color: Colors.textSecondary },
  dayOneFrame: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayOneLine: { flex: 1, height: 1, backgroundColor: Colors.border },
});
