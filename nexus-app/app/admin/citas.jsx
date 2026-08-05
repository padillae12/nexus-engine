// app/admin/citas.jsx — Pantalla Admin: Calendario interactivo con marcadores de citas
// Diseño Profesional & Ejecutivo (Zero Emojis)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import CitaCard from '../../components/CitaCard';
import NuevaCitaModal from '../../components/NuevaCitaModal';
import { getCitas, getEmpleados } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const FILTROS = ['Calendario', 'Todas', 'Confirmadas', 'Completadas', 'Canceladas'];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CitasScreen() {
  const router = useRouter();
  const [todasLasCitas, setTodasLasCitas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Calendario');
  const [showNuevaCita, setShowNuevaCita] = useState(false);

  // Estados del Calendario Interactivo
  const hoyObj = new Date();
  const todayStr = `${hoyObj.getFullYear()}-${String(hoyObj.getMonth() + 1).padStart(2, '0')}-${String(hoyObj.getDate()).padStart(2, '0')}`;
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(hoyObj.getFullYear(), hoyObj.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [showCalendarGrid, setShowCalendarGrid] = useState(true);

  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(() => []);
  }, []);

  const cargarCitas = () => {
    setLoading(true);
    // Traer citas generales para poblar el calendario y la lista
    getCitas({ limite: 300 })
      .then(setTodasLasCitas)
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useFocusEffect(
    useCallback(() => {
      cargarCitas();
    }, [])
  );

  // Set de fechas que contienen al menos 1 cita
  const fechasConCita = useMemo(() => {
    const setF = new Set();
    todasLasCitas.forEach(c => {
      if (c.fecha && c.estado !== 'cancelada') {
        setF.add(c.fecha);
      }
    });
    return setF;
  }, [todasLasCitas]);

  // Citas filtradas dinámicamente según pestaña o día de calendario seleccionado
  const citasFiltradas = useMemo(() => {
    return todasLasCitas.filter(c => {
      // Filtro por especialista
      if (selectedEmpId && c.empleado_id !== selectedEmpId && c.empleadoId !== selectedEmpId) {
        // comprobar por nombre si es id string
        const empObj = empleados.find(e => e.id === selectedEmpId);
        if (!empObj || c.empleado !== empObj.nombre) return false;
      }

      // Filtro por vista (Calendario vs Estados)
      if (filtro === 'Calendario') {
        return c.fecha === selectedDateStr;
      } else if (filtro === 'Confirmadas') {
        return c.estado === 'confirmada';
      } else if (filtro === 'Completadas') {
        return c.estado === 'completada';
      } else if (filtro === 'Canceladas') {
        return c.estado === 'cancelada';
      }
      return true; // 'Todas'
    });
  }, [todasLasCitas, filtro, selectedDateStr, selectedEmpId, empleados]);

  // Navegación de mes del calendario
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Construcción de la matriz del calendario del mes actual
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const nombreMes = currentMonthDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lun = 0 ... Dom = 6
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid = [];
  // Espacios vacíos antes del día 1
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null);
  }
  // Días del mes
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push({ day, dateStr: dStr });
  }

  // Texto amigable para el encabezado del día seleccionado
  let textoDiaSeleccionado = selectedDateStr;
  if (selectedDateStr) {
    const [y, m, d] = selectedDateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    textoDiaSeleccionado = dateObj.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'short',
    });
  }

  return (
    <View style={styles.container}>
      {/* Header Acción */}
      <View style={styles.topActionRow}>
        <Text style={styles.topTitle}>GESTIÓN Y CALENDARIO DE CITAS</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowNuevaCita(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Nueva Cita</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Citas (Filtradas por el Calendario o Estados) */}
      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={citasFiltradas}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={
            <>
              {/* Filtros de Segmentación */}
              <View style={styles.filtrosRow}>
                {FILTROS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filtroBtn, filtro === f && styles.filtroBtnActive]}
                    onPress={() => setFiltro(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filtroText, filtro === f && styles.filtroTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filtro por Especialista / Doctor */}
              {empleados.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.empFiltroScroll} contentContainerStyle={styles.empFiltroContainer}>
                  <TouchableOpacity
                    style={[styles.empFiltroChip, !selectedEmpId && styles.empFiltroChipActive]}
                    onPress={() => setSelectedEmpId(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people-outline" size={12} color={!selectedEmpId ? '#6366F1' : '#6B7280'} />
                    <Text style={[styles.empFiltroText, !selectedEmpId && styles.empFiltroTextActive]}>Todos los Doctores</Text>
                  </TouchableOpacity>

                  {empleados.map(emp => {
                    const active = selectedEmpId === emp.id;
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={[styles.empFiltroChip, active && styles.empFiltroChipActive]}
                        onPress={() => setSelectedEmpId(emp.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="person-outline" size={12} color={active ? '#6366F1' : '#6B7280'} />
                        <Text style={[styles.empFiltroText, active && styles.empFiltroTextActive]}>{emp.nombre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* COMPONENTE CALENDARIO (Solo visible si el filtro es 'Calendario') */}
              {filtro === 'Calendario' && (
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
                    <TouchableOpacity
                      onPress={() => setShowCalendarGrid(!showCalendarGrid)}
                      style={[styles.navMonthBtn, { marginLeft: 'auto' }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={showCalendarGrid ? "chevron-up" : "chevron-down"} size={16} color="#6366F1" />
                    </TouchableOpacity>
                  </View>

                  {/* Días de la semana y Grilla (solo si showCalendarGrid === true) */}
                  {showCalendarGrid && (
                    <>
                      <View style={styles.weekDaysRow}>
                        {DIAS_SEMANA.map((d, idx) => (
                          <Text key={idx} style={styles.weekDayText}>{d}</Text>
                        ))}
                      </View>

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
                              
                              {hasAppt && (
                                <View style={[styles.apptDot, isSelected && styles.apptDotSelected]} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Banner indicador del día seleccionado */}
                  <View style={styles.selectedDayBanner}>
                    <Ionicons name="calendar-outline" size={14} color="#6366F1" />
                    <Text style={styles.selectedDayBannerText}>
                      Citas del {textoDiaSeleccionado}: <Text style={{ color: '#6366F1', fontWeight: '800' }}>{citasFiltradas.length}</Text>
                    </Text>
                  </View>
                </View>
              )}
            </>
          }
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
          contentContainerStyle={[styles.lista, { paddingBottom: 140 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-clear-outline" size={32} color="#374151" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>
                {filtro === 'Calendario'
                  ? `Sin citas registradas para este día (${selectedDateStr})`
                  : 'Sin registros para el filtro seleccionado'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal Agendar Cita Manual */}
      <NuevaCitaModal
        visible={showNuevaCita}
        onClose={() => setShowNuevaCita(false)}
        onSuccess={cargarCitas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  topTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filtroBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#111827',
  },
  filtroBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filtroText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  filtroTextActive: { color: '#FFFFFF', fontWeight: '700' },

  empFiltroScroll: { height: 42, marginBottom: 8, marginTop: 4 },
  empFiltroContainer: { paddingHorizontal: 16, gap: 8, alignItems: 'center', height: 42 },
  empFiltroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  empFiltroChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  empFiltroText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  empFiltroTextActive: { color: '#6366F1', fontWeight: '700' },

  // Estilos del Calendario Interactivo
  calendarCard: {
    marginHorizontal: 16,
    marginBottom: 12,
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

  lista: { paddingHorizontal: 16, paddingBottom: 110 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
});
