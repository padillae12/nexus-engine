// app/admin/citas.jsx — Pantalla Admin: lista de citas con filtros
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import CitaCard from '../../components/CitaCard';
import { getCitas } from '../../services/api';

const FILTROS = ['Todas', 'Hoy', 'Confirmadas', 'Completadas', 'Canceladas'];

export default function CitasScreen() {
  const router = useRouter();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Hoy');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filtro === 'Hoy') params.fecha = new Date().toISOString().slice(0, 10);
    if (!['Todas', 'Hoy'].includes(filtro)) params.estado = filtro.toLowerCase();

    getCitas(params)
      .then(setCitas)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [filtro]);

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filtrosRow}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActive]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroText, filtro === f && styles.filtroTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color="#6c5ce7" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={citas}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <CitaCard
                cita={item}
                onPress={() => router.push({
                  pathname: '/cita/[id]',
                  params: {
                    id:          item.id,
                    fecha:       item.fecha ?? '',
                    hora:        item.hora,
                    cliente:     item.cliente ?? 'Sin nombre',
                    servicio:    item.servicio,
                    empleado:    item.empleado ?? '',
                    estado:      item.estado,
                    duracion_min: item.duracion_min,
                    precio:      item.precio ?? '',
                    creado_en:   item.creado_en ?? '',
                  },
                })}
              />
            )}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin citas para este filtro</Text>
              </View>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  filtroBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filtroBtnActive: { backgroundColor: '#6c5ce7', borderColor: '#6c5ce7' },
  filtroText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  filtroTextActive: { color: '#fff', fontWeight: '600' },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
});
