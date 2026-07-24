// app/admin/dashboard.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA ADMIN — Dashboard Ejecutivo (Zero Emojis)
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { getDashboardStats, getIngresosDiarios } from '../../services/api';

// Tarjeta de métrica ejecutiva
function StatCard({ label, value, trend, color }) {
  return (
    <View style={[styles.statCard, { borderColor: '#1F2937' }]}>
      <View style={styles.statHeaderRow}>
        <View style={[styles.statDot, { backgroundColor: color }]} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      {trend ? <Text style={[styles.statTrend, { color }]}>{trend}</Text> : null}
    </View>
  );
}

// Fila de ingreso diario en la tabla
function IngresoRow({ fecha, citas, total, isHoy }) {
  const fechaObj  = new Date(fecha + 'T12:00:00');
  const diasSem   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaSem    = diasSem[fechaObj.getDay()];
  const dia       = fechaObj.getDate();
  const mes       = fechaObj.toLocaleString('es-MX', { month: 'short' });

  return (
    <View style={[styles.ingresoRow, isHoy && styles.ingresoRowHoy]}>
      {/* Fecha */}
      <View style={styles.ingresoFechaWrap}>
        {isHoy && <Text style={styles.ingresoHoyTag}>HOY</Text>}
        <Text style={[styles.ingresoDia, isHoy && { color: '#6366F1' }]}>
          {`${diaSem} ${dia}`}
        </Text>
        <Text style={styles.ingresoMes}>{mes}</Text>
      </View>

      {/* Citas */}
      <View style={styles.ingresoCitasWrap}>
        <Text style={styles.ingresoCitasNum}>{citas}</Text>
        <Text style={styles.ingresoCitasLabel}>cita{citas !== 1 ? 's' : ''}</Text>
      </View>

      {/* Total */}
      <Text style={[styles.ingresoTotal, { color: total > 0 ? '#10B981' : '#6B7280' }]}>
        ${Number(total).toLocaleString('es-MX')}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [stats,    setStats]    = useState(null);
  const [ingresos, setIngresos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setError(null);
      const [s, ing] = await Promise.all([
        getDashboardStats(),
        getIngresosDiarios(),
      ]);
      setStats(s);
      setIngresos(ing);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, []);

  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error al cargar métricas: {error}</Text>
        <TouchableOpacity onPress={cargarDatos} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);

  // Total del mes actual
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);
  const totalMes = ingresos
    .filter(d => d.fecha >= inicioMesStr)
    .reduce((acc, d) => acc + Number(d.total), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      {/* ── Stats grid ───────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO</Text>
      <View style={styles.grid}>
        <StatCard label="Citas hoy"       value={stats?.citasHoy ?? '—'}      color="#6366F1" />
        <StatCard label="Citas mañana"    value={stats?.citasManana ?? '—'}   color="#818CF8" />
        <StatCard label="Clientes nuevos" value={stats?.clientesNuevos ?? '—'} color="#10B981" trend="+este mes" />
        <StatCard label="Tasa asistencia" value={stats?.tasaAsistencia ?? '—'} color="#F59E0B" />
        <StatCard label="Ingresos del día" value={stats?.ingresosHoy ?? '$0'}  color="#34D399" />
      </View>

      {/* ── Resumen del mes ───────────────────────────────────── */}
      <View style={styles.mesBanner}>
        <View>
          <Text style={styles.mesBannerLabel}>INGRESOS DEL MES (ACUMULADO)</Text>
          <Text style={styles.mesBannerValue}>
            ${totalMes.toLocaleString('es-MX')} MXN
          </Text>
        </View>
      </View>

      {/* ── Historial por día ─────────────────────────────────── */}
      <View style={styles.historialHeader}>
        <Text style={styles.sectionTitle}>HISTORIAL DE INGRESOS</Text>
        <Text style={styles.historialSub}>Últimos 60 días · Citas completadas</Text>
      </View>

      {ingresos.length === 0 ? (
        <View style={styles.emptyHistorial}>
          <Text style={styles.emptyText}>Sin historial de citas completadas</Text>
          <Text style={styles.emptyHint}>Los ingresos se registrarán cuando las citas se marquen como completadas.</Text>
        </View>
      ) : (
        <View style={styles.historialCard}>
          {/* Header de columnas */}
          <View style={styles.historialColHeader}>
            <Text style={[styles.colLabel, { flex: 1.4 }]}>FECHA</Text>
            <Text style={[styles.colLabel, { flex: 0.8, textAlign: 'center' }]}>CITAS</Text>
            <Text style={[styles.colLabel, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
          </View>
          <View style={styles.historialDivider} />

          {ingresos.map((d, i) => (
            <View key={d.fecha}>
              <IngresoRow
                fecha={d.fecha}
                citas={Number(d.citas_completadas)}
                total={Number(d.total)}
                isHoy={d.fecha === hoy}
              />
              {i < ingresos.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  content:   { padding: 20, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F17', padding: 24 },
  errorText: { color: '#EF4444', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  retryBtn:  { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  retryText: { color: '#6366F1', fontWeight: '600', fontSize: 13 },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Stats Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
    fontVariant: ['tabular-nums'],
  },
  statTrend: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // Mes Banner
  mesBanner: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#6366F1',
    marginBottom: 24,
  },
  mesBannerLabel: { fontSize: 10, color: '#6366F1', letterSpacing: 1.2, fontWeight: '700', marginBottom: 4 },
  mesBannerValue: { fontSize: 26, fontWeight: '800', color: '#F9FAFB', fontVariant: ['tabular-nums'] },

  // Historial Header
  historialHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  historialSub:    { fontSize: 11, color: '#6B7280', flex: 1, textAlign: 'right' },

  // Historial Card / Table
  historialCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  historialColHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#161E2E',
  },
  colLabel: { fontSize: 9, color: '#6B7280', letterSpacing: 1, fontWeight: '700' },
  historialDivider: { height: 1, backgroundColor: '#1F2937' },
  rowDivider:       { height: 1, backgroundColor: '#1F2937' },

  // Fila de ingreso
  ingresoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ingresoRowHoy: { backgroundColor: 'rgba(99, 102, 241, 0.06)' },
  ingresoFechaWrap: { flex: 1.4 },
  ingresoHoyTag: { fontSize: 8, color: '#6366F1', fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  ingresoDia:  { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  ingresoMes:  { fontSize: 11, color: '#6B7280' },
  ingresoCitasWrap: { flex: 0.8, alignItems: 'center' },
  ingresoCitasNum:  { fontSize: 14, fontWeight: '700', color: '#F3F4F6' },
  ingresoCitasLabel: { fontSize: 10, color: '#6B7280' },
  ingresoTotal: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },

  // Empty
  emptyHistorial: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937' },
  emptyText: { color: '#E5E7EB', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  emptyHint: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
});
