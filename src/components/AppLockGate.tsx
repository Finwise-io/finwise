// F-2 (QA-2026-06-18): gates the app behind a biometric / passcode lock when the user has enabled it.
// Locks on cold start and whenever the app returns to the foreground after being backgrounded longer
// than INACTIVITY_MS. A no-op pass-through when the lock is disabled (the default).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useStore } from '../store/useStore';
import { isLockAvailable, authenticate } from '../services/appLock';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

const INACTIVITY_MS = 2 * 60 * 1000; // re-lock after 2 minutes in the background

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const enabled = useStore((s: any) => s.appLockEnabled) ?? false;
  const [locked, setLocked] = useState<boolean>(enabled);
  const [busy, setBusy] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const tryUnlock = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await authenticate('Unlock MoneyKeel');
    setBusy(false);
    if (ok) setLocked(false);
  };

  // Cold start: lock immediately if enabled and the device can actually authenticate.
  useEffect(() => {
    if (!enabled) { setLocked(false); return; }
    (async () => {
      if (await isLockAvailable()) { setLocked(true); tryUnlock(); }
      else setLocked(false); // fail-open if the user has no biometric/passcode enrolled (don't trap them)
    })();
  }, [enabled]);

  // Re-lock on resume after an inactivity window.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
      } else if (next === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabled && since != null && Date.now() - since > INACTIVITY_MS) setLocked(true);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled]);

  if (!enabled || !locked) return <>{children}</>;

  return (
    <View style={styles.overlay} accessibilityRole="alert" accessibilityLabel="MoneyKeel is locked">
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>MoneyKeel is locked</Text>
      <Text style={styles.sub}>Unlock with Face ID, Touch ID, or your passcode to continue.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={tryUnlock}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Unlock MoneyKeel"
        accessibilityHint="Prompts for Face ID, Touch ID, or your device passcode"
      >
        <Text style={styles.buttonText}>{busy ? 'Unlocking…' : 'Unlock'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bgSecondary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, zIndex: 9999 },
  emoji: { fontSize: 38, marginBottom: Spacing.md },
  title: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  button: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.pill, minWidth: 160, alignItems: 'center' },
  buttonText: { color: Colors.white, fontWeight: '700', fontSize: Typography.sizes.md },
});
