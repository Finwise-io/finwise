// F-2 (QA-2026-06-18): biometric / device-passcode app lock.
// Wraps `expo-local-authentication` via a guarded require so tsc/jest stay green even when the native
// module isn't installed yet. To activate on-device: `npx expo install expo-local-authentication`.
let LA: any = null;
/* ─ MK-XS-F-132 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * load
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     LA   when LA
 *     LA
 *
 * Called by ... MK-XS-F-034 isLockAvailable · MK-XS-F-035 authenticate
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-035 authenticate · MK-XS-F-072 deleteAccount
 *               MK-XS-F-034 isLockAvailable
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-132
 * Changed ..... not in git yet (—)
 */
function load(): any {
  if (LA) return LA;
  try {
    // Static require (the bundler rejects non-literal require args); guarded for graceful degradation.
    LA = (require as any)('expo-local-authentication');
  } catch {
    LA = null;
  }
  return LA;
}

/** True only when the device has biometric hardware AND the user has enrolled a biometric/passcode. */
/* ─ MK-XS-F-034 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isLockAvailable
 *
 * Answers ..... True only when the device has biometric hardware AND the user has enrolled a biometric/passcode.
 *
 * Formula .....
 *     m = load()
 *     false   when has hardware async is missing
 *     the answer = !!has hw and !!enrolled
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-034
 * Changed ..... 2026-06-19 (fd2e4b0)
 */
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
/* ─ MK-XS-F-035 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * authenticate
 *
 * Answers ..... Prompt for Face ID / Touch ID / device passcode.
 *
 * Formula .....
 *     m = load()
 *     false   when authenticate async is missing
 *     res = await authenticate async({ prompt message: reason, disable device fallback: false })
 *     the answer = !!res.success
 *
 * Called by ... MK-XS-F-072 deleteAccount
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-035
 * Changed ..... 2026-07-13 (762d771)
 */
export async function authenticate(reason = 'Unlock MoneyKeel'): Promise<boolean> {
  const m = load();
  if (!m?.authenticateAsync) return false;
  try {
    const res = await m.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false });
    return !!res?.success;
  } catch {
    return false;
  }
}
