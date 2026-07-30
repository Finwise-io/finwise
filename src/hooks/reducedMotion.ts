// Build-47 walk row 20 (audit UX #17): honor the phone's Reduce Motion setting. The app's motion
// surface is its sliding sheets/modals — when the user asked their phone for less motion, sheets
// appear without the slide. The flag is cached at module level and tracks the OS setting live;
// each modal reads it at open time via modalAnimation().
import { AccessibilityInfo } from 'react-native';

let reduce = false;
try {
  AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduce = !!v; }).catch(() => {});
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduce = !!v; });
} catch { /* older RN test environments */ }

export const prefersReducedMotion = () => reduce;
export const modalAnimation = (): 'slide' | 'none' => (reduce ? 'none' : 'slide');
/** test seam */
export const __setReducedMotionForTesting = (v: boolean) => { reduce = v; };
