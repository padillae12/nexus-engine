// app/index.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL — Agenda (Hoy / Mañana)
//
//  Pantalla principal que se muestra al abrir la app.
//  Permite cambiar entre las citas de Hoy y Mañana.
//  Gesto: tocar el logo 5 veces abre el modal de PIN para admin.
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
import { getCitasHoy, getCitasManana } from '../services/api';

export default function AgendaScreen() {
  const router = useRouter();
  const { isAdmin, enterAdmin, exitAdmin, loading, error } = useAdmin();

  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'manana'
  const [citasHoy, setCitasHoy] = useState([]);
  const [citasManana, setCitasManana] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showPin, setShowPin] = useState(false);

  // Formatear fechas para los headers
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fechaManana = tomorrow.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ── Cargar citas de hoy y mañana ────────────────────────────────
  const cargarCitas = useCallback(async () => {
    setRefreshing(true);
    try {
      const [resHoy, resManana] = await Promise.all([
        getCitasHoy().catch(() => []),
        getCitasManana().catch(() => []),
      ]);
      setCitasHoy(resHoy);
      setCitasManana(resManana);
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

  const listData = activeTab === 'hoy' ? citasHoy : citasManana;
  const activeFecha = activeTab === 'hoy' ? fechaHoy : fechaManana;

  // Próxima cita de hoy
  const proxima = citasHoy.find(c => c.estado === 'confirmada');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>N</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>
            {activeTab === 'hoy' ? 'Agenda de Hoy' : 'Agenda de Mañana'}
          </Text>
          <Text style={styles.fecha}>{activeFecha}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalCitas}>{listData.length} cita{listData.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Tabs Selector: Hoy vs Mañana */}
      <View style={styles.tabSelectorRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'hoy' && styles.tabBtnActive]}
          onPress={() => setActiveTab('hoy')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'hoy' && styles.tabBtnTextActive]}>
            📅 Hoy ({citasHoy.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'manana' && styles.tabBtnActive]}
          onPress={() => setActiveTab('manana')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'manana' && styles.tabBtnTextActive]}>
            🌅 Mañana ({citasManana.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Banner próxima cita (solo en hoy) */}
      {activeTab === 'hoy' && proxima && (
        <View style={styles.proximaBanner}>
          <Text style={styles.proximaLabel}>⏱ Próxima cita de hoy</Text>
          <Text style={styles.proximaInfo}>
            {proxima.hora} · {proxima.cliente ?? 'Sin nombre'} · {proxima.servicio}
          </Text>
        </View>
      )}

      {/* Lista de citas */}
      <FlatList
        data={listData}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CitaCard
            cita={item}
            onPress={() => router.push({
              pathname: '/cita/[id]',
              params: {
                id:          item.id,
                fecha:       item.fecha ?? '',
                hora:        item.hora,
                cliente:     item.cliente ?? 'Sin nombre',
                servicio:    item.servicio,
                empleado:    item.empleado ?? '',
                estado:      item.estado,
                duracion_min: item.duracion_min,
                precio:      item.precio ?? '',
                creado_en:   item.creado_en ?? '',
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
            <Text style={styles.emptyText}>
              {activeTab === 'hoy' ? 'No hay citas para hoy' : 'No hay citas agendadas para mañana'}
            </Text>
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
    paddingBottom: 10,
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
  totalCitas: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // Selector de Tabs
  tabSelectorRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBtnActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

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
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
});
