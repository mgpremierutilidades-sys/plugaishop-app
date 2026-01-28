import * as Notifications from "expo-notifications";

export type LocalNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function notifyLocal(payload: LocalNotificationPayload): Promise<void> {
  const { title, body, data } = payload;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
    },
    trigger: null,
  });
}
