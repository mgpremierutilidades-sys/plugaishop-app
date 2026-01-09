// utils/notifications.ts
import * as Notifications from "expo-notifications";

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      // exigidos pelo tipo novo do expo-notifications:
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function notifyLocal(title: string, body: string, data?: Record<string, any>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
    },
    trigger: null,
  });
}
