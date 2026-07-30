// app/admin/clientes.jsx — Pantalla Admin: lista de clientes registrados por el bot
// Diseño Profesional & Ejecutivo (Zero Emojis)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getClientes, getCitasCliente } from '../../services/api';

function ClienteRow({ cliente, onPress }) {
  const inicial = (cliente.nombre ?? '?')[0].toUpperCase();
  const fechaStr = cliente.creado_en
    ? new Date(cliente.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{inicial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{cliente.nombre ?? 'Sin nombre'}</Text>
        <Text style={styles.telefono}>{cliente.telefono}</Text>
      </View>
      <View style={styles.metaCol}>
        <Text style={styles.citasCount}>{cliente.total_citas ?? 0} citas</Text>
        <Text style={styles.fecha}>{fechaStr}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#6B7280" style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

export default function ClientesScreen() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Ficha de Cliente
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [historialCitas, setHistorialCitas] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const cargarClientes = () => {
    setLoading(true);
    getClientes()
      .then(setClientes)
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleOpenCliente = (cliente) => {
    setSelectedCliente(cliente);
    setLoadingHistorial(true);
    setHistorialCitas([]);
    getCitasCliente(cliente.id)
      .then(setHistorialCitas)
      .catch(console.warn)
      .finally(() => setLoadingHistorial(false));
  };

  const totalCitas = historialCitas.length;
  const completadas = historialCitas.filter(c => c.estado === 'completada').length;
  const canceladas = historialCitas.filter(c => c.estado === 'cancelada').length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>DIRECTORIO DE CLIENTES</Text>
        <Text style={styles.headerCount}>{clientes.length} registrados</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ClienteRow cliente={item} onPress={() => handleOpenCliente(item)} />
          )}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Sin clientes registrados en la base de datos</Text>
            </View>
          }
        />
      )}

      {/* Modal Ficha e Historial del Cliente */}
      <Modal visible={!!selectedCliente} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedCliente?.nombre ?? 'Ficha de Cliente'}</Text>
                <TouchableOpacity
                  style={styles.phoneTouch}
                  onPress={() => {
                    if (selectedCliente?.telefono) {
                      Linking.openURL(`https://wa.me/${selectedCliente.telefono.replace(/\D/g, '')}`);
                    }
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                  <Text style={styles.modalSubTitle}>{selectedCliente?.telefono}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedCliente(null)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Tarjetas de Resumen */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{totalCitas}</Text>
                <Text style={styles.statLbl}>TOTAL CITAS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#10B981' }]}>{completadas}</Text>
                <Text style={styles.statLbl}>ASISTIDAS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#EF4444' }]}>{canceladas}</Text>
                <Text style={styles.statLbl}>CANCELADAS</Text>
              </View>
            </View>

            {/* Timeline Historial de Citas */}
            <Text style={styles.historialTitle}>HISTORIAL DE TRATAMIENTOS / VISITAS</Text>

            {loadingHistorial ? (
              <ActivityIndicator color="#6366F1" style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {historialCitas.length === 0 ? (
                  <Text style={styles.emptyHistorial}>El cliente no tiene citas registradas en el historial.</Text>
                ) : (
                  historialCitas.map(c => {
                    const f = new Date(c.fecha_inicio);
                    const fechaStr = f.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    const horaStr = f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isCompletada = c.estado === 'completada';
                    const isCancelada = c.estado === 'cancelada';
                    const colorState = isCompletada ? '#6366F1' : isCancelada ? '#EF4444' : '#10B981';

                    return (
                      <View key={c.id} style={styles.citaHistCard}>
                        <View style={styles.citaHistTop}>
                          <Text style={styles.citaServicio}>{c.servicio}</Text>
                          <View style={[styles.badgeState, { backgroundColor: colorState + '15', borderColor: colorState + '40' }]}>
                            <Text style={[styles.badgeStateText, { color: colorState }]}>{c.estado.toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={styles.citaMetaRow}>
                          <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                          <Text style={styles.citaMetaText}>{fechaStr} a las {horaStr}</Text>
                        </View>
                        {c.empleado ? (
                          <View style={styles.citaMetaRow}>
                            <Ionicons name="person-outline" size={12} color="#6B7280" />
                            <Text style={styles.citaMetaText}>{c.empleado}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerCount: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#F9FAFB', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  nombre: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  telefono: { color: '#6B7280', fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  metaCol: { alignItems: 'flex-end' },
  citasCount: { color: '#6366F1', fontSize: 11, fontWeight: '700' },
  fecha: { color: '#6B7280', fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },

  // Modal Ficha de Cliente
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '700' },
  phoneTouch: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  modalSubTitle: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: '#161E2E',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  statVal: { color: '#F9FAFB', fontSize: 16, fontWeight: '800' },
  statLbl: { color: '#6B7280', fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },

  historialTitle: { color: '#6B7280', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  emptyHistorial: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginVertical: 20 },
  citaHistCard: {
    backgroundColor: '#161E2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 4,
  },
  citaHistTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  citaServicio: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  badgeState: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeStateText: { fontSize: 9, fontWeight: '700' },
  citaMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  citaMetaText: { color: '#9CA3AF', fontSize: 11 },
});
