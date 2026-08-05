// app/index.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL — Control de Citas (Modo Recepción / General)
//  Diseño Profesional & Ejecutivo (Zero Emojis)
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdmin } from './_layout';
import CitaCard from '../components/CitaCard';
import PinModal from '../components/PinModal';
import NuevaCitaModal from '../components/NuevaCitaModal';
import { getCitasHoy, getCitasManana, getCitas } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AgendaScreen() {
  const router = useRouter();
  const { isAdmin, enterAdmin, exitAdmin, loading, error } = useAdmin();

  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'manana' | 'calendario'
  const [citasHoy, setCitasHoy] = useState([]);
  const [citasManana, setCitasManana] = useState([]);
  const [todasLasCitas, setTodasLasCitas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [showNuevaCita, setShowNuevaCita] = useState(false);

  // Estados del Calendario Interactivo
  const hoyObj = new Date();
  const todayStr = `${hoyObj.getFullYear()}-${String(hoyObj.getMonth() + 1).padStart(2, '0')}-${String(hoyObj.getDate()).padStart(2, '0')}`;
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(hoyObj.getFullYear(), hoyObj.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

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
      const [resHoy, resManana, resTodas] = await Promise.all([
        getCitasHoy().catch(() => []),
        getCitasManana().catch(() => []),
        getCitas({ limite: 300 }).catch(() => []),
      ]);
      setCitasHoy(resHoy);
      setCitasManana(resManana);
      setTodasLasCitas(resTodas);
    } catch (e) {
      console.warn('[Agenda] Error al cargar citas:', e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarCitas(); }, []);

  // Set de fechas que contienen al menos 1 cita para marcar con punto verde
  const fechasConCita = useMemo(() => {
    const setF = new Set();
    todasLasCitas.forEach(c => {
      if (c.fecha && c.estado !== 'cancelada') {
        setF.add(c.fecha);
      }
    });
    return setF;
  }, [todasLasCitas]);

  // Citas para el día seleccionado en el Calendario
  const citasCalendario = useMemo(() => {
    return todasLasCitas.filter(c => c.fecha === selectedDateStr);
  }, [todasLasCitas, selectedDateStr]);

  // Navegación de mes del calendario
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Construcción de la matriz del calendario
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const nombreMes = currentMonthDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push({ day, dateStr: dStr });
  }

  // Texto amigable para el día seleccionado en el Calendario
  let textoDiaSeleccionado = selectedDateStr;
  if (selectedDateStr) {
    const [y, m, d] = selectedDateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    textoDiaSeleccionado = dateObj.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'short',
    });
  }

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

  const listData = activeTab === 'hoy'
    ? citasHoy
    : activeTab === 'manana'
      ? citasManana
      : citasCalendario;

  const activeFecha = activeTab === 'hoy'
    ? fechaHoy
    : activeTab === 'manana'
      ? fechaManana
      : textoDiaSeleccionado;

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
            {activeTab === 'hoy' ? 'Agenda de Hoy' : activeTab === 'manana' ? 'Agenda de Mañana' : 'Calendario Mensual'}
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

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'calendario' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('calendario')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={12} color={activeTab === 'calendario' ? '#6366F1' : '#9CA3AF'} style={{ marginRight: 4 }} />
          <Text style={[styles.segmentText, activeTab === 'calendario' && styles.segmentTextActive]}>
            CALENDARIO
          </Text>
        </TouchableOpacity>
      </View>

      {/* COMPONENTE CALENDARIO INTERACTIVO (Visible solo si activeTab === 'calendario') */}
      {activeTab === 'calendario' && (
        <View style={styles.calendarCard}>
          {/* Header Mes y Navegación */}
          <View style={styles.calendarMonthHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navMonthBtn}>
              <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{nombreMes.toUpperCase()}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navMonthBtn}>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Días de la semana */}
          <View style={styles.weekDaysRow}>
            {DIAS_SEMANA.map((d, idx) => (
              <Text key={idx} style={styles.weekDayText}>{d}</Text>
            ))}
          </View>

          {/* Grilla de Días del Mes */}
          <View style={styles.daysGrid}>
            {daysGrid.map((item, index) => {
              if (!item) {
                return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
              }

              const { day, dateStr } = item;
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayStr;
              const hasAppt = fechasConCita.has(dateStr);

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDateStr(dateStr)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayNum,
                    isSelected && styles.dayNumSelected,
                    isToday && !isSelected && styles.dayNumToday,
                  ]}>
                    {day}
                  </Text>
                  
                  {/* Punto marcador de día con cita */}
                  {hasAppt && (
                    <View style={[styles.apptDot, isSelected && styles.apptDotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Banner indicador del día seleccionado */}
          <View style={styles.selectedDayBanner}>
            <Ionicons name="calendar-outline" size={14} color="#6366F1" />
            <Text style={styles.selectedDayBannerText}>
              Citas del {textoDiaSeleccionado}: <Text style={{ color: '#6366F1', fontWeight: '800' }}>{citasCalendario.length}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Banner de Próxima Cita (solo en pestaña hoy) */}
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
                id:                      item.id,
                fecha:                   item.fecha ?? '',
                hora:                    item.hora,
                cliente:                 item.cliente ?? 'Sin nombre',
                servicio:                item.servicio,
                empleado:                item.empleado ?? '',
                estado:                  item.estado,
                duracion_min:            item.duracion_min,
                precio:                  item.precio ?? '',
                creado_en:               item.creado_en ?? '',
                notas:                   item.notas ?? '',
                indicaciones_postcita:   item.indicaciones_postcita ?? '',
                cliente_id:              item.cliente_id ?? '',
                cliente_notas_internas: item.cliente_notas_internas ?? '',
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
            <Ionicons name="calendar-clear-outline" size={32} color="#374151" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>Sin citas programadas</Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'hoy'
                ? 'No hay registros en la agenda para la fecha de hoy.'
                : activeTab === 'manana'
                  ? 'No hay registros en la agenda para la fecha de mañana.'
                  : `No hay registros para este día (${selectedDateStr}).`}
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
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
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

  // Estilos del Calendario Interactivo
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  navMonthBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#6366F1',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  dayNumSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumToday: {
    color: '#6366F1',
    fontWeight: '700',
  },
  apptDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  apptDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  selectedDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  selectedDayBannerText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
});
