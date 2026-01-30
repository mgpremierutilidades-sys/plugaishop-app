// app/(tabs)/_layout.tsx
import { Tabs, usePathname } from "expo-router";
import { useEffect, useMemo } from "react";
import Icon from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";
import { trackScreenView } from "../../utils/analytics";

export default function TabsLayout() {
  const pathname = usePathname();

  // Rastreia view de tela baseado na rota atual (sem mexer em UI)
  useEffect(() => {
    if (!pathname) return;
    trackScreenView(pathname);
  }, [pathname]);

  const baseTabBarStyle = useMemo(
    () => ({
      borderTopColor: theme.colors.divider,
      backgroundColor: theme.colors.background,
      height: 64,
      paddingTop: 8,
      paddingBottom: 10,
    }),
    []
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabIconActive,
        tabBarInactiveTintColor: theme.colors.tabIconInactive,
        tabBarHideOnKeyboard: false,
        tabBarStyle: baseTabBarStyle as any,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <Icon name="home-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => <Icon name="compass-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color }) => <Icon name="cart-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => <Icon name="receipt-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <Icon name="person-circle-outline" color={color} size={22} />,
        }}
      />

      {/* Rotas que não podem aparecer como Tab */}
      <Tabs.Screen name="orders" options={{ href: null }} />
    </Tabs>
  );
}
