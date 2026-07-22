// app/admin/clientes.jsx — Pantalla Admin: lista de clientes del bot
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getClientes } from '../../services/api';

function ClienteRow({ cliente }) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(cliente.nombre ?? '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{cliente.nombre ?? 'Sin nombre'}</Text>
        <Text style={styles.telefono}>{cliente.telefono}</Text>
      </View>
      <Text style={styles.fecha}>{new Date(cliente.creado_en).toLocaleDateString('es-MX')}</Text>
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
      <Text style={styles.header}>Total: {clientes.length} clientes</Text>
      {loading
        ? <ActivityIndicator color="#6c5ce7" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={clientes}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => <ClienteRow cliente={item} />}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Sin clientes registrados aún</Text>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { padding: 16, color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6c5ce7', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  nombre: { color: '#fff', fontSize: 15, fontWeight: '600' },
  telefono: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 },
  fecha: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  emptyText: { textAlign: 'center', color: 'rgba(255,255,255,0.35)', marginTop: 60 },
});
