import { Tabs } from "expo-router";
import { IconSymbol } from "../../components/ui/icon-symbol";
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
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="home-outline" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paper-plane-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
