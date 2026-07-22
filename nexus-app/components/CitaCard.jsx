// components/CitaCard.jsx
// ══════════════════════════════════════════════════════════════════
//  Tarjeta que muestra el resumen de una cita en la agenda.
// ══════════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ESTADO_COLORS = {
  confirmada:  { bg: 'rgba(0,206,109,0.12)',  dot: '#00ce6d', label: 'Confirmada' },
  pendiente:   { bg: 'rgba(253,203,110,0.12)', dot: '#fdcb6e', label: 'Pendiente' },
  completada:  { bg: 'rgba(108,92,231,0.12)', dot: '#6c5ce7', label: 'Completada' },
  cancelada:   { bg: 'rgba(255,118,117,0.12)', dot: '#ff7675', label: 'Cancelada' },
};

/**
 * @param {object} cita - { id, hora, cliente, servicio, duracion_min, estado, empleado? }
 * @param {function} onPress - callback al tocar la tarjeta
 */
export default function CitaCard({ cita, onPress }) {
  const estilo = ESTADO_COLORS[cita.estado] ?? ESTADO_COLORS.pendiente;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: estilo.bg }]} onPress={onPress} activeOpacity={0.75}>
      {/* Franja de hora */}
      <View style={styles.horaCol}>
        <Text style={styles.hora}>{cita.hora}</Text>
        <Text style={styles.duracion}>{cita.duracion_min} min</Text>
      </View>

      {/* Separador */}
      <View style={[styles.linea, { backgroundColor: estilo.dot }]} />

      {/* Info */}
      <View style={styles.infoCol}>
        <Text style={styles.cliente} numberOfLines={1}>{cita.cliente ?? 'Sin nombre'}</Text>
        <Text style={styles.servicio} numberOfLines={1}>{cita.servicio}</Text>
        {cita.empleado ? (
          <Text style={styles.empleado}>👤 {cita.empleado}</Text>
        ) : null}
      </View>

      {/* Badge de estado */}
      <View style={[styles.badge, { borderColor: estilo.dot }]}>
        <View style={[styles.badgeDot, { backgroundColor: estilo.dot }]} />
        <Text style={[styles.badgeText, { color: estilo.dot }]}>{estilo.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  horaCol: {
    width: 52,
    alignItems: 'center',
  },
  hora: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  duracion: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  linea: {
    width: 3,
    height: 44,
    borderRadius: 2,
  },
  infoCol: {
    flex: 1,
  },
  cliente: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  servicio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  empleado: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
