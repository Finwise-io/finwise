// The ONE slider drag engine (B46 "slider still not moving" + B47 finding 12, both ON DEVICE with
// tests green). Every slider must: claim the touch in the CAPTURE phase, refuse termination, block
// the native responder, anchor at grant via pageX − locationX (locationX goes stale mid-drag), and
// tell its host ScrollView to stop scrolling for the drag. Simulated touches never involve the
// native recognizers — which is exactly how the same bug shipped twice (What-if, then Scenario
// analysis). One engine so there is no third time.
import { useRef } from 'react';
import { PanResponder } from 'react-native';

export function useSliderPan(opts: {
  onRatio: (r: number) => void;                     // 0..1 across the strip, live during the drag
  onDraggingChange?: (dragging: boolean) => void;   // host disables its ScrollView while true
  onSettle?: () => void;                            // finger up (or terminated) — the save moment
}) {
  const trackW = useRef(1);
  const stripPageX = useRef(0);
  // PanResponder.create runs ONCE — handlers must never close over render-time values (B45)
  const api = useRef(opts);
  api.current = opts;
  const ratioAt = (x: number) => Math.min(1, Math.max(0, x / Math.max(1, trackW.current)));
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponderCapture: () => true,
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (e) => {
      stripPageX.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
      api.current.onDraggingChange?.(true);
      api.current.onRatio(ratioAt(e.nativeEvent.locationX));
    },
    onPanResponderMove: (e) => api.current.onRatio(ratioAt(e.nativeEvent.pageX - stripPageX.current)),
    onPanResponderRelease: () => { api.current.onDraggingChange?.(false); api.current.onSettle?.(); },
    onPanResponderTerminate: () => { api.current.onDraggingChange?.(false); api.current.onSettle?.(); },
  })).current;
  return { panHandlers: pan.panHandlers, setTrackWidth: (w: number) => { trackW.current = Math.max(1, w); } };
}
