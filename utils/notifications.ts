// utils/notifications.ts
import Constants from "expo-constants";
import { Platform } from "react-native";

type Cleanup = () => void;

/**
 * Inicializa push notifications sem travar o app:
 * - Não roda no Expo Go (SDK 53 limita push remoto no Android dentro do Expo Go)
 * - Nunca bloqueia render
 * - Sempre remove listeners no cleanup
 */
export function initPushNotificationsSafe(): Cleanup {
  let removeReceived: Cleanup | null = null;
  let removeResponse: Cleanup | null = null;

  // Expo Go (appOwnership === "expo") não é ambiente confiável para push remoto.
  const isExpoGo = Constants.appOwnership === "expo";

  // Se quiser permitir no iOS mesmo em Expo Go, altere a condição.
  // Aqui a prioridade é “destravar e estabilizar”.
  if (isExpoGo) {
    return () => {};
  }

  // Rodar async sem travar o boot
  (async () => {
    try {
      const Notifications = await import("expo-notifications");

      // Handler padrão (evita comportamento inesperado)
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // Permissões
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== "granted") return;
      }

      // Token (só faz sentido em build apropriado)
      // Em alguns setups, getExpoPushTokenAsync exige projectId.
      // Deixe silencioso e sem travar.
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          (Constants as any).easConfig?.projectId;

        if (projectId) {
          await Notifications.getExpoPushTokenAsync({ projectId });
        } else {
          await Notifications.getExpoPushTokenAsync();
        }
      } catch {
        // não travar app por token
      }

      // Listener recebido
      const receivedSub = Notifications.addNotificationReceivedListener(() => {
        // Opcional: registrar/logar
      });
      removeReceived = () => receivedSub.remove();

      // Listener de interação (toque)
      const responseSub =
        Notifications.addNotificationResponseReceivedListener(() => {
          // Opcional: navegação/ação
        });
      removeResponse = () => responseSub.remove();

      // Canal Android (quando aplicável)
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        } catch {
          // não travar
        }
      }
    } catch {
      // Se expo-notifications não estiver ok, não travar
    }
  })();

  // Cleanup total
  return () => {
    try {
      removeReceived?.();
    } catch {}
    try {
      removeResponse?.();
    } catch {}
  };
}
