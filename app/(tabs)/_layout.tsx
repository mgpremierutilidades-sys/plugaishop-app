// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import Icon from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";

export const TABBAR_HEIGHT = 64;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: false, // ✅ TabBar nunca some com teclado
        tabBarActiveTintColor: theme.colors.tabIconActive,
        tabBarInactiveTintColor: theme.colors.tabIconInactive,
        tabBarStyle: {
          height: TABBAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
          backgroundColor: theme.colors.background,
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
          tabBarIcon: ({ color }) => <Icon name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => <Icon name="compass-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color }) => <Icon name="cart-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => <Icon name="receipt-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <Icon name="person-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
