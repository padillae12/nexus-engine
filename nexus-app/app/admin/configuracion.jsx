// app/admin/configuracion.jsx — Pantalla Admin: configuración del negocio
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

  if (loading) return <ActivityIndicator color="#6c5ce7" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Estado del servidor */}
      <Text style={styles.sectionTitle}>Estado del Servidor</Text>
      <View style={[styles.healthCard, { borderColor: apiOnline ? '#00ce6d40' : '#ff767540' }]}>
        <Text style={styles.healthDot}>{apiOnline ? '🟢' : '🔴'}</Text>
        <View>
          <Text style={styles.healthLabel}>API Nexus-Engine</Text>
          <Text style={[styles.healthStatus, { color: apiOnline ? '#00ce6d' : '#ff7675' }]}>
            {apiOnline ? 'Online' : 'Sin conexión'}
          </Text>
        </View>
      </View>

      {/* Configuración del negocio */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Configuración Actual</Text>
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
        Para modificar la configuración, edita la tabla `config_negocio` en la base de datos.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  healthCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 16, borderWidth: 1,
  },
  healthDot: { fontSize: 24 },
  healthLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  healthStatus: { fontSize: 13, marginTop: 2 },
  configList: { gap: 2 },
  configRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 2,
  },
  configInfo: { flex: 1 },
  configLabel: { color: '#fff', fontSize: 14 },
  configDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  configValor: {
    backgroundColor: 'rgba(108,92,231,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  configValorText: { color: '#6c5ce7', fontSize: 13, fontWeight: '600' },
  emptyText: { color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 30 },
  hint: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 20, lineHeight: 18 },
});
