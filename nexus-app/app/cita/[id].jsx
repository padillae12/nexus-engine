// app/cita/[id].jsx
// ══════════════════════════════════════════════════════════════════
//  Detalle de una cita + botones de cambio de estado.
//  Accesible desde Modo Recepcionista Y Modo Admin.
// ══════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updateEstadoCita } from '../../services/api';

const ACCIONES = [
  { estado: 'completada', label: '✅ Marcar Completada', color: '#00ce6d' },
  { estado: 'cancelada',  label: '❌ Cancelar Cita',     color: '#ff7675' },
  { estado: 'pendiente',  label: '🔄 Marcar Pendiente',  color: '#fdcb6e' },
];

export default function DetalleCitaScreen() {
  const { id, hora, cliente, servicio, empleado, estado: estadoInicial, duracion_min } = useLocalSearchParams();
  const router = useRouter();
  const [estado, setEstado] = useState(estadoInicial ?? 'confirmada');
  const [loading, setLoading] = useState(false);

  const cambiarEstado = async (nuevoEstado) => {
    Alert.alert(
      'Cambiar estado',
      `¿Marcar esta cita como "${nuevoEstado}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
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
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Detalle de Cita</Text>
      </View>

      {/* Info de la cita */}
      <View style={styles.card}>
        <Text style={styles.horaGrande}>{hora}</Text>
        <Text style={styles.clienteNombre}>{cliente ?? 'Sin nombre'}</Text>
        <Text style={styles.servicio}>{servicio}</Text>
        {empleado ? <Text style={styles.empleado}>👤 {empleado}</Text> : null}
        {duracion_min ? <Text style={styles.duracion}>⏱ {duracion_min} minutos</Text> : null}

        <View style={styles.estadoBadge}>
          <Text style={styles.estadoText}>Estado: {estado}</Text>
        </View>
      </View>

      {/* Acciones */}
      <Text style={styles.accionesTitle}>Cambiar estado</Text>
      {loading
        ? <ActivityIndicator color="#6c5ce7" />
        : ACCIONES.filter(a => a.estado !== estado).map(accion => (
          <TouchableOpacity
            key={accion.estado}
            style={[styles.accionBtn, { borderColor: accion.color + '60' }]}
            onPress={() => cambiarEstado(accion.estado)}
          >
            <Text style={[styles.accionText, { color: accion.color }]}>{accion.label}</Text>
          </TouchableOpacity>
        ))
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#6c5ce7', fontSize: 16 },
  titulo: { fontSize: 17, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    padding: 24, marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
  },
  horaGrande: { fontSize: 42, fontWeight: '800', color: '#fff', marginBottom: 8 },
  clienteNombre: { fontSize: 20, fontWeight: '700', color: '#fff' },
  servicio: { fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  empleado: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  duracion: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  estadoBadge: {
    marginTop: 16, backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start',
  },
  estadoText: { color: '#6c5ce7', fontWeight: '600', fontSize: 13 },
  accionesTitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  accionBtn: {
    borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  accionText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
