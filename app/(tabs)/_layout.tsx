import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import IconSymbolDefault from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <IconSymbolDefault name="house" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explorar",
            tabBarIcon: ({ color }) => (
              <IconSymbolDefault name="magnifyingglass" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Carrinho",
            tabBarIcon: ({ color }) => (
              <IconSymbolDefault name="cart" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Pedidos",
            tabBarIcon: ({ color }) => (
              <IconSymbolDefault name="shippingbox" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Conta",
            tabBarIcon: ({ color }) => (
              <IconSymbolDefault name="person" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => (
              <IconSymbolDefault name="person.circle" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="checkout"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
