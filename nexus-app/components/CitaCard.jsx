// components/CitaCard.jsx
// ══════════════════════════════════════════════════════════════════
//  Tarjeta de cita — Diseño Profesional & Ejecutivo (Zero Emojis)
// ══════════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ESTADO_CONFIG = {
  confirmada: { accent: '#10B981', bg: 'rgba(16, 185, 129, 0.06)', label: 'CONFIRMADA' },
  pendiente:  { accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)',  label: 'PENDIENTE'  },
  completada: { accent: '#6366F1', bg: 'rgba(99, 102, 241, 0.06)',  label: 'COMPLETADA' },
  cancelada:  { accent: '#EF4444', bg: 'rgba(239, 68, 68, 0.06)',  label: 'CANCELADA'  },
};

export default function CitaCard({ cita, onPress }) {
  const cfg = ESTADO_CONFIG[cita.estado] ?? ESTADO_CONFIG.pendiente;

  // Iniciales del cliente para el avatar
  const iniciales = (cita.cliente ?? 'SN')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: '#111827', borderColor: '#1F2937' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Barra de acento lateral de estado */}
      <View style={[styles.accentBar, { backgroundColor: cfg.accent }]} />

      {/* Columna de hora */}
      <View style={styles.horaCol}>
        <Text style={styles.hora}>{cita.hora?.slice(0, 5)}</Text>
        <Text style={styles.duracion}>{cita.duracion_min}m</Text>
      </View>

      <View style={styles.divider} />

      {/* Info principal */}
      <View style={styles.infoCol}>
        <View style={styles.infoTop}>
          <View style={[styles.miniAvatar, { borderColor: '#374151', backgroundColor: '#1F2937' }]}>
            <Text style={styles.miniAvatarText}>{iniciales}</Text>
          </View>
          <Text style={styles.cliente} numberOfLines={1}>
            {cita.cliente ?? 'Sin nombre'}
          </Text>
        </View>

        <Text style={styles.servicio} numberOfLines={1}>{cita.servicio}</Text>

        {cita.empleado ? (
          <Text style={styles.empleado} numberOfLines={1}>Atiende: {cita.empleado}</Text>
        ) : null}
      </View>

      {/* Badge de estado */}
      <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.accent + '35' }]}>
        <View style={[styles.badgeDot, { backgroundColor: cfg.accent }]} />
        <Text style={[styles.badgeText, { color: cfg.accent }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingRight: 14,
    gap: 12,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  horaCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hora: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
    fontVariant: ['tabular-nums'],
  },
  duracion: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: '#1F2937',
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  cliente: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    flex: 1,
  },
  servicio: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  empleado: {
    fontSize: 11,
    color: '#6B7280',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
