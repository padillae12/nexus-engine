// app/admin/citas.jsx — Pantalla Admin: lista de citas con filtros
// Diseño Profesional & Ejecutivo (Zero Emojis)

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
    if (filtro === 'Hoy') {
      const d = new Date();
      params.fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (!['Todas', 'Hoy'].includes(filtro)) params.estado = filtro.toLowerCase();

    getCitas(params)
      .then(setCitas)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [filtro]);

  return (
    <View style={styles.container}>
      {/* Filtros de Segmentación */}
      <View style={styles.filtrosRow}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActive]}
            onPress={() => setFiltro(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filtroText, filtro === f && styles.filtroTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
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
                    id:           item.id,
                    fecha:        item.fecha ?? '',
                    hora:         item.hora,
                    cliente:      item.cliente ?? 'Sin nombre',
                    servicio:     item.servicio,
                    empleado:     item.empleado ?? '',
                    estado:       item.estado,
                    duracion_min: item.duracion_min,
                    precio:       item.precio ?? '',
                    creado_en:    item.creado_en ?? '',
                  },
                })}
              />
            )}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin registros para el filtro seleccionado</Text>
              </View>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  filtroBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#111827',
  },
  filtroBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filtroText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  filtroTextActive: { color: '#FFFFFF', fontWeight: '700' },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});
