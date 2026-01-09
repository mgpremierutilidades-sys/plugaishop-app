import * as Notifications from "expo-notifications";

export type LocalNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/**
 * Handler padrão (Expo SDK mais recente exige shouldShowBanner/shouldShowList também).
 * Chame initNotifications() uma vez no app (ex.: no app/_layout.tsx) se quiser.
 */
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

/**
 * Dispara uma notificação local simples.
 */
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
