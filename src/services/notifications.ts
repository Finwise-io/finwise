import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground.
// DESKTOP Phase 1: guarded — on web this module-top call can throw at import time; scheduled
// phone-style reminders wait for the installable app (plan Phase 4).
if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/* ─ MK-XS-F-084 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * requestNotificationPermission
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     false   when device.is device is missing
 *     true   when existing = 'granted'
 *     status = 'granted'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-084
 * Changed ..... 2026-05-21 (e39fbd7)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false; // won't work in simulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule daily streak reminder ─────────────────────────────────
/* ─ MK-XS-F-085 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * scheduleStreakReminder
 *
 * Answers ..... ── Schedule daily streak reminder ─────────────────────────────────
 *
 * Formula .....
 *     cancels the existing reminder, then schedules a daily one at 20:00
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-085
 * Changed ..... 2026-07-13 (762d771)
 */
export async function scheduleStreakReminder() {
  await Notifications.cancelScheduledNotificationAsync('streak-reminder');

  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-reminder',
    content: {
      title: '🔥 Keep your streak alive!',
      body: 'Log one entry today to keep your MoneyKeel streak going.',
      data: { screen: 'home' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,   // 8pm
      minute: 0,
    },
  });
}

// ── Cancel streak reminder (e.g. user already checked in) ──────────
/* ─ MK-XS-F-086 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * cancelStreakReminder
 *
 * Answers ..... ── Cancel streak reminder (e.g.
 *
 * Formula .....
 *     cancels the daily reminder
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-086
 * Changed ..... 2026-07-14 (63edc6b)
 */
export async function cancelStreakReminder() {
  await Notifications.cancelScheduledNotificationAsync('streak-reminder');
}

// ── Required-withdrawal reminders (FCC Plan r48/r51 — logistics only, no timing advice) ──
/** November 1 nudge ahead of the Dec 31 deadline (this year or a future start year). */
/* ─ MK-XS-F-087 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * scheduleRmdReminder
 *
 * Answers ..... ── Required-withdrawal reminders (FCC Plan r48/r51 — logistics only, no timing advice) ── November 1 nudge ahead of the Dec 31 deadline (this year or a future start year).
 *
 * Formula .....
 *     id = `rmd − reminder-${year}`
 *     fire at = the date year, 10, 1, 10, 0, 0
 *     false   when fire at.get time() ≤ date.now()
 *     the answer = true
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-087
 * Changed ..... 2026-07-14 (63edc6b)
 */
export async function scheduleRmdReminder(year: number) {
  const id = `rmd-reminder-${year}`;
  await Notifications.cancelScheduledNotificationAsync(id);
  const fireAt = new Date(year, 10, 1, 10, 0, 0);           // Nov 1, 10:00
  if (fireAt.getTime() <= Date.now()) return false;          // never schedule the past
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Required withdrawal — deadline Dec 31',
      body: `Your ${year} required withdrawal from pre-tax retirement accounts is due by Dec 31.`,
      data: { screen: 'required-withdrawals' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
  return true;
}

// ── Budget alert (fire immediately) ────────────────────────────────
/* ─ MK-XS-F-088 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sendBudgetAlert
 *
 * Answers ..... ── Budget alert (fire immediately) ────────────────────────────────
 *
 * Formula .....
 *     sends one alert now: '<category> budget at <round(pct)>%'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-088
 * Changed ..... 2026-05-21 (e39fbd7)
 */
export async function sendBudgetAlert(category: string, pct: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ ${category} budget at ${Math.round(pct)}%`,
      body: `You're getting close to your ${category} limit this month. Tap to see tips.`,
      data: { screen: 'tips' },
    },
    trigger: null, // send immediately
  });
}

// ── Weekly summary notification ────────────────────────────────────
/* ─ MK-XS-F-089 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * scheduleWeeklySummary
 *
 * Answers ..... ── Weekly summary notification ────────────────────────────────────
 *
 * Formula .....
 *     cancels the existing summary, then schedules a weekly one on Monday at 09:00
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-089
 * Changed ..... 2026-05-21 (e39fbd7)
 */
export async function scheduleWeeklySummary() {
  await Notifications.cancelScheduledNotificationAsync('weekly-summary');

  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: '📊 Your weekly summary is ready',
      body: 'See how your expenses tracked this week and get personalized tips.',
      data: { screen: 'budget' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,  // Monday
      hour: 9,
      minute: 0,
    },
  });
}

// ── Listen for notification taps ───────────────────────────────────
/* ─ MK-XS-F-090 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * addNotificationResponseListener
 *
 * Answers ..... ── Listen for notification taps ───────────────────────────────────
 *
 * Formula .....
 *     screen = response.notification.request.content.data.screen as string
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-090
 * Changed ..... 2026-08-02 (459ef30)
 */
export function addNotificationResponseListener(
  onNavigate: (screen: string) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const screen = response.notification.request.content.data?.screen as string;
    if (screen) onNavigate(screen);
  });
}

// ── Social Security claim-window reminder (design r18, built pre-48 per founder decision) ──
/** Fires the month the claim window opens (their 62nd-birthday month), 10:00 on the 1st. */
/* ─ MK-XS-F-091 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * scheduleSsWindowReminder
 *
 * Answers ..... ── Social Security claim-window reminder (design r18, built pre-48 per founder decision) ── Fires the month the claim window opens (their 62nd-birthday month), 10:00 on the 1st.
 *
 * Formula .....
 *     id = 'ss − window − reminder'
 *     fire at = the date opens year, opens month1 − 1, 1, 10, 0, 0
 *     false   when fire at.get time() ≤ date.now()
 *     the answer = true
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-091
 * Changed ..... 2026-08-02 (459ef30)
 */
export async function scheduleSsWindowReminder(opensYear: number, opensMonth1: number) {
  const id = 'ss-window-reminder';
  await Notifications.cancelScheduledNotificationAsync(id);
  const fireAt = new Date(opensYear, opensMonth1 - 1, 1, 10, 0, 0);
  if (fireAt.getTime() <= Date.now()) return false;          // window already open — nothing to schedule
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Your Social Security claim window is open',
      body: 'You can claim any time from now to 70 — each year you wait raises the check. The app lays out your options in your own dollars.',
    },
    trigger: { date: fireAt } as any,
  });
  return true;
}
