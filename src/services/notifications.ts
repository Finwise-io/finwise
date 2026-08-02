import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false; // won't work in simulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule daily streak reminder ─────────────────────────────────
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
export async function cancelStreakReminder() {
  await Notifications.cancelScheduledNotificationAsync('streak-reminder');
}

// ── Required-withdrawal reminders (FCC Plan r48/r51 — logistics only, no timing advice) ──
/** November 1 nudge ahead of the Dec 31 deadline (this year or a future start year). */
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
export async function scheduleWeeklySummary() {
  await Notifications.cancelScheduledNotificationAsync('weekly-summary');

  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: '📊 Your weekly summary is ready',
      body: 'See how your spending tracked this week and get personalized tips.',
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
