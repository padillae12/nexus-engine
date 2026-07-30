// app/cita/[id].jsx
// ══════════════════════════════════════════════════════════════════
//  Detalle de Cita — Diseño Profesional con Íconos Vectoriales
// ══════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { updateEstadoCita, reenviarWhatsApp } from '../../services/api';

const ESTADO_CONFIG = {
  confirmada: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', label: 'CONFIRMADA' },
  pendiente:  { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)',  label: 'PENDIENTE'  },
  completada: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.08)',  label: 'COMPLETADA' },
  cancelada:  { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)',  label: 'CANCELADA'  },
};

const ACCIONES = [
  { estado: 'completada', label: 'Marcar como Completada', icon: 'checkmark-circle-outline', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
  { estado: 'cancelada',  label: 'Cancelar Cita',          icon: 'close-circle-outline',     color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)' },
  { estado: 'pendiente',  label: 'Marcar como Pendiente',   icon: 'time-outline',             color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
];

export default function DetalleCitaScreen() {
  const { id, fecha, hora, cliente, servicio, empleado, estado: estadoInicial, duracion_min, precio, creado_en } =
    useLocalSearchParams();

  // Formatear fecha programada
  let fechaProgramada = fecha;
  if (fecha && fecha.includes('-')) {
    const [y, m, d] = fecha.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    fechaProgramada = dateObj.toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // Formatear fecha de creación
  let fechaRegistro = creado_en;
  if (creado_en && creado_en.includes(' ')) {
    const [f, h] = creado_en.split(' ');
    const [y, m, d] = f.split('-');
    fechaRegistro = `${d}/${m}/${y} a las ${h}`;
  }

  const router  = useRouter();
  const [estado,  setEstado]  = useState(estadoInicial ?? 'confirmada');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleReenviarWhatsApp = async () => {
    setResending(true);
    try {
      await reenviarWhatsApp(Number(id));
      Alert.alert('¡Mensaje Enviado!', `Se reenvió la confirmación de la cita por WhatsApp a ${cliente ?? 'el cliente'}.`);
    } catch (e) {
      Alert.alert('Error al reenviar', e.message);
    } finally {
      setResending(false);
    }
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color="#6366F1" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Cita</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Persona + Estado */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { borderColor: cfg.color }]}>
            <Text style={[styles.avatarText, { color: cfg.color }]}>{iniciales}</Text>
          </View>
          <Text style={styles.clienteNombre}>{cliente ?? 'Sin nombre'}</Text>
          
          <View style={[styles.estadoPill, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
            <View style={[styles.estadoDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.estadoLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Card de Información */}
        <View style={styles.infoCard}>

          {/* Fecha programada */}
          <View style={styles.infoFull}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text style={styles.infoLabel}>FECHA PROGRAMADA</Text>
            </View>
            <Text style={styles.infoValueLg}>{fechaProgramada || 'Fecha de la cita'}</Text>
          </View>
          <View style={styles.infoSeparator} />

          {/* Hora y Precio */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text style={styles.infoLabel}>HORA</Text>
              </View>
              <Text style={styles.infoValue}>{hora}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="cash-outline" size={12} color="#6B7280" />
                <Text style={styles.infoLabel}>PRECIO</Text>
              </View>
              <Text style={styles.infoValue}>
                {precio && precio !== '' ? `$${Number(precio).toLocaleString('es-MX')}` : 'N/D'}
              </Text>
            </View>
          </View>

          <View style={styles.infoSeparator} />

          {/* Servicio */}
          <View style={styles.infoFull}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="medical-outline" size={12} color="#6B7280" />
              <Text style={styles.infoLabel}>SERVICIO</Text>
            </View>
            <Text style={styles.infoValueLg}>{servicio}</Text>
          </View>

          {empleado ? (
            <>
              <View style={styles.infoSeparator} />
              <View style={styles.infoFull}>
                <View style={styles.infoLabelRow}>
                  <Ionicons name="person-outline" size={12} color="#6B7280" />
                  <Text style={styles.infoLabel}>PROFESIONAL ASIGNADO</Text>
                </View>
                <Text style={styles.infoValueLg}>{empleado}</Text>
              </View>
            </>
          ) : null}

          {/* Fecha de creación / agendada el */}
          <View style={styles.infoSeparator} />
          <View style={styles.infoFull}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="create-outline" size={12} color="#6B7280" />
              <Text style={styles.infoLabel}>FECHA DE REGISTRO</Text>
            </View>
            <Text style={styles.infoSubText}>
              {fechaRegistro || 'Registro automático'}
            </Text>
          </View>
        </View>

        {/* Acciones de Estado */}
        {loading ? (
          <ActivityIndicator color="#6366F1" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.accionesContainer}>
            <Text style={styles.accionesTitle}>ACTUALIZAR ESTADO</Text>
            {ACCIONES.filter(a => a.estado !== estado).map(accion => (
              <TouchableOpacity
                key={accion.estado}
                style={[styles.accionBtn, { backgroundColor: accion.bg, borderColor: accion.color + '30' }]}
                onPress={() => cambiarEstado(accion.estado)}
                activeOpacity={0.75}
              >
                <Ionicons name={accion.icon} size={18} color={accion.color} />
                <Text style={[styles.accionLabel, { color: accion.color }]}>{accion.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Botón Reenviar WhatsApp de Confirmación */}
            <TouchableOpacity
              style={styles.reenviarBtn}
              onPress={handleReenviarWhatsApp}
              disabled={resending}
              activeOpacity={0.8}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
                  <Text style={styles.reenviarBtnText}>Reenviar Confirmación por WhatsApp</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 64,
  },
  backText:  { fontSize: 14, color: '#6366F1', fontWeight: '600' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#F9FAFB', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Avatar Hero
  avatarSection: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '800' },
  clienteNombre: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', marginBottom: 8 },
  estadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Card de Información
  infoCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row' },
  infoItem: { flex: 1, padding: 16, alignItems: 'center' },
  infoDivider: { width: 1, backgroundColor: '#1F2937', marginVertical: 12 },
  infoFull: { padding: 16 },
  infoSeparator: { height: 1, backgroundColor: '#1F2937' },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2 },
  infoValue: { fontSize: 20, fontWeight: '800', color: '#F9FAFB', fontVariant: ['tabular-nums'] },
  infoValueLg: { fontSize: 15, fontWeight: '600', color: '#F3F4F6', marginTop: 1 },
  infoSubText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginTop: 1 },

  // Acciones
  accionesContainer: { gap: 8 },
  accionesTitle: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2, marginBottom: 4 },
  accionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accionLabel: { fontSize: 14, fontWeight: '600' },
  reenviarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  reenviarBtnText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
});
