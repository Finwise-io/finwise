// PlanSlider — REAL TOUCH PATH pins (B45 founder finding: "the moment you touch it goes to max").
// The accessibility-action path always worked; the bug lived only in the PanResponder handlers,
// which had frozen the track width at its placeholder (1px) on first render. These tests drive the
// actual responder callbacks with real coordinates, so a stale-closure regression fails loudly.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlanSlider } from '../PlanSlider';

function setup(value = 65) {
  const onChange = jest.fn();
  const onSettle = jest.fn();
  const utils = render(
    <PlanSlider label="Retire at" value={value} min={50} max={80} onChange={onChange} onSettle={onSettle} />,
  );
  const strip = utils.getByTestId('plan-slider-strip');
  // the layout event the device fires when the track measures itself
  fireEvent(strip, 'layout', { nativeEvent: { layout: { width: 300, height: 44, x: 0, y: 0 } } });
  return { strip, onChange, onSettle, ...utils };
}

test('touching the MIDDLE of the track selects the middle value — not max (B45)', () => {
  const { strip, onChange } = setup();
  strip.props.onResponderGrant({ nativeEvent: { locationX: 150 }, touchHistory: { touchBank: [] } });
  expect(onChange).toHaveBeenCalledWith(65);           // 50 + (150/300)*30 — the stale-width bug gave 80
  expect(onChange).not.toHaveBeenCalledWith(80);
});

test('dragging sweeps values proportionally and the release SAVES', () => {
  const { strip, onChange, onSettle } = setup();
  strip.props.onResponderGrant({ nativeEvent: { locationX: 30 }, touchHistory: { touchBank: [] } });
  expect(onChange).toHaveBeenLastCalledWith(53);       // 50 + (30/300)*30
  strip.props.onResponderMove({ nativeEvent: { locationX: 290 }, touchHistory: { touchBank: [] } });
  expect(onChange).toHaveBeenLastCalledWith(79);       // 50 + (290/300)*30
  strip.props.onResponderRelease({ nativeEvent: {}, touchHistory: { touchBank: [] } });
  expect(onSettle).toHaveBeenCalled();
});

test('a parent scroll view may NOT steal the drag mid-gesture', () => {
  const { strip } = setup();
  expect(strip.props.onResponderTerminationRequest()).toBe(false);
});

test('edges clamp to min/max instead of overshooting', () => {
  const { strip, onChange } = setup();
  strip.props.onResponderGrant({ nativeEvent: { locationX: -20 }, touchHistory: { touchBank: [] } });
  expect(onChange).toHaveBeenLastCalledWith(50);
  strip.props.onResponderMove({ nativeEvent: { locationX: 9999 }, touchHistory: { touchBank: [] } });
  expect(onChange).toHaveBeenLastCalledWith(80);
});
