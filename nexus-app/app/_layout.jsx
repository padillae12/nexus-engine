// app/_layout.jsx
// ══════════════════════════════════════════════════════════════════
//  Layout raíz de la app (Expo Router).
//  Aquí vive el contexto global del modo Admin (PIN).
// ══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAdminMode } from '../hooks/useAdminMode';

// ── Contexto global del modo Admin ────────────────────────────────
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
          contentStyle: { backgroundColor: '#0f0f1a' },
          animation: 'fade',
        }}
      />
    </AdminContext.Provider>
  );
}
