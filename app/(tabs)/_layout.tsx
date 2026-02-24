import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import IconSymbolDefault from "../../components/ui/icon-symbol";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { track } from "../../lib/analytics";
import { subscribeNotificationsChanged } from "../../lib/notificationsBus";
import { getUnreadCount } from "../../utils/notificationsStorage";

export default function TabsLayout() {
  const [unread, setUnread] = useState(0);

  const badgeEnabled = isFlagEnabled("ff_orders_notifications_badge_v1");

  const refreshBadge = useCallback(async () => {
    if (!badgeEnabled) {
      setUnread(0);
      return;
    }
    try {
      const c = await getUnreadCount();

      // ✅ evita spam de métrica quando c não mudou
      setUnread((prev) => {
        if (prev !== c) {
          try {
            track("orders_badge_loaded", { unread_count: c });
          } catch {}
        }
        return c;
      });
    } catch {
      setUnread(0);
    }
  }, [badgeEnabled]);

  useFocusEffect(
    useCallback(() => {
      refreshBadge();
    }, [refreshBadge]),
  );

  useEffect(() => {
    if (!badgeEnabled) return;

    const unsub = subscribeNotificationsChanged(() => {
      refreshBadge();
    });

    return unsub;
  }, [badgeEnabled, refreshBadge]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabIconActive,
        tabBarInactiveTintColor: theme.colors.tabIconInactive,
        tabBarHideOnKeyboard: false,
        tabBarStyle: {
          borderTopColor: theme.colors.divider,
          backgroundColor: theme.colors.background,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="home-outline" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="compass-outline" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="cart-outline" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarBadge: badgeEnabled && unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { fontSize: 10, fontWeight: "800" },
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="receipt-outline" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="person-outline" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault
              name="person-circle-outline"
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}