// app/_layout.jsx
// ══════════════════════════════════════════════════════════════════
//  Layout raíz de la app (Expo Router).
// ══════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAdminMode } from '../hooks/useAdminMode';

export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export default function RootLayout() {
  const adminMode = useAdminMode();

  return (
    <AdminContext.Provider value={adminMode}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0F17' },
          animation: 'fade',
        }}
      />
    </AdminContext.Provider>
  );
}
