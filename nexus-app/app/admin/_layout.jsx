// app/admin/_layout.jsx
// Layout del área de Admin con tab bar inferior

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdmin } from '../_layout';

function TabIcon({ label, emoji, focused }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function AdminLayout() {
  const router = useRouter();
  const { exitAdmin } = useAdmin();

  const handleExit = () => {
    exitAdmin();
    router.replace('/');
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#0f0f1a' },
        headerTintColor: '#fff',
        headerRight: () => (
          <TouchableOpacity onPress={handleExit} style={{ marginRight: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Salir 🔒</Text>
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: '#16162a',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarActiveTintColor: '#6c5ce7',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Config',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
