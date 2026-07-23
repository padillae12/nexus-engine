// components/CitaCard.jsx
// ══════════════════════════════════════════════════════════════════
//  Tarjeta que muestra el resumen de una cita en la agenda.
// ══════════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ESTADO_CONFIG = {
  confirmada: { accent: '#00ce6d', bg: 'rgba(0,206,109,0.08)',   label: 'Confirmada' },
  pendiente:  { accent: '#fdcb6e', bg: 'rgba(253,203,110,0.08)', label: 'Pendiente'  },
  completada: { accent: '#6c5ce7', bg: 'rgba(108,92,231,0.08)',  label: 'Completada' },
  cancelada:  { accent: '#ff7675', bg: 'rgba(255,118,117,0.08)', label: 'Cancelada'  },
};

export default function CitaCard({ cita, onPress }) {
  const cfg = ESTADO_CONFIG[cita.estado] ?? ESTADO_CONFIG.pendiente;

  // Iniciales del cliente para mini-avatar
  const iniciales = (cita.cliente ?? 'SN')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.accent + '30' }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {/* Barra de acento lateral */}
      <View style={[styles.accentBar, { backgroundColor: cfg.accent }]} />

      {/* Hora */}
      <View style={styles.horaCol}>
        <Text style={styles.hora}>{cita.hora?.slice(0, 5)}</Text>
        <Text style={styles.duracion}>{cita.duracion_min}m</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Info */}
      <View style={styles.infoCol}>
        <View style={styles.infoTop}>
          {/* Mini avatar */}
          <View style={[styles.miniAvatar, { borderColor: cfg.accent }]}>
            <Text style={[styles.miniAvatarText, { color: cfg.accent }]}>{iniciales}</Text>
          </View>
          <Text style={styles.cliente} numberOfLines={1}>
            {cita.cliente ?? 'Sin nombre'}
          </Text>
        </View>
        <Text style={styles.servicio} numberOfLines={1}>{cita.servicio}</Text>
        {cita.empleado ? (
          <Text style={styles.empleado} numberOfLines={1}>👤 {cita.empleado}</Text>
        ) : null}
      </View>

      {/* Badge estado */}
      <View style={[styles.badge, { backgroundColor: cfg.accent + '20' }]}>
        <View style={[styles.badgeDot, { backgroundColor: cfg.accent }]} />
        <Text style={[styles.badgeText, { color: cfg.accent }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, marginBottom: 10,
    borderWidth: 1, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
    gap: 12,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },

  horaCol:  { width: 48, alignItems: 'center' },
  hora:     { fontSize: 15, fontWeight: '800', color: '#fff' },
  duracion: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, fontWeight: '600' },

  divider: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.08)' },

  infoCol: { flex: 1, gap: 3 },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  miniAvatar: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  miniAvatarText: { fontSize: 9, fontWeight: '800' },

  cliente:  { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  servicio: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  empleado: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
