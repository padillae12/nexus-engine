// app/cita/[id].jsx
// ══════════════════════════════════════════════════════════════════
//  Detalle de una cita + botones de cambio de estado.
//  Accesible desde Modo Recepcionista Y Modo Admin.
// ══════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updateEstadoCita } from '../../services/api';

const ESTADO_CONFIG = {
  confirmada: { color: '#00ce6d', bg: 'rgba(0,206,109,0.12)', label: 'Confirmada',  icon: '🟢' },
  pendiente:  { color: '#fdcb6e', bg: 'rgba(253,203,110,0.12)', label: 'Pendiente', icon: '🟡' },
  completada: { color: '#6c5ce7', bg: 'rgba(108,92,231,0.12)', label: 'Completada', icon: '✅' },
  cancelada:  { color: '#ff7675', bg: 'rgba(255,118,117,0.12)', label: 'Cancelada',  icon: '🔴' },
};

const ACCIONES = [
  { estado: 'completada', label: 'Marcar Completada', icon: '✅', color: '#00ce6d', bg: 'rgba(0,206,109,0.1)' },
  { estado: 'cancelada',  label: 'Cancelar Cita',     icon: '✕',  color: '#ff7675', bg: 'rgba(255,118,117,0.1)' },
  { estado: 'pendiente',  label: 'Marcar Pendiente',  icon: '◷',  color: '#fdcb6e', bg: 'rgba(253,203,110,0.1)' },
];

export default function DetalleCitaScreen() {
  const { id, hora, cliente, servicio, empleado, estado: estadoInicial, duracion_min, precio } =
    useLocalSearchParams();
  const router  = useRouter();
  const [estado,  setEstado]  = useState(estadoInicial ?? 'confirmada');
  const [loading, setLoading] = useState(false);

  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.pendiente;

  // Iniciales del cliente para el avatar
  const iniciales = (cliente ?? 'SN')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const cambiarEstado = (nuevoEstado) => {
    const accion = ACCIONES.find(a => a.estado === nuevoEstado);
    Alert.alert(
      accion.label,
      `¿Confirmas cambiar el estado a "${ESTADO_CONFIG[nuevoEstado].label}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              await updateEstadoCita(Number(id), nuevoEstado);
              setEstado(nuevoEstado);
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Cita</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + nombre */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { borderColor: cfg.color }]}>
            <Text style={[styles.avatarText, { color: cfg.color }]}>{iniciales}</Text>
          </View>
          <Text style={styles.clienteNombre}>{cliente ?? 'Sin nombre'}</Text>
          <View style={[styles.estadoPill, { backgroundColor: cfg.bg, borderColor: cfg.color + '60' }]}>
            <Text style={styles.estadoIcon}>{cfg.icon}</Text>
            <Text style={[styles.estadoLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Card de info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>HORA</Text>
              <Text style={styles.infoValue}>{hora}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PRECIO</Text>
              <Text style={styles.infoValue}>
                {precio && precio !== '' ? `$${Number(precio).toLocaleString('es-MX')}` : 'N/D'}
              </Text>
            </View>
          </View>

          <View style={styles.infoSeparator} />

          <View style={styles.infoFull}>
            <Text style={styles.infoLabel}>SERVICIO</Text>
            <Text style={styles.infoValueLg}>{servicio}</Text>
          </View>

          {empleado ? (
            <>
              <View style={styles.infoSeparator} />
              <View style={styles.infoFull}>
                <Text style={styles.infoLabel}>PROFESIONAL</Text>
                <Text style={styles.infoValueLg}>👤 {empleado}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Acciones */}
        {loading ? (
          <ActivityIndicator color="#6c5ce7" style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.acciones}>
            <Text style={styles.accionesTitle}>CAMBIAR ESTADO</Text>
            {ACCIONES.filter(a => a.estado !== estado).map(accion => (
              <TouchableOpacity
                key={accion.estado}
                style={[styles.accionBtn, { backgroundColor: accion.bg, borderColor: accion.color + '40' }]}
                onPress={() => cambiarEstado(accion.estado)}
                activeOpacity={0.75}
              >
                <Text style={styles.accionIcon}>{accion.icon}</Text>
                <Text style={[styles.accionLabel, { color: accion.color }]}>{accion.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 64 },
  backArrow: { fontSize: 24, color: '#6c5ce7', lineHeight: 26 },
  backText:  { fontSize: 15, color: '#6c5ce7', fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', marginTop: 16, marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText:     { fontSize: 28, fontWeight: '800' },
  clienteNombre:  { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10 },
  estadoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  estadoIcon:  { fontSize: 12 },
  estadoLabel: { fontSize: 13, fontWeight: '700' },

  // Info card
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.2)',
    marginBottom: 28, overflow: 'hidden',
  },
  infoRow:     { flexDirection: 'row' },
  infoItem:    { flex: 1, padding: 20, alignItems: 'center' },
  infoDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  infoFull:    { padding: 20 },
  infoSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, marginBottom: 6 },
  infoValue:   { fontSize: 22, fontWeight: '800', color: '#fff' },
  infoValueLg: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 2 },

  // Acciones
  acciones:      { gap: 10 },
  accionesTitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, marginBottom: 4 },
  accionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
  },
  accionIcon:  { fontSize: 18, width: 28, textAlign: 'center' },
  accionLabel: { fontSize: 15, fontWeight: '700' },
});
