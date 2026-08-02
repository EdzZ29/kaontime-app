import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

export default function TabsLayout() {
  const { user, isPreparing } = useAuth();

  // Everything under (tabs) is behind the login. Rendering nothing while the
  // cold-start reset runs avoids a flash of the tab bar.
  if (isPreparing) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#131313',
        tabBarInactiveTintColor: '#a3a3a3',
        sceneStyle: { backgroundColor: '#ffffff' },
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e5e5e5' },
      }}
    >
      <Tabs.Screen
        name="start"
        options={{
          title: 'Order',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',   
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report Logs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      /> 
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
