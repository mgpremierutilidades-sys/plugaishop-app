// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import IconSymbol from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabIconActive,
        tabBarInactiveTintColor: theme.colors.tabIconInactive,
        tabBarHideOnKeyboard: false,

        // garante ícone em cima e texto embaixo (não “ao lado do negrito”)
        tabBarLabelPosition: "below-icon",

        tabBarStyle: {
          borderTopColor: theme.colors.divider,
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="home-outline" color={color} size={size ?? 22} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="compass-outline" color={color} size={size ?? 22} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="cart-outline" color={color} size={size ?? 22} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Minha Conta",
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tabs>
  );
}
