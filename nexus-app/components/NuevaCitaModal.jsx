// components/NuevaCitaModal.jsx
// ══════════════════════════════════════════════════════════════════
//  Modal para Agendar Cita Manualmente — Con Buscador de Clientes,
//  Selección de Especialista y Slots Libres en Tiempo Real
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getServicios, getEmpleados, getClientes, getSlots, crearCita } from '../services/api';

export default function NuevaCitaModal({ visible, onClose, onSuccess }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [servicios, setServicios] = useState([]);
  const [servicioId, setServicioId] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [empleadoId, setEmpleadoId] = useState(null);

  // Lista de clientes para autocompletado
  const [clientesBase, setClientesBase] = useState([]);
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [showSugerencias, setShowSugerencias] = useState(false);

  // Fecha seleccionada ('hoy' | 'manana' | 'custom')
  const [tipoFecha, setTipoFecha] = useState('hoy');
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Slots de horarios en tiempo real
  const [slotsLibres, setSlotsLibres] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hora, setHora] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [error, setError] = useState(null);

  // Cargar catálogos iniciales al abrir modal
  useEffect(() => {
    if (visible) {
      setError(null);
      setLoadingServicios(true);
      Promise.all([
        getServicios().catch(() => []),
        getEmpleados().catch(() => []),
        getClientes().catch(() => []),
      ])
        .then(([srvs, emps, clis]) => {
          setServicios(srvs);
          if (srvs.length > 0) setServicioId(srvs[0].id);
          setEmpleados(emps);
          setClientesBase(clis);
        })
        .catch(() => setError('No se pudieron cargar los datos'))
        .finally(() => setLoadingServicios(false));
    } else {
      // Limpiar campos al cerrar
      setNombre('');
      setTelefono('');
      setEmpleadoId(null);
      setTipoFecha('hoy');
      setCustomDate(new Date());
      setShowDatePicker(false);
      setHora('');
      setShowSugerencias(false);
    }
  }, [visible]);

  // Obtener fecha en formato YYYY-MM-DD
  const getFechaFinal = () => {
    let d = new Date();
    if (tipoFecha === 'manana') {
      d.setDate(d.getDate() + 1);
    } else if (tipoFecha === 'custom') {
      d = customDate;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Cargar slots libres en tiempo real cuando cambia fecha, servicio o empleado
  useEffect(() => {
    if (visible && servicioId) {
      const fechaStr = getFechaFinal();
      setLoadingSlots(true);
      getSlots(fechaStr, servicioId, empleadoId)
        .then(slots => {
          setSlotsLibres(slots);
          if (slots.length > 0) {
            setHora(slots[0]);
          } else {
            setHora('');
          }
        })
        .catch(() => setSlotsLibres([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [visible, servicioId, empleadoId, tipoFecha, customDate]);

  // Filtrar sugerencias de clientes al escribir
  const handleNombreChange = (text) => {
    setNombre(text);
    if (text.trim().length >= 2) {
      const q = text.toLowerCase().trim();
      const filtrados = clientesBase.filter(
        c => (c.nombre && c.nombre.toLowerCase().includes(q)) || (c.telefono && c.telefono.includes(q))
      );
      setSugerenciasClientes(filtrados.slice(0, 4));
      setShowSugerencias(filtrados.length > 0);
    } else {
      setShowSugerencias(false);
    }
  };

  /**
   * Limpia y formatea cualquier teléfono (México, EE.UU. e Internacionales) para la UI de la App.
   */
  const limpiarTelefono = (raw) => {
    if (!raw) return '';
    let str = String(raw).trim().split('@')[0].replace(/[^0-9]/g, '');
    if (!str) return '';
    // EE.UU. / Canadá (11 dígitos empezando con 1) -> +1 442 367-0431
    if (str.length === 11 && str.startsWith('1')) {
      return `+1 ${str.slice(1, 4)} ${str.slice(4, 7)}-${str.slice(7)}`;
    }
    // México (12 dígitos empezando con 52) -> 6861234567
    if (str.length === 12 && str.startsWith('52')) {
      return str.slice(2);
    }
    // México (13 dígitos empezando con 521)
    if (str.length === 13 && str.startsWith('521')) {
      return str.slice(3);
    }
    if (str.length === 10) return str;
    if (str.length >= 10) return str.slice(-10);
    return str;
  };

  const seleccionarClienteExistente = (cliente) => {
    setNombre(cliente.nombre || '');
    setTelefono(limpiarTelefono(cliente.telefono));
    setShowSugerencias(false);
  };

  const handleDatePickerChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setCustomDate(date);
      setTipoFecha('custom');
    }
  };

  const handleSelectOtraFecha = () => {
    setTipoFecha('custom');
    setShowDatePicker(true);
  };

  const getFechaCustomLegible = () => {
    return customDate.toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const handleAgendar = async () => {
    if (!nombre.trim()) {
      setError('Ingrese el nombre del cliente');
      return;
    }
    if (!servicioId) {
      setError('Seleccione un servicio');
      return;
    }
    if (!hora.trim()) {
      setError('Seleccione una hora disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fechaStr = getFechaFinal();
      await crearCita({
        nombreCliente: nombre.trim(),
        telefonoCliente: telefono.trim(),
        servicioId,
        empleadoId: empleadoId || undefined,
        fecha: fechaStr,
        hora: hora.trim(),
      });

      Alert.alert(
        '✅ Cita Registrada',
        'La cita fue guardada exitosamente y se envió la confirmación por WhatsApp al cliente.'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar la cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.badgeLabel}>NUEVO REGISTRO</Text>
              <Text style={styles.title}>Agendar Cita Manual</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
              <Ionicons name="close-outline" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input: Nombre con Buscador Autocompletado */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOMBRE DEL CLIENTE *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Juan Pérez (o busca un cliente previo)"
                  placeholderTextColor="#6B7280"
                  value={nombre}
                  onChangeText={handleNombreChange}
                />
              </View>

              {/* Popup de Sugerencias de Clientes */}
              {showSugerencias && (
                <View style={styles.sugerenciasCard}>
                  <Text style={styles.sugerenciaTitle}>CLIENTES REGISTRADOS EN EL BOT:</Text>
                  {sugerenciasClientes.map(cli => (
                    <TouchableOpacity
                      key={cli.id}
                      style={styles.sugerenciaRow}
                      onPress={() => seleccionarClienteExistente(cli)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="people-outline" size={14} color="#6366F1" />
                      <Text style={styles.sugerenciaNombre}>{cli.nombre}</Text>
                      <Text style={styles.sugerenciaTel}>{limpiarTelefono(cli.telefono)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Input: Teléfono */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WHATSAPP DEL CLIENTE (PARA NOTIFICACIÓN) *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 6861234567"
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={setTelefono}
                />
              </View>
            </View>

            {/* Selector: Servicio */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SERVICIO / TRATAMIENTO *</Text>
              {loadingServicios ? (
                <ActivityIndicator color="#6366F1" style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.gridServicios}>
                  {servicios.map(s => {
                    const isSelected = servicioId === s.id;
                    const precioTxt = s.precio != null ? `$${Number(s.precio).toLocaleString('es-MX')}` : '';
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.servicioPill, isSelected && styles.servicioPillActive]}
                        onPress={() => setServicioId(s.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.servicioNombre, isSelected && styles.servicioNombreActive]} numberOfLines={1}>
                          {s.nombre}
                        </Text>
                        {precioTxt ? (
                          <Text style={[styles.servicioPrecio, isSelected && styles.servicioPrecioActive]}>
                            {precioTxt}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Selector: Especialista / Doctor (opcional) */}
            {empleados.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DOCTOR / ESPECIALISTA ASIGNADO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horariosScroll}>
                  <TouchableOpacity
                    style={[styles.empChip, empleadoId === null && styles.empChipActive]}
                    onPress={() => setEmpleadoId(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.empChipText, empleadoId === null && styles.empChipTextActive]}>
                      Cualquiera libre
                    </Text>
                  </TouchableOpacity>
                  {empleados.map(emp => {
                    const isSelected = empleadoId === emp.id;
                    return (
                      <TouchableOpacity
                        key={emp.id}
                        style={[styles.empChip, isSelected && styles.empChipActive]}
                        onPress={() => setEmpleadoId(emp.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="medkit-outline" size={12} color={isSelected ? "#FFFFFF" : "#6366F1"} />
                        <Text style={[styles.empChipText, isSelected && styles.empChipTextActive]}>
                          {emp.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Selector: Fecha */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FECHA DE ATENCIÓN *</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, tipoFecha === 'hoy' && styles.segmentBtnActive]}
                  onPress={() => setTipoFecha('hoy')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, tipoFecha === 'hoy' && styles.segmentTextActive]}>
                    Hoy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, tipoFecha === 'manana' && styles.segmentBtnActive]}
                  onPress={() => setTipoFecha('manana')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, tipoFecha === 'manana' && styles.segmentTextActive]}>
                    Mañana
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, tipoFecha === 'custom' && styles.segmentBtnActive]}
                  onPress={handleSelectOtraFecha}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, tipoFecha === 'custom' && styles.segmentTextActive]}>
                    Calendario
                  </Text>
                </TouchableOpacity>
              </View>

              {tipoFecha === 'custom' && (
                <TouchableOpacity
                  style={styles.calendarSelectedBox}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#6366F1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calendarSelectedLabel}>FECHA SELECCIONADA</Text>
                    <Text style={styles.calendarSelectedText}>{getFechaCustomLegible()}</Text>
                  </View>
                  <Ionicons name="create-outline" size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={customDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onValueChange={handleDatePickerChange}
                onDismiss={() => setShowDatePicker(false)}
              />
            )}

            {/* Selector: Slots Libres en Tiempo Real */}
            <View style={styles.inputGroup}>
              <View style={styles.slotsLabelRow}>
                <Text style={styles.inputLabel}>HORARIOS DISPONIBLES EN TIEMPO REAL *</Text>
                {loadingSlots && <ActivityIndicator size="small" color="#6366F1" />}
              </View>

              {slotsLibres.length === 0 && !loadingSlots ? (
                <View style={styles.noSlotsCard}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  <Text style={styles.noSlotsText}>No hay horarios disponibles para esta combinación de fecha/doctor.</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horariosScroll}>
                  {slotsLibres.map(h => {
                    const isSelected = hora === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.horaChip, isSelected && styles.horaChipActive]}
                        onPress={() => setHora(h)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.horaChipText, isSelected && styles.horaChipTextActive]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={[styles.inputWrap, { marginTop: 8 }]}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Hora manual (Ej. 10:30)"
                  placeholderTextColor="#6B7280"
                  value={hora}
                  onChangeText={setHora}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleAgendar}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Confirmar y Notificar por WhatsApp</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#161E2E',
  },
  scroll: {
    marginBottom: 16,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  textInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 13,
  },

  // Sugerencias de clientes
  sugerenciasCard: {
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    gap: 6,
  },
  sugerenciaTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1,
  },
  sugerenciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sugerenciaNombre: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  sugerenciaTel: {
    color: '#9CA3AF',
    fontSize: 11,
  },

  // Grid Servicios
  gridServicios: {
    gap: 8,
  },
  servicioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  servicioPillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
  servicioNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    flex: 1,
  },
  servicioNombreActive: {
    color: '#6366F1',
  },
  servicioPrecio: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  servicioPrecioActive: {
    color: '#6366F1',
  },

  // Segmented control Fecha
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#161E2E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  segmentBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Visual de fecha seleccionada en calendario
  calendarSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  calendarSelectedLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1,
  },
  calendarSelectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 1,
    textTransform: 'capitalize',
  },

  // Horarios & Emp Chips Horizontales
  slotsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  horariosScroll: {
    gap: 8,
  },
  empChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  empChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  empChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  empChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  horaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  horaChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  horaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  horaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  noSlotsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 10,
  },
  noSlotsText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 48,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
