// components/NuevaCitaModal.jsx
// ══════════════════════════════════════════════════════════════════
//  Modal para Agendar Cita Manualmente — Con Calendario Nativo
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
import { getServicios, crearCita } from '../services/api';

const HORARIOS_RAPIDOS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function NuevaCitaModal({ visible, onClose, onSuccess }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [servicios, setServicios] = useState([]);
  const [servicioId, setServicioId] = useState(null);

  // Fecha seleccionada ('hoy' | 'manana' | 'custom')
  const [tipoFecha, setTipoFecha] = useState('hoy');
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Hora seleccionada
  const [hora, setHora] = useState('10:00');

  const [loading, setLoading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [error, setError] = useState(null);

  // Cargar catálogo de servicios al abrir el modal
  useEffect(() => {
    if (visible) {
      setError(null);
      setLoadingServicios(true);
      getServicios()
        .then(data => {
          setServicios(data);
          if (data.length > 0) setServicioId(data[0].id);
        })
        .catch(err => setError('No se pudieron cargar los servicios'))
        .finally(() => setLoadingServicios(false));
    } else {
      // Limpiar campos al cerrar
      setNombre('');
      setTelefono('');
      setTipoFecha('hoy');
      setCustomDate(new Date());
      setShowDatePicker(false);
      setHora('10:00');
    }
  }, [visible]);

  // Manejar cambio de fecha en el Calendario Nativo
  const handleDatePickerChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setCustomDate(date);
      setTipoFecha('custom');
    }
  };

  // Abrir calendario al tocar "Otra Fecha"
  const handleSelectOtraFecha = () => {
    setTipoFecha('custom');
    setShowDatePicker(true);
  };

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

  // Formato legible para mostrar fecha custom
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
      setError('Seleccione o escriba una hora');
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
        fecha: fechaStr,
        hora: hora.trim(),
      });

      Alert.alert('Cita Agendada', 'La cita fue registrada exitosamente en el sistema.');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar la cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
            {/* Error banner */}
            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Input: Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOMBRE DEL CLIENTE *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Juan Pérez"
                  placeholderTextColor="#6B7280"
                  value={nombre}
                  onChangeText={setNombre}
                />
              </View>
            </View>

            {/* Input: Teléfono */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TELÉFONO DE CONTACTO (OPCIONAL)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 6621234567"
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={setTelefono}
                />
              </View>
            </View>

            {/* Selector: Servicio */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SERVICIO *</Text>
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

            {/* Selector: Fecha con Calendario Nativo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FECHA *</Text>
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
                    Abrir Calendario
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Muestra la fecha seleccionada del calendario */}
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

            {/* DateTimePicker Nativo (Pop-up de Calendario) */}
            {showDatePicker && (
              <DateTimePicker
                value={customDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={handleDatePickerChange}
              />
            )}

            {/* Selector: Hora */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HORARIO *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horariosScroll}>
                {HORARIOS_RAPIDOS.map(h => {
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
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Confirmar Cita</Text>
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
    fontSize: 14,
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

  // Horarios Horizontales
  horariosScroll: {
    gap: 8,
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
    fontSize: 15,
    fontWeight: '700',
  },
});
