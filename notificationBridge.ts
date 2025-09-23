import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

export async function initNotifications(): Promise<void> {
  try { await LocalNotifications.requestPermissions(); } catch {}
}

export async function scheduleNotification(title: string, body: string, at: Date): Promise<void> {
  try {
    const opts: ScheduleOptions = {
      notifications: [{ id: Math.floor(Date.now() % 2147483647), title, body, schedule: { at } }]
    };
    await LocalNotifications.schedule(opts);
  } catch {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification(title, { body });
    }
  }
}
