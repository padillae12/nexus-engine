// app/admin/citas.jsx — Pantalla Admin: lista de citas con filtros
// Diseño Profesional & Ejecutivo (Zero Emojis)

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import CitaCard from '../../components/CitaCard';
import NuevaCitaModal from '../../components/NuevaCitaModal';
import { getCitas, getEmpleados } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const FILTROS = ['Todas', 'Hoy', 'Confirmadas', 'Completadas', 'Canceladas'];

export default function CitasScreen() {
  const router = useRouter();
  const [citas, setCitas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Hoy');
  const [showNuevaCita, setShowNuevaCita] = useState(false);

  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(() => []);
  }, []);

  const cargarCitas = () => {
    setLoading(true);
    const params = {};
    if (filtro === 'Hoy') {
      const d = new Date();
      params.fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (!['Todas', 'Hoy'].includes(filtro)) params.estado = filtro.toLowerCase();
    if (selectedEmpId) params.empleadoId = selectedEmpId;

    getCitas(params)
      .then(setCitas)
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useFocusEffect(
    useCallback(() => {
      cargarCitas();
    }, [filtro, selectedEmpId])
  );

  return (
    <View style={styles.container}>
      {/* Header Acción */}
      <View style={styles.topActionRow}>
        <Text style={styles.topTitle}>GESTIÓN DE CITAS</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowNuevaCita(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Nueva Cita</Text>
        </TouchableOpacity>
      </View>

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

      {loading
        ? <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={citas}
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
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin registros para el filtro seleccionado</Text>
              </View>
            }
          />
        )
      }

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
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  filtroBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#111827',
  },
  filtroBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filtroText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  filtroTextActive: { color: '#FFFFFF', fontWeight: '700' },

  empFiltroScroll: { maxHeight: 36, marginBottom: 12 },
  empFiltroContainer: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  empFiltroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
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
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});
