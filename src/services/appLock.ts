// F-2 (QA-2026-06-18): biometric / device-passcode app lock.
// Wraps `expo-local-authentication` via a guarded require so tsc/jest stay green even when the native
// module isn't installed yet. To activate on-device: `npx expo install expo-local-authentication`.
let LA: any = null;
function load(): any {
  if (LA) return LA;
  try {
    LA = (require as any)(['expo', 'local-authentication'].join('-'));
  } catch {
    LA = null;
  }
  return LA;
}

/** True only when the device has biometric hardware AND the user has enrolled a biometric/passcode. */
export async function isLockAvailable(): Promise<boolean> {
  const m = load();
  if (!m?.hasHardwareAsync) return false;
  try {
    const [hasHw, enrolled] = await Promise.all([m.hasHardwareAsync(), m.isEnrolledAsync()]);
    return !!hasHw && !!enrolled;
  } catch {
    return false;
  }
}

/** Prompt for Face ID / Touch ID / device passcode. Returns true on success. */
export async function authenticate(reason = 'Unlock FinWise'): Promise<boolean> {
  const m = load();
  if (!m?.authenticateAsync) return false;
  try {
    const res = await m.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false });
    return !!res?.success;
  } catch {
    return false;
  }
}
