// app/admin/_layout.jsx
// Layout del área de Admin con estilo ejecutivo e íconos vectoriales limpios (Ionicons)

import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../_layout';

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
        headerStyle: {
          backgroundColor: '#0B0F17',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#1F2937',
        },
        headerTitleStyle: {
          color: '#F9FAFB',
          fontSize: 16,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleExit} style={styles.exitBtn} activeOpacity={0.75}>
            <Ionicons name="lock-closed-outline" size={13} color="#EF4444" />
            <Text style={styles.exitText}>Salir de Admin</Text>
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: '#0B0F17',
          borderTopWidth: 1,
          borderTopColor: '#1F2937',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  exitText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
