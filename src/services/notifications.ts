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
      body: 'Log one entry today to keep your FinWise streak going.',
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
