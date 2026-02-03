// utils/notifications.ts
/**
 * Notificações locais (no-op quando expo-notifications não estiver instalado)
 *
 * Objetivo:
 * - Compilar no CI/dev mesmo sem o pacote.
 * - Manter API estável para telas/hooks.
 */
export type LocalNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpoNotificationsModule = any;

function tryLoadExpoNotifications(): ExpoNotificationsModule | null {
  try {
    // Evita erro de typecheck quando o pacote não existe
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-notifications");
    return mod;
  } catch {
    return null;
  }
}

export function initNotifications() {
  const Notifications = tryLoadExpoNotifications();
  if (!Notifications?.setNotificationHandler) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  });
}

export async function notifyLocal(payload: LocalNotificationPayload): Promise<void> {
  const Notifications = tryLoadExpoNotifications();
  if (!Notifications?.scheduleNotificationAsync) return;

  const { title, body, data } = payload;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {}
    },
    trigger: null
  });
}
