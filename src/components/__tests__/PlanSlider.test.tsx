// PlanSlider — REAL TOUCH PATH pins.
// B45 founder finding: "the moment you touch it goes to max" — stale track width in the handlers.
// B46 founder finding: "slider still not moving" ON DEVICE with tests green — two causes the
// simulated events couldn't see: the parent ScrollView's native recognizer cancelling the drag,
// and mid-drag locationX going stale. The component now (1) claims the touch at capture,
// (2) asks the parent to disable scrolling while a finger is down (onDraggingChange), and
// (3) drives every move from page-absolute coordinates anchored at grant. These tests pin all
// three — and the WhatIf screen test pins the ScrollView actually standing down.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlanSlider } from '../PlanSlider';

function setup(value = 65) {
  const onChange = jest.fn();
  const onSettle = jest.fn();
  const onDraggingChange = jest.fn();
  const utils = render(
    <PlanSlider label="Retire at" value={value} min={50} max={80}
      onChange={onChange} onSettle={onSettle} onDraggingChange={onDraggingChange} />,
  );
  const strip = utils.getByTestId('plan-slider-strip');
  // the layout event the device fires when the track measures itself
  fireEvent(strip, 'layout', { nativeEvent: { layout: { width: 300, height: 44, x: 0, y: 0 } } });
  return { strip, onChange, onSettle, onDraggingChange, ...utils };
}

// the strip sits 100pt from the screen's left edge in these fixtures
// PanResponder skips a move whose touchHistory timestamp it has already accounted for — every
// fired move needs a FRESH mostRecentTimeStamp or only the first one reaches the handler.
let tick = 0;
const grant = (locationX: number) => ({ nativeEvent: { locationX, pageX: 100 + locationX }, touchHistory: { touchBank: [], mostRecentTimeStamp: ++tick } });
const move = (pageX: number) => ({ nativeEvent: { pageX }, touchHistory: { touchBank: [], mostRecentTimeStamp: ++tick } });

test('touching the MIDDLE of the track selects the middle value — not max (B45)', () => {
  const { strip, onChange } = setup();
  strip.props.onResponderGrant(grant(150));
  expect(onChange).toHaveBeenCalledWith(65);           // 50 + (150/300)*30 — the stale-width bug gave 80
  expect(onChange).not.toHaveBeenCalledWith(80);
});

test('dragging tracks PAGE-absolute coordinates and the release SAVES (B46)', () => {
  const { strip, onChange, onSettle } = setup();
  strip.props.onResponderGrant(grant(30));             // anchor: strip starts at pageX 100
  expect(onChange).toHaveBeenLastCalledWith(53);       // 50 + (30/300)*30
  strip.props.onResponderMove(move(390));              // finger at pageX 390 → x = 290
  expect(onChange).toHaveBeenLastCalledWith(79);       // 50 + (290/300)*30
  strip.props.onResponderMove(move(100));              // back to the strip's left edge → min
  expect(onChange).toHaveBeenLastCalledWith(50);
  strip.props.onResponderRelease({ nativeEvent: {}, touchHistory: { touchBank: [] } });
  expect(onSettle).toHaveBeenCalled();
});

test('the touch is claimed at CAPTURE and a parent may not steal the drag (B46)', () => {
  const { strip } = setup();
  expect(strip.props.onStartShouldSetResponderCapture({ nativeEvent: { touches: [], changedTouches: [] }, touchHistory: { touchBank: [], mostRecentTimeStamp: 99 } })).toBe(true);
  expect(strip.props.onResponderTerminationRequest()).toBe(false);
});

test('the parent is told to stand down for the drag, and released after — even on terminate (B46)', () => {
  const { strip, onDraggingChange, onSettle } = setup();
  strip.props.onResponderGrant(grant(150));
  expect(onDraggingChange).toHaveBeenLastCalledWith(true);
  strip.props.onResponderRelease({ nativeEvent: {}, touchHistory: { touchBank: [] } });
  expect(onDraggingChange).toHaveBeenLastCalledWith(false);
  // a terminated (cancelled) drag must ALSO re-enable scrolling and still save
  strip.props.onResponderGrant(grant(150));
  expect(onDraggingChange).toHaveBeenLastCalledWith(true);
  strip.props.onResponderTerminate({ nativeEvent: {}, touchHistory: { touchBank: [] } });
  expect(onDraggingChange).toHaveBeenLastCalledWith(false);
  expect(onSettle).toHaveBeenCalled();
});

test('edges clamp to min/max instead of overshooting', () => {
  const { strip, onChange } = setup();
  strip.props.onResponderGrant(grant(-20));
  expect(onChange).toHaveBeenLastCalledWith(50);
  strip.props.onResponderMove(move(99999));
  expect(onChange).toHaveBeenLastCalledWith(80);
});
