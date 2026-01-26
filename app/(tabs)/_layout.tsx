// app/(tabs)/_layout.tsx
import { Tabs, router, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import Icon from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";

// GARANTE: no primeiro boot do app, se ele abrir “preso” no checkout, volta pro Home uma vez.
let bootRedirectHandled = false;

export default function TabsLayout() {
  const segments = useSegments() as string[];

  // Ex.: ["(tabs)", "checkout", "address"]
  const inCheckoutFlow = segments.includes("checkout");

  useEffect(() => {
    if (!segments || segments.length === 0) return;

    if (!bootRedirectHandled && inCheckoutFlow) {
      bootRedirectHandled = true;
      router.replace("/(tabs)" as any);
      return;
    }

    if (!bootRedirectHandled && !inCheckoutFlow) {
      bootRedirectHandled = true;
    }
  }, [inCheckoutFlow, segments]);

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

  // Mantém a regra de esconder no checkout (se for requisito)
  const shouldHideTabBar = inCheckoutFlow;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabIconActive,
        tabBarInactiveTintColor: theme.colors.tabIconInactive,
        tabBarHideOnKeyboard: false,
        tabBarStyle: shouldHideTabBar ? { display: "none" } : (baseTabBarStyle as any),
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

      {/* ✅ Esconde rotas indevidas de virarem tabs */}
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
    </Tabs>
  );
}
