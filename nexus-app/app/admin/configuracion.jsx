// app/admin/configuracion.jsx — Pantalla Admin: configuración del negocio
// Diseño Profesional & Ejecutivo (Zero Emojis)

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { getConfig, checkHealth } from '../../services/api';

function ConfigRow({ label, valor, descripcion }) {
  return (
    <View style={styles.configRow}>
      <View style={styles.configInfo}>
        <Text style={styles.configLabel}>{label}</Text>
        {descripcion ? <Text style={styles.configDesc}>{descripcion}</Text> : null}
      </View>
      <View style={styles.configValor}>
        <Text style={styles.configValorText}>{String(valor)}</Text>
      </View>
    </View>
  );
}

export default function ConfiguracionScreen() {
  const [config, setConfig] = useState(null);
  const [apiOnline, setApiOnline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getConfig(), checkHealth()])
      .then(([cfg, health]) => {
        setConfig(cfg);
        setApiOnline(health);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color="#6366F1" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Estado del servidor */}
      <Text style={styles.sectionTitle}>ESTADO DEL SERVIDOR</Text>
      <View style={[styles.healthCard, { borderColor: apiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
        <View style={[styles.healthDot, { backgroundColor: apiOnline ? '#10B981' : '#EF4444' }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.healthLabel}>API Nexus-Engine</Text>
          <Text style={[styles.healthStatus, { color: apiOnline ? '#10B981' : '#EF4444' }]}>
            {apiOnline ? 'Conexión activa · En línea' : 'Servidor sin respuesta'}
          </Text>
        </View>
      </View>

      {/* Configuración del negocio */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PARÁMETROS DEL SISTEMA</Text>
      {config ? (
        <View style={styles.configList}>
          <ConfigRow label="Min. anticipación" valor={`${config.MIN_BOOKING_HOURS}h`} descripcion="Para agendar una cita" />
          <ConfigRow label="Máx. días a futuro" valor={`${config.MAX_BOOKING_DAYS} días`} />
          <ConfigRow label="Límite cancelación" valor={`${config.CANCEL_HOURS_LIMIT}h antes`} />
          <ConfigRow label="Ofrecer reagendar" valor={config.OFFER_RESCHEDULE === 'true' ? 'Sí' : 'No'} />
          <ConfigRow label="Selección empleado" valor={config.EMPLOYEE_SELECTION === 'true' ? 'Sí' : 'No'} />
          <ConfigRow label="Nombre del bot" valor={config.BOT_NAME} />
        </View>
      ) : (
        <Text style={styles.emptyText}>No se pudo cargar la configuración</Text>
      )}

      <Text style={styles.hint}>
        Nota: Para modificar estos parámetros, edite los valores correspondientes en la tabla config_negocio de MariaDB.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthLabel: { color: '#F9FAFB', fontWeight: '700', fontSize: 14 },
  healthStatus: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  configList: { gap: 6 },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  configInfo: { flex: 1 },
  configLabel: { color: '#F3F4F6', fontSize: 13, fontWeight: '600' },
  configDesc: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  configValor: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  configValorText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 30, fontSize: 13 },
  hint: { color: '#6B7280', fontSize: 11, marginTop: 24, lineHeight: 16 },
});
