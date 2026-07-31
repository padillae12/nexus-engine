// app/cita/[id].jsx
// ══════════════════════════════════════════════════════════════════
//  Detalle de Cita — Diseño Profesional con Íconos Vectoriales
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { updateEstadoCita, reenviarWhatsApp, getServicios, updateCitaServicioPrecio } from '../../services/api';

const ESTADO_CONFIG = {
  confirmada: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', label: 'CONFIRMADA' },
  pendiente:  { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)',  label: 'PENDIENTE'  },
  completada: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.08)',  label: 'COMPLETADA' },
  cancelada:  { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)',  label: 'CANCELADA'  },
};

const ACCIONES = [
  { estado: 'completada', label: 'Marcar como Completada', icon: 'checkmark-circle-outline', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
  { estado: 'cancelada',  label: 'Cancelar Cita',          icon: 'close-circle-outline',     color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)' },
  { estado: 'pendiente',  label: 'Marcar como Pendiente',   icon: 'time-outline',             color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
];

export default function DetalleCitaScreen() {
  const { id, fecha, hora, cliente, servicio, empleado, estado: estadoInicial, duracion_min, precio, creado_en, notas, indicaciones_postcita } =
    useLocalSearchParams();

  // Formatear fecha programada
  let fechaProgramada = fecha;
  if (fecha && fecha.includes('-')) {
    const [y, m, d] = fecha.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    fechaProgramada = dateObj.toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // Formatear fecha de creación
  let fechaRegistro = creado_en;
  if (creado_en && creado_en.includes(' ')) {
    const [f, h] = creado_en.split(' ');
    const [y, m, d] = f.split('-');
    fechaRegistro = `${d}/${m}/${y} a las ${h}`;
  }

  const router  = useRouter();
  const [estado,  setEstado]  = useState(estadoInicial ?? 'confirmada');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Estados editables de servicio, precio, notas y cuidados post-cita
  const [servicioNombre, setServicioNombre] = useState(servicio ?? '');
  const [precioValor, setPrecioValor] = useState(precio ?? '');
  const [notasValor, setNotasValor] = useState(notas ?? '');
  const [postcitaValor, setPostcitaValor] = useState(indicaciones_postcita ?? '');

  // Modal Edición de servicio / precio / notas / postcita
  const [modalEditar, setModalEditar] = useState(false);
  const [catServicios, setCatServicios] = useState([]);
  const [selectedServicioObj, setSelectedServicioObj] = useState(null);
  const [precioInput, setPrecioInput] = useState(String(precio ?? ''));
  const [notasInput, setNotasInput] = useState(notas ?? '');
  const [postcitaInput, setPostcitaInput] = useState(indicaciones_postcita ?? '');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenModalEditar = () => {
    getServicios()
      .then(servs => {
        setCatServicios(servs);
        const actual = servs.find(s => s.nombre === servicioNombre);
        if (actual) {
          setSelectedServicioObj(actual);
          if (!postcitaValor && actual.indicaciones_postcita) {
            setPostcitaInput(actual.indicaciones_postcita);
          }
        }
      })
      .catch(console.warn);
    setPrecioInput(String(precioValor ?? ''));
    setNotasInput(notasValor ?? '');
    setPostcitaInput(postcitaValor ?? '');
    setModalEditar(true);
  };

  const handleGuardarServicioPrecio = async () => {
    setSavingEdit(true);
    try {
      const servicioId = selectedServicioObj?.id || null;
      const numPrecio = precioInput.trim() !== '' ? Number(precioInput) : null;
      const strNotas = notasInput.trim() !== '' ? notasInput.trim() : null;
      const strPostcita = postcitaInput.trim() !== '' ? postcitaInput.trim() : null;

      await updateCitaServicioPrecio(Number(id), {
        servicioId,
        precio: numPrecio,
        notas: strNotas,
        indicacionesPostcita: strPostcita,
      });

      if (selectedServicioObj?.nombre) {
        setServicioNombre(selectedServicioObj.nombre);
      }
      setPrecioValor(numPrecio !== null ? String(numPrecio) : '');
      setNotasValor(strNotas || '');
      setPostcitaValor(strPostcita || '');
      setModalEditar(false);
      Alert.alert('¡Actualizado!', 'El servicio, precio e indicaciones post-cita han sido guardados.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReenviarWhatsApp = async () => {
    setResending(true);
    try {
      await reenviarWhatsApp(Number(id));
      Alert.alert('¡Mensaje Enviado!', `Se reenvió la confirmación de la cita por WhatsApp a ${cliente ?? 'el cliente'}.`);
    } catch (e) {
      Alert.alert('Error al reenviar', e.message);
    } finally {
      setResending(false);
    }
  };

  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.pendiente;

  // Iniciales del cliente para el avatar
  const iniciales = (cliente ?? 'SN')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const cambiarEstado = (nuevoEstado) => {
    const accion = ACCIONES.find(a => a.estado === nuevoEstado);
    Alert.alert(
      accion.label,
      `¿Confirmas cambiar el estado a "${ESTADO_CONFIG[nuevoEstado].label}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              await updateEstadoCita(Number(id), nuevoEstado);
              setEstado(nuevoEstado);
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color="#6366F1" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Cita</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Persona + Estado */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { borderColor: cfg.color }]}>
            <Text style={[styles.avatarText, { color: cfg.color }]}>{iniciales}</Text>
          </View>
          <Text style={styles.clienteNombre}>{cliente ?? 'Sin nombre'}</Text>
          
          <View style={[styles.estadoPill, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
            <View style={[styles.estadoDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.estadoLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Card de Información */}
        <View style={styles.infoCard}>

          {/* Fecha programada */}
          <View style={styles.infoFull}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text style={styles.infoLabel}>FECHA PROGRAMADA</Text>
            </View>
            <Text style={styles.infoValueLg}>{fechaProgramada || 'Fecha de la cita'}</Text>
          </View>
          <View style={styles.infoSeparator} />

          {/* Hora y Precio */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text style={styles.infoLabel}>HORA</Text>
              </View>
              <Text style={styles.infoValue}>{hora}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="cash-outline" size={12} color="#6B7280" />
                <Text style={styles.infoLabel}>PRECIO</Text>
              </View>
              <Text style={styles.infoValue}>
                {precioValor && precioValor !== '' ? `$${Number(precioValor).toLocaleString('es-MX')}` : 'N/D'}
              </Text>
            </View>
          </View>

          <View style={styles.infoSeparator} />

          {/* Servicio */}
          <View style={styles.infoFull}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="medical-outline" size={12} color="#6B7280" />
              <Text style={styles.infoLabel}>SERVICIO</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.infoValueLg}>{servicioNombre}</Text>
              <TouchableOpacity
                style={styles.editServicioChip}
                onPress={handleOpenModalEditar}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={12} color="#6366F1" />
                <Text style={styles.editServicioChipText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {empleado ? (
            <>
              <View style={styles.infoSeparator} />
              <View style={styles.infoFull}>
                <View style={styles.infoLabelRow}>
                  <Ionicons name="person-outline" size={12} color="#6B7280" />
                  <Text style={styles.infoLabel}>PROFESIONAL ASIGNADO</Text>
                </View>
                <Text style={styles.infoValueLg}>{empleado}</Text>
              </View>
            </>
          ) : null}

          {/* Notas / Detalles adicionales */}
          {notasValor ? (
            <>
              <View style={styles.infoSeparator} />
              <View style={styles.infoFull}>
                <View style={styles.infoLabelRow}>
                  <Ionicons name="document-text-outline" size={12} color="#6B7280" />
                  <Text style={styles.infoLabel}>DESCRIPCIÓN / NOTAS DEL SERVICIO</Text>
                </View>
                <Text style={styles.infoSubText}>{notasValor}</Text>
              </View>
            </>
          ) : null}

          {/* Cuidados Post-Cita Personalizados */}
          <View style={styles.infoSeparator} />
          <View style={styles.infoFull}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="medkit-outline" size={12} color="#10B981" />
                <Text style={[styles.infoLabel, { color: '#10B981' }]}>CUIDADOS POST-CITA (WHATSAPP)</Text>
              </View>
              <TouchableOpacity
                style={styles.editServicioChip}
                onPress={handleOpenModalEditar}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={12} color="#6366F1" />
                <Text style={styles.editServicioChipText}>Personalizar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoSubText}>
              {postcitaValor || 'Sin indicaciones personalizadas (se usará el valor por defecto del catálogo).'}
            </Text>
          </View>

          {/* Fecha de creación / agendada el */}
          <View style={styles.infoSeparator} />
          <View style={styles.infoFull}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="create-outline" size={12} color="#6B7280" />
              <Text style={styles.infoLabel}>FECHA DE REGISTRO</Text>
            </View>
            <Text style={styles.infoSubText}>
              {fechaRegistro || 'Registro automático'}
            </Text>
          </View>
        </View>

        {/* Acciones de Estado */}
        {loading ? (
          <ActivityIndicator color="#6366F1" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.accionesContainer}>
            <Text style={styles.accionesTitle}>ACTUALIZAR ESTADO</Text>
            {ACCIONES.filter(a => a.estado !== estado).map(accion => (
              <TouchableOpacity
                key={accion.estado}
                style={[styles.accionBtn, { backgroundColor: accion.bg, borderColor: accion.color + '30' }]}
                onPress={() => cambiarEstado(accion.estado)}
                activeOpacity={0.75}
              >
                <Ionicons name={accion.icon} size={18} color={accion.color} />
                <Text style={[styles.accionLabel, { color: accion.color }]}>{accion.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Botón Reenviar WhatsApp de Confirmación */}
            <TouchableOpacity
              style={styles.reenviarBtn}
              onPress={handleReenviarWhatsApp}
              disabled={resending}
              activeOpacity={0.8}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
                  <Text style={styles.reenviarBtnText}>Reenviar Confirmación por WhatsApp</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Edición de Servicio y Precio */}
      <Modal visible={modalEditar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustar Servicio / Precio / Cuidados</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalEditar(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>SELECCIONAR SERVICIO ATENDIDO:</Text>
            <ScrollView style={{ maxHeight: 180, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              {catServicios.map(srv => {
                const isSel = selectedServicioObj?.id === srv.id;
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[styles.srvOptionRow, isSel && styles.srvOptionRowSelected]}
                    onPress={() => {
                      setSelectedServicioObj(srv);
                      if (srv.precio != null) setPrecioInput(String(srv.precio));
                      if (srv.indicaciones_postcita && !postcitaInput) setPostcitaInput(srv.indicaciones_postcita);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSel ? "radio-button-on" : "radio-button-off"}
                      size={16}
                      color={isSel ? "#6366F1" : "#6B7280"}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.srvOptionName, isSel && styles.srvOptionNameSelected]}>{srv.nombre}</Text>
                      <Text style={styles.srvOptionPrice}>
                        ${srv.precio != null ? Number(srv.precio).toLocaleString('es-MX') : 'Variable'} · {srv.duracion_min || 60} min
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>PRECIO FINAL A COBRAR ($ MXN):</Text>
            <TextInput
              style={styles.precioInput}
              value={precioInput}
              onChangeText={setPrecioInput}
              keyboardType="numeric"
              placeholder="Ej. 800"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.inputLabel}>CUIDADOS POST-CITA (RECOMENDACIONES PARA EL PACIENTE):</Text>
            <TextInput
              style={[styles.precioInput, { height: 75, textAlignVertical: 'top', paddingTop: 10 }]}
              value={postcitaInput}
              onChangeText={setPostcitaInput}
              multiline
              numberOfLines={3}
              placeholder="Ej. Tomar Amoxicilina 500mg c/8h por 5 días, reposo 24h..."
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.inputLabel}>DESCRIPCIÓN / NOTAS INTERNAS DEL SERVICIO (OPCIONAL):</Text>
            <TextInput
              style={[styles.precioInput, { height: 60, textAlignVertical: 'top', paddingTop: 10 }]}
              value={notasInput}
              onChangeText={setNotasInput}
              multiline
              numberOfLines={2}
              placeholder="Ej. Se realizaron 2 resinas compuestas + profilaxis..."
              placeholderTextColor="#6B7280"
            />

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleGuardarServicioPrecio}
              disabled={savingEdit}
              activeOpacity={0.8}
            >
              {savingEdit ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveModalBtnText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 64,
  },
  backText:  { fontSize: 14, color: '#6366F1', fontWeight: '600' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#F9FAFB', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Avatar Hero
  avatarSection: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '800' },
  clienteNombre: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', marginBottom: 8 },
  estadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Card de Información
  infoCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row' },
  infoItem: { flex: 1, padding: 16, alignItems: 'center' },
  infoDivider: { width: 1, backgroundColor: '#1F2937', marginVertical: 12 },
  infoFull: { padding: 16 },
  infoSeparator: { height: 1, backgroundColor: '#1F2937' },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2 },
  infoValue: { fontSize: 20, fontWeight: '800', color: '#F9FAFB', fontVariant: ['tabular-nums'] },
  infoValueLg: { fontSize: 15, fontWeight: '600', color: '#F3F4F6', marginTop: 1 },
  infoSubText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginTop: 1 },

  editServicioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editServicioChipText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },

  // Acciones
  accionesContainer: { gap: 8 },
  accionesTitle: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2, marginBottom: 4 },
  accionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accionLabel: { fontSize: 14, fontWeight: '600' },
  reenviarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  reenviarBtnText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: { color: '#6B7280', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  srvOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#161E2E',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  srvOptionRowSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  srvOptionName: { color: '#F3F4F6', fontSize: 13, fontWeight: '600' },
  srvOptionNameSelected: { color: '#6366F1', fontWeight: '700' },
  srvOptionPrice: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  precioInput: {
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  saveModalBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveModalBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
