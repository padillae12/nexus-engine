// app/index.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL — Control de Citas (Modo Recepción / General)
//  Diseño Profesional & Ejecutivo (Zero Emojis)
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
import NuevaCitaModal from '../components/NuevaCitaModal';
import { getCitasHoy, getCitasManana } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AgendaScreen() {
  const router = useRouter();
  const { isAdmin, enterAdmin, exitAdmin, loading, error } = useAdmin();

  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'manana'
  const [citasHoy, setCitasHoy] = useState([]);
  const [citasManana, setCitasManana] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [showNuevaCita, setShowNuevaCita] = useState(false);

  // Formatear fechas para los headers
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fechaManana = tomorrow.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

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

  // Gesto discreto: tocar logo 5 veces -> abrir PIN admin
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
      {/* Header Ejecutivo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.8}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>NEXUS</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>
            {activeTab === 'hoy' ? 'Agenda de Hoy' : 'Agenda de Mañana'}
          </Text>
          <Text style={styles.fecha}>{activeFecha}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => setShowNuevaCita(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnHeaderText}>Agendar</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Pestañas Segmentado */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'hoy' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('hoy')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'hoy' && styles.segmentTextActive]}>
            HOY ({citasHoy.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'manana' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('manana')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'manana' && styles.segmentTextActive]}>
            MAÑANA ({citasManana.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Banner de Próxima Cita (sin emojis) */}
      {activeTab === 'hoy' && proxima && (
        <View style={styles.proximaCard}>
          <View style={styles.proximaHeaderRow}>
            <View style={styles.proximaDot} />
            <Text style={styles.proximaLabel}>PRÓXIMA CITA EN AGENDA</Text>
          </View>
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
                id:           item.id,
                fecha:        item.fecha ?? '',
                hora:         item.hora,
                cliente:      item.cliente ?? 'Sin nombre',
                servicio:     item.servicio,
                empleado:     item.empleado ?? '',
                estado:       item.estado,
                duracion_min: item.duracion_min,
                precio:       item.precio ?? '',
                creado_en:    item.creado_en ?? '',
              },
            })}
          />
        )}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={cargarCitas} tintColor="#6366F1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin citas programadas</Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'hoy'
                ? 'No hay registros en la agenda para la fecha de hoy.'
                : 'No hay registros en la agenda para la fecha de mañana.'}
            </Text>
          </View>
        }
      />

      {/* Modal PIN Admin */}
      <PinModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onSubmit={enterAdmin}
        loading={loading}
        error={error}
      />

      {/* Modal Agendar Cita Manual */}
      <NuevaCitaModal
        visible={showNuevaCita}
        onClose={() => setShowNuevaCita(false)}
        onSuccess={cargarCitas}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  logoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.5,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  fecha: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerRight: {
    marginLeft: 'auto',
  },
  countBadge: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // Selector Segmentado
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#6366F1',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  // Banner Próxima Cita
  proximaCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  proximaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  proximaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  proximaLabel: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: '700',
    letterSpacing: 1,
  },
  proximaInfo: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '500',
  },

  lista: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
