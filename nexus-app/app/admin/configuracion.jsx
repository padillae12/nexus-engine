// app/admin/configuracion.jsx — Pantalla Admin: gestión completa de empleados y especialidades
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
import {
  getConfig,
  checkHealth,
  getEmpleados,
  guardarEmpleado,
  getServicios,
  getServiciosEmpleado,
} from '../../services/api';

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

  // Formulario agregar / editar empleado
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empNombre, setEmpNombre] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empTel, setEmpTel] = useState('');
  const [empRol, setEmpRol] = useState('empleado');
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

  const planType = (config?.PLAN_TYPE || 'pro').toLowerCase();
  const isPro = planType === 'pro';

  const limpiarFormulario = () => {
    setEditingEmpId(null);
    setEmpNombre('');
    setEmpEmail('');
    setEmpTel('');
    setEmpRol('empleado');
    setEmpServicioIds([]);
    setShowAddEmp(false);
  };

  const handleEditarEmpleado = async (emp) => {
    setEditingEmpId(emp.id);
    setEmpNombre(emp.nombre || '');
    setEmpEmail(emp.email || '');
    setEmpTel(emp.telefono || '');
    setEmpRol(emp.rol || 'empleado');
    setShowAddEmp(true);

    try {
      const srvIds = await getServiciosEmpleado(emp.id);
      setEmpServicioIds(srvIds || []);
    } catch {
      setEmpServicioIds([]);
    }
  };

  const toggleServicio = (id) => {
    if (empServicioIds.includes(id)) {
      setEmpServicioIds(empServicioIds.filter(sId => sId !== id));
    } else {
      setEmpServicioIds([...empServicioIds, id]);
    }
  };

  const handleGuardarEmpleado = async () => {
    if (!empNombre.trim()) {
      Alert.alert('Campo Requerido', 'Ingrese el nombre del empleado');
      return;
    }
    setSavingEmp(true);
    try {
      await guardarEmpleado({
        id: editingEmpId || undefined,
        nombre: empNombre.trim(),
        email: empEmail.trim() || `${empNombre.toLowerCase().replace(/\s+/g, '')}@negocio.com`,
        telefono: empTel.trim(),
        rol: empRol,
        activo: 1,
        servicioIds: isPro ? empServicioIds : [],
      });

      const mensaje = editingEmpId
        ? 'El empleado y sus especialidades han sido actualizados.'
        : 'El nuevo empleado ha sido registrado exitosamente.';

      Alert.alert('Registro Guardado', mensaje);
      limpiarFormulario();
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

      {/* Estado del servidor & Plan */}
      <Text style={styles.sectionTitle}>NIVEL DE PLAN Y SERVIDOR</Text>
      <View style={styles.topStatusGrid}>
        <View style={[styles.healthCard, { borderColor: apiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
          <View style={[styles.healthDot, { backgroundColor: apiOnline ? '#10B981' : '#EF4444' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.healthLabel}>API Server</Text>
            <Text style={[styles.healthStatus, { color: apiOnline ? '#10B981' : '#EF4444' }]}>
              {apiOnline ? 'Conexión activa' : 'Sin respuesta'}
            </Text>
          </View>
        </View>

        <View style={[styles.planCard, isPro ? styles.planCardPro : styles.planCardBasico]}>
          <Ionicons name={isPro ? "shield-checkmark" : "flash"} size={16} color={isPro ? "#6366F1" : "#F59E0B"} />
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{isPro ? "PLAN PRO / CLÍNICO" : "PLAN BÁSICO / EXPRESS"}</Text>
            <Text style={styles.planDesc}>{isPro ? "Funciones clínicas y médico de cabecera" : "Flujo ultra-rápido para locales"}</Text>
          </View>
        </View>
      </View>

      {/* Directorio de Empleados */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{isPro ? "ESPECIALISTAS Y SERVICIOS AUTORIZADOS" : "DIRECTORIO DE PERSONAL"}</Text>
        <TouchableOpacity
          style={styles.addEmpBtn}
          onPress={() => {
            if (showAddEmp) {
              limpiarFormulario();
            } else {
              setShowAddEmp(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name={showAddEmp ? "close" : "add-circle"} size={16} color="#FFFFFF" />
          <Text style={styles.addEmpBtnText}>{showAddEmp ? "Cancelar" : "Nuevo"}</Text>
        </TouchableOpacity>
      </View>

      {/* Formulario Agregar / Editar Empleado */}
      {showAddEmp && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingEmpId ? "Editar Información de Empleado" : isPro ? "Registrar Especialista" : "Registrar Personal"}
          </Text>

          {/* Nombre */}
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="Nombre completo (Ej. Dra. Teresa) *"
              placeholderTextColor="#6B7280"
              value={empNombre}
              onChangeText={setEmpNombre}
            />
          </View>

          {/* WhatsApp */}
          <View style={styles.inputWrap}>
            <Ionicons name="logo-whatsapp" size={16} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="WhatsApp (+52 686 225 5233) *"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={empTel}
              onChangeText={setEmpTel}
            />
          </View>

          {/* Correo */}
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

          {/* Selector de Rol */}
          <Text style={styles.subTitleLabel}>ROL EN EL SISTEMA:</Text>
          <View style={styles.rolRow}>
            {['empleado', 'encargado', 'admin'].map(rolItem => {
              const active = empRol === rolItem;
              return (
                <TouchableOpacity
                  key={rolItem}
                  style={[styles.rolChip, active && styles.rolChipActive]}
                  onPress={() => setEmpRol(rolItem)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rolChipText, active && styles.rolChipTextActive]}>
                    {rolItem.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selector de Servicios Habilitados (Solo Plan Pro) */}
          {isPro && (
            <>
              <Text style={styles.subTitleLabel}>SERVICIOS / ESPECIALIDADES AUTORIZADAS:</Text>
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
            </>
          )}

          {/* Botón Guardar / Actualizar */}
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
                <Text style={styles.saveEmpBtnText}>
                  {editingEmpId ? "Actualizar Empleado" : "Guardar Empleado"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Empleados con opción de toque para Editar */}
      <View style={styles.empList}>
        {empleados.length === 0 ? (
          <Text style={styles.emptyText}>Sin personal registrado</Text>
        ) : (
          empleados.map(emp => (
            <TouchableOpacity
              key={emp.id}
              style={[styles.empCard, editingEmpId === emp.id && styles.empCardEditing]}
              onPress={() => handleEditarEmpleado(emp)}
              activeOpacity={0.8}
            >
              <View style={styles.empAvatar}>
                <Ionicons name={isPro ? "medkit-outline" : "person-outline"} size={18} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empNombre}>{emp.nombre}</Text>
                <View style={styles.empMetaRow}>
                  <Ionicons name="logo-whatsapp" size={12} color="#10B981" />
                  <Text style={styles.empTel}>{emp.telefono || 'Sin WhatsApp'}</Text>
                </View>
              </View>
              <View style={styles.empRightCol}>
                <View style={styles.empBadge}>
                  <Text style={styles.empBadgeText}>{emp.rol.toUpperCase()}</Text>
                </View>
                <Ionicons name="pencil" size={14} color="#6B7280" style={{ marginTop: 4 }} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Configuración del negocio */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PARÁMETROS DEL SISTEMA</Text>
      {config ? (
        <View style={styles.configList}>
          <ConfigRow label="Tipo de Plan" valor={planType.toUpperCase()} descripcion="Nivel de suscripción" />
          <ConfigRow label="Min. anticipación" valor={`${config.MIN_BOOKING_HOURS}h`} descripcion="Para agendar una cita" />
          <ConfigRow label="Máx. días a futuro" valor={`${config.MAX_BOOKING_DAYS} días`} />
          <ConfigRow label="Límite cancelación" valor={`${config.CANCEL_HOURS_LIMIT}h antes`} />
          <ConfigRow label="Nombre del bot" valor={config.BOT_NAME} />
        </View>
      ) : (
        <Text style={styles.emptyText}>No se pudo cargar la configuración</Text>
      )}

      <Text style={styles.hint}>
        Tip: Haz clic en cualquier empleado de la lista para editar su información o modificar sus servicios autorizados.
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
  topStatusGrid: {
    gap: 8,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthLabel: { color: '#F9FAFB', fontWeight: '700', fontSize: 13 },
  healthStatus: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  planCardPro: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: '#6366F1',
  },
  planCardBasico: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: '#F59E0B',
  },
  planTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: 1,
  },
  planDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
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

  // Formulario agregar / editar empleado
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
  rolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rolChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161E2E',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 6,
    paddingVertical: 6,
  },
  rolChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  rolChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  rolChipTextActive: {
    color: '#6366F1',
    fontWeight: '700',
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
  empCardEditing: {
    borderColor: '#6366F1',
    backgroundColor: '#161E2E',
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
  empRightCol: {
    alignItems: 'flex-end',
  },
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
