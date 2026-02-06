import { Tabs } from "expo-router";
import IconSymbolUI from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabIconActive,
        tabBarInactiveTintColor: theme.colors.tabIconInactive,
        tabBarHideOnKeyboard: false, // ✅ TabBar nunca some com teclado (Android)
        tabBarStyle: {
          borderTopColor: theme.colors.divider,
          backgroundColor: theme.colors.background,
          height: 64, // ⚠️ referência para o carrinho não sobrepor
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
          tabBarIcon: ({ color }) => <IconSymbolUI name="home-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => <IconSymbolUI name="compass-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color }) => <IconSymbolUI name="cart-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => <IconSymbolUI name="receipt-outline" color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <IconSymbolUI name="person-circle-outline" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
