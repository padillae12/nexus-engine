// app/admin/dashboard.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA ADMIN — Dashboard de estadísticas
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { getDashboardStats } from '../../services/api';

function StatCard({ emoji, label, value, trend, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '40' }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend ? <Text style={[styles.statTrend, { color }]}>{trend}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c5ce7" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Text style={styles.errorHint}>Verifica la conexión con el servidor</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Resumen de hoy</Text>
      <View style={styles.grid}>
        <StatCard emoji="📋" label="Citas hoy"        value={stats?.citasHoy ?? '—'}          color="#6c5ce7" />
        <StatCard emoji="👤" label="Clientes nuevos"  value={stats?.clientesNuevos ?? '—'}     color="#00ce6d" trend="+este mes" />
        <StatCard emoji="✅" label="Tasa asistencia"  value={stats?.tasaAsistencia ?? '—'}     color="#fdcb6e" />
        <StatCard emoji="💰" label="Ingresos est."    value={stats?.ingresosEstimados ?? '—'}  color="#00b894" />
      </View>

      {/* Placeholder para gráfica futura */}
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartIcon}>📈</Text>
        <Text style={styles.chartText}>Gráfica de citas — próximamente</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  errorText: { color: '#ff7675', fontSize: 16, marginBottom: 8 },
  errorHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  sectionTitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  statEmoji: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  statTrend: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  chartPlaceholder: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  chartIcon: { fontSize: 36, marginBottom: 10 },
  chartText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
});
