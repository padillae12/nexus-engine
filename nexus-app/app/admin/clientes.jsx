// app/admin/clientes.jsx — Pantalla Admin: lista de clientes registrados por el bot
// Diseño Profesional & Ejecutivo (Zero Emojis)

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getClientes } from '../../services/api';

function ClienteRow({ cliente }) {
  const inicial = (cliente.nombre ?? '?')[0].toUpperCase();
  const fechaStr = cliente.creado_en
    ? new Date(cliente.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{inicial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{cliente.nombre ?? 'Sin nombre'}</Text>
        <Text style={styles.telefono}>{cliente.telefono}</Text>
      </View>
      <View style={styles.metaCol}>
        <Text style={styles.citasCount}>{cliente.total_citas ?? 0} citas</Text>
        <Text style={styles.fecha}>{fechaStr}</Text>
      </View>
    </View>
  );
}

export default function ClientesScreen() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientes()
      .then(setClientes)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>DIRECTORIO DE CLIENTES</Text>
        <Text style={styles.headerCount}>{clientes.length} registrados</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <ClienteRow cliente={item} />}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Sin clientes registrados en la base de datos</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerCount: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#F9FAFB', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  nombre: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  telefono: { color: '#6B7280', fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  metaCol: { alignItems: 'flex-end' },
  citasCount: { color: '#6366F1', fontSize: 11, fontWeight: '700' },
  fecha: { color: '#6B7280', fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});
