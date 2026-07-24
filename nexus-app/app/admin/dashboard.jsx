// app/admin/dashboard.jsx
// ══════════════════════════════════════════════════════════════════
//  PANTALLA ADMIN — Dashboard de estadísticas + ingresos diarios
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { getDashboardStats, getIngresosDiarios } from '../../services/api';

// ── Tarjeta de estadística ─────────────────────────────────────────
function StatCard({ emoji, label, value, trend, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '40' }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Text style={styles.statEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend ? <Text style={[styles.statTrend, { color }]}>{trend}</Text> : null}
    </View>
  );
}

// ── Fila de ingreso diario ─────────────────────────────────────────
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
        <Text style={[styles.ingresoDia, isHoy && { color: '#6c5ce7' }]}>
          {isHoy ? `${diaSem} ${dia}` : `${diaSem} ${dia}`}
        </Text>
        <Text style={styles.ingresoMes}>{mes}</Text>
      </View>

      {/* Citas */}
      <View style={styles.ingresoCitasWrap}>
        <Text style={styles.ingresoCitasNum}>{citas}</Text>
        <Text style={styles.ingresoCitasLabel}>cita{citas !== 1 ? 's' : ''}</Text>
      </View>

      {/* Total */}
      <Text style={[styles.ingresoTotal, { color: total > 0 ? '#00ce6d' : 'rgba(255,255,255,0.3)' }]}>
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
        <ActivityIndicator size="large" color="#6c5ce7" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity onPress={cargarDatos} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);

  // Calcular total del mes (citas del mes actual en los datos)
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c5ce7" />}
    >
      {/* ── Stats grid ───────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Resumen</Text>
      <View style={styles.grid}>
        <StatCard emoji="📋" label="Citas hoy"       value={stats?.citasHoy ?? '—'}      color="#6c5ce7" />
        <StatCard emoji="🌅" label="Citas mañana"    value={stats?.citasManana ?? '—'}   color="#a29bfe" />
        <StatCard emoji="👤" label="Clientes nuevos" value={stats?.clientesNuevos ?? '—'} color="#00ce6d" trend="+este mes" />
        <StatCard emoji="✅" label="Tasa asistencia" value={stats?.tasaAsistencia ?? '—'} color="#fdcb6e" />
        <StatCard emoji="💰" label="Ingresos del día" value={stats?.ingresosHoy ?? '$0'}  color="#00b894" />
      </View>

      {/* ── Resumen del mes ───────────────────────────────────── */}
      <View style={styles.mesBanner}>
        <View>
          <Text style={styles.mesBannerLabel}>INGRESOS DEL MES</Text>
          <Text style={styles.mesBannerValue}>
            ${totalMes.toLocaleString('es-MX')}
          </Text>
        </View>
        <Text style={styles.mesBannerIcon}>📊</Text>
      </View>

      {/* ── Historial por día ─────────────────────────────────── */}
      <View style={styles.historialHeader}>
        <Text style={styles.sectionTitle}>Historial de ingresos</Text>
        <Text style={styles.historialSub}>últimos 60 días · solo completadas</Text>
      </View>

      {ingresos.length === 0 ? (
        <View style={styles.emptyHistorial}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Sin citas completadas aún</Text>
          <Text style={styles.emptyHint}>Los ingresos aparecen cuando el empleado marca una cita como completada</Text>
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
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content:   { padding: 20, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', padding: 24 },
  errorText: { color: '#ff7675', fontSize: 16, marginBottom: 16, textAlign: 'center' },
  retryBtn:  { backgroundColor: 'rgba(108,92,231,0.2)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#6c5ce7', fontWeight: '700' },

  sectionTitle: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12,
  },

  // Stats
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 16, borderWidth: 1,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statEmoji:   { fontSize: 20 },
  statValue:   { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  statTrend:   { fontSize: 11, fontWeight: '600', marginTop: 6 },

  // Mes banner
  mesBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.3)',
    marginBottom: 24,
  },
  mesBannerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, marginBottom: 6 },
  mesBannerValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  mesBannerIcon:  { fontSize: 32 },

  // Historial header
  historialHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  historialSub:    { fontSize: 11, color: 'rgba(255,255,255,0.25)', flex: 1 },

  // Historial card
  historialCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  historialColHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
  },
  colLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: '700' },
  historialDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  rowDivider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },

  // Fila de ingreso
  ingresoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  ingresoRowHoy: { backgroundColor: 'rgba(108,92,231,0.08)' },
  ingresoFechaWrap: { flex: 1.4 },
  ingresoHoyTag: { fontSize: 8, color: '#6c5ce7', fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  ingresoDia:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  ingresoMes:  { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  ingresoCitasWrap: { flex: 0.8, alignItems: 'center' },
  ingresoCitasNum:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  ingresoCitasLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  ingresoTotal: { flex: 1, textAlign: 'right', fontSize: 15, fontWeight: '800' },

  // Empty
  emptyHistorial: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
