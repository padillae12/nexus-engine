// app/index.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL — Agenda del Día (Modo Recepcionista)
//
//  Esta es la pantalla que siempre está visible en el local.
//  El dueño toca el logo 5 veces para abrir el modal de PIN.
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdmin } from './_layout';
import CitaCard from '../components/CitaCard';
import PinModal from '../components/PinModal';
import { getCitasHoy } from '../services/api';

export default function AgendaScreen() {
  const router = useRouter();
  const { isAdmin, enterAdmin, exitAdmin, loading, error } = useAdmin();

  const [citas, setCitas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [fecha] = useState(() => {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  // ── Cargar citas del día ────────────────────────────────────────
  const cargarCitas = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getCitasHoy();
      setCitas(data);
    } catch (e) {
      console.warn('[Agenda] Error al cargar citas:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarCitas(); }, []);

  // ── Gesto discreto: tocar logo 5 veces → abrir PIN ─────────────
  const handleLogoTap = () => {
    const newCount = logoTaps + 1;
    setLogoTaps(newCount);
    if (newCount >= 5) {
      setLogoTaps(0);
      if (isAdmin) {
        exitAdmin();
      } else {
        setShowPin(true);
      }
    }
  };

  // ── Navegar a modo Admin al autenticarse ────────────────────────
  useEffect(() => {
    if (isAdmin) {
      setShowPin(false);
      router.push('/admin/dashboard');
    }
  }, [isAdmin]);

  // ── Próxima cita ────────────────────────────────────────────────
  const proxima = citas.find(c => c.estado === 'confirmada');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>N</Text>
          </View>
        </TouchableOpacity>
        <View>
          <Text style={styles.titulo}>Agenda del Día</Text>
          <Text style={styles.fecha}>{fecha}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalCitas}>{citas.length} citas</Text>
        </View>
      </View>

      {/* Banner próxima cita */}
      {proxima && (
        <View style={styles.proximaBanner}>
          <Text style={styles.proximaLabel}>⏱ Próxima cita</Text>
          <Text style={styles.proximaInfo}>
            {proxima.hora} · {proxima.cliente ?? 'Sin nombre'} · {proxima.servicio}
          </Text>
        </View>
      )}

      {/* Lista de citas */}
      <FlatList
        data={citas}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CitaCard
            cita={item}
            onPress={() => router.push({
              pathname: '/cita/[id]',
              params: {
                id:          item.id,
                hora:        item.hora,
                cliente:     item.cliente ?? 'Sin nombre',
                servicio:    item.servicio,
                empleado:    item.empleado ?? '',
                estado:      item.estado,
                duracion_min: item.duracion_min,
                precio:      item.precio ?? '',
              },
            })}
          />
        )}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={cargarCitas} tintColor="#6c5ce7" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyText}>No hay citas para hoy</Text>
          </View>
        }
      />

      {/* Modal PIN */}
      <PinModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onSubmit={enterAdmin}
        loading={loading}
        error={error}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#6c5ce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  titulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  fecha: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'capitalize' },
  headerRight: { marginLeft: 'auto' },
  totalCitas: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  proximaBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.3)',
  },
  proximaLabel: { fontSize: 11, color: '#6c5ce7', fontWeight: '700', marginBottom: 4 },
  proximaInfo: { fontSize: 14, color: '#fff', fontWeight: '500' },
  lista: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 16 },
});
