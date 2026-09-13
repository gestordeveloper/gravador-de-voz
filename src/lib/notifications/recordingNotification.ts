import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { formatDuration } from '@/lib/format';

// Importing `expo-notifications` has a side effect (auto push-token registration) that throws
// immediately inside Expo Go on Android, even if nothing here calls a push-related function.
// So this module must never `import` it statically — only lazily, and only outside Expo Go.
type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) {
    return Promise.resolve(null);
  }
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').catch(() => null);
  }
  return notificationsModulePromise;
}

const CHANNEL_ID = 'recording-status';
const NOTIFICATION_ID = 'gravador-recording-status';

let channelReady = false;

async function ensureChannelAsync(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Status da gravação',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    showBadge: false,
  });
  channelReady = true;
}

export async function requestRecordingNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function showRecordingNotification(durationMillis: number, paused: boolean): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  try {
    await ensureChannelAsync(Notifications);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: paused ? 'Gravação pausada' : 'Gravando áudio…',
        body: formatDuration(durationMillis),
        sticky: true,
        autoDismiss: false,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    // Notifications are a nice-to-have here; never block recording because of them.
  }
}

export async function dismissRecordingNotification(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch {
    // Ignore — the notification may already be gone.
  }
}
