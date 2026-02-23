import { Tabs } from "expo-router";
import IconSymbolDefault from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";

export default function TabsLayout() {
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
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="receipt-outline" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <IconSymbolDefault name="person-circle-outline" color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
