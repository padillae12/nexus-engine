// app/admin/configuracion.jsx — Pantalla Admin: configuración & gestión de empleados y especialidades
// Diseño Profesional & Ejecutivo (Zero Emojis)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConfig, checkHealth, getEmpleados, guardarEmpleado, getServicios } from '../../services/api';

function ConfigRow({ label, valor, descripcion }) {
  return (
    <View style={styles.configRow}>
      <View style={styles.configInfo}>
        <Text style={styles.configLabel}>{label}</Text>
        {descripcion ? <Text style={styles.configDesc}>{descripcion}</Text> : null}
      </View>
      <View style={styles.configValor}>
        <Text style={styles.configValorText}>{String(valor)}</Text>
      </View>
    </View>
  );
}

export default function ConfiguracionScreen() {
  const [config, setConfig] = useState(null);
  const [apiOnline, setApiOnline] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [catServicios, setCatServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulario nuevo empleado
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empNombre, setEmpNombre] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empTel, setEmpTel] = useState('');
  const [empServicioIds, setEmpServicioIds] = useState([]);
  const [savingEmp, setSavingEmp] = useState(false);

  const cargarDatos = () => {
    Promise.all([
      getConfig(),
      checkHealth(),
      getEmpleados().catch(() => []),
      getServicios().catch(() => []),
    ])
      .then(([cfg, health, emps, srvs]) => {
        setConfig(cfg);
        setApiOnline(health);
        setEmpleados(emps);
        setCatServicios(srvs);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleServicio = (id) => {
    if (empServicioIds.includes(id)) {
      setEmpServicioIds(empServicioIds.filter(sId => sId !== id));
    } else {
      setEmpServicioIds([...empServicioIds, id]);
    }
  };

  const handleGuardarEmpleado = async () => {
    if (!empNombre.trim()) {
      Alert.alert('Campo Requerido', 'Ingrese el nombre del especialista/empleado');
      return;
    }
    setSavingEmp(true);
    try {
      await guardarEmpleado({
        nombre: empNombre.trim(),
        email: empEmail.trim() || `${empNombre.toLowerCase().replace(/\s+/g, '')}@negocio.com`,
        telefono: empTel.trim(),
        rol: 'empleado',
        activo: 1,
        servicioIds: empServicioIds,
      });
      Alert.alert('Especialista Guardado', 'El especialista, su WhatsApp y sus servicios autorizados han sido registrados.');
      setEmpNombre('');
      setEmpEmail('');
      setEmpTel('');
      setEmpServicioIds([]);
      setShowAddEmp(false);
      cargarDatos();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo guardar el empleado');
    } finally {
      setSavingEmp(false);
    }
  };

  if (loading) return <ActivityIndicator color="#6366F1" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Estado del servidor */}
      <Text style={styles.sectionTitle}>ESTADO DEL SERVIDOR</Text>
      <View style={[styles.healthCard, { borderColor: apiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
        <View style={[styles.healthDot, { backgroundColor: apiOnline ? '#10B981' : '#EF4444' }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.healthLabel}>API Nexus-Engine</Text>
          <Text style={[styles.healthStatus, { color: apiOnline ? '#10B981' : '#EF4444' }]}>
            {apiOnline ? 'Conexión activa · En línea' : 'Servidor sin respuesta'}
          </Text>
        </View>
      </View>

      {/* Directorio de Empleados y Recordatorios */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>ESPECIALISTAS Y SERVICIOS AUTORIZADOS</Text>
        <TouchableOpacity
          style={styles.addEmpBtn}
          onPress={() => setShowAddEmp(!showAddEmp)}
          activeOpacity={0.8}
        >
          <Ionicons name={showAddEmp ? "close" : "add-circle"} size={16} color="#FFFFFF" />
          <Text style={styles.addEmpBtnText}>{showAddEmp ? "Cancelar" : "Nuevo"}</Text>
        </TouchableOpacity>
      </View>

      {/* Formulario Agregar Empleado */}
      {showAddEmp && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Registrar Especialista</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="Nombre completo (Ej. Dr. Carlos) *"
              placeholderTextColor="#6B7280"
              value={empNombre}
              onChangeText={setEmpNombre}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="logo-whatsapp" size={16} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="WhatsApp (+52 662 123 4567) *"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={empTel}
              onChangeText={setEmpTel}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="Correo electrónico (Opcional)"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              value={empEmail}
              onChangeText={setEmpEmail}
            />
          </View>

          {/* Selector de Servicios Habilitados */}
          <Text style={styles.subTitleLabel}>SERVICIOS QUE REALIZA ESTE ESPECIALISTA:</Text>
          <View style={styles.servicesGrid}>
            {catServicios.map(s => {
              const checked = empServicioIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.serviceChip, checked && styles.serviceChipChecked]}
                  onPress={() => toggleServicio(s.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={checked ? "checkbox" : "square-outline"}
                    size={16}
                    color={checked ? "#6366F1" : "#6B7280"}
                  />
                  <Text style={[styles.serviceChipText, checked && styles.serviceChipTextChecked]}>
                    {s.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.saveEmpBtn}
            onPress={handleGuardarEmpleado}
            disabled={savingEmp}
            activeOpacity={0.85}
          >
            {savingEmp ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                <Text style={styles.saveEmpBtnText}>Guardar Especialista</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Empleados */}
      <View style={styles.empList}>
        {empleados.length === 0 ? (
          <Text style={styles.emptyText}>Sin especialistas registrados</Text>
        ) : (
          empleados.map(emp => (
            <View key={emp.id} style={styles.empCard}>
              <View style={styles.empAvatar}>
                <Ionicons name="medkit-outline" size={18} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empNombre}>{emp.nombre}</Text>
                <View style={styles.empMetaRow}>
                  <Ionicons name="logo-whatsapp" size={12} color="#10B981" />
                  <Text style={styles.empTel}>{emp.telefono || 'Sin WhatsApp configurado'}</Text>
                </View>
              </View>
              <View style={styles.empBadge}>
                <Text style={styles.empBadgeText}>{emp.rol.toUpperCase()}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Configuración del negocio */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PARÁMETROS DEL SISTEMA</Text>
      {config ? (
        <View style={styles.configList}>
          <ConfigRow label="Min. anticipación" valor={`${config.MIN_BOOKING_HOURS}h`} descripcion="Para agendar una cita" />
          <ConfigRow label="Máx. días a futuro" valor={`${config.MAX_BOOKING_DAYS} días`} />
          <ConfigRow label="Límite cancelación" valor={`${config.CANCEL_HOURS_LIMIT}h antes`} />
          <ConfigRow label="Ofrecer reagendar" valor={config.OFFER_RESCHEDULE === 'true' ? 'Sí' : 'No'} />
          <ConfigRow label="Selección empleado" valor={config.EMPLOYEE_SELECTION === 'true' ? 'Sí' : 'No'} />
          <ConfigRow label="Nombre del bot" valor={config.BOT_NAME} />
        </View>
      ) : (
        <Text style={styles.emptyText}>No se pudo cargar la configuración</Text>
      )}

      <Text style={styles.hint}>
        Nota: El bot asigna automáticamente el especialista preferido del cliente en citas consecutivas (ej. tratamientos de Ortodoncia).
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F17' },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  addEmpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addEmpBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthLabel: { color: '#F9FAFB', fontWeight: '700', fontSize: 14 },
  healthStatus: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  // Formulario agregar empleado
  formCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6366F1',
    gap: 10,
    marginBottom: 16,
  },
  formTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  subTitleLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    marginTop: 6,
  },
  servicesGrid: {
    gap: 6,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serviceChipChecked: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  serviceChipTextChecked: {
    color: '#F9FAFB',
    fontWeight: '700',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  textInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 13,
  },
  saveEmpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    height: 42,
    marginTop: 4,
  },
  saveEmpBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Lista empleados
  empList: { gap: 8 },
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empNombre: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  empMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  empTel: { color: '#9CA3AF', fontSize: 11 },
  empBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  empBadgeText: { color: '#9CA3AF', fontSize: 10, fontWeight: '700' },

  configList: { gap: 6 },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  configInfo: { flex: 1 },
  configLabel: { color: '#F3F4F6', fontSize: 13, fontWeight: '600' },
  configDesc: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  configValor: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  configValorText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 10, fontSize: 12 },
  hint: { color: '#6B7280', fontSize: 11, marginTop: 24, lineHeight: 16 },
});
