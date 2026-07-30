// services/api.js
// ══════════════════════════════════════════════════════════════════
//  Capa de comunicación con la API Express de Nexus-Engine.
//  La app NO necesita dominio — conecta directo a IP:PORT del VPS.
//
//  Para cambiar el servidor: edita BASE_URL abajo.
//  En desarrollo: IP de tu máquina local en la misma red WiFi.
//  En producción: IP pública del VPS.
// ══════════════════════════════════════════════════════════════════

// ── Configuración ──────────────────────────────────────────────────
// Cambia esta IP por la de tu VPS (o tu máquina local en desarrollo)
const BASE_URL = 'http://207.244.251.219:3001/api';

// ── Helper base ───────────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  // Timeout de 8 segundos — si el VPS no responde, lanza error claro
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  const config = {
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    ...options,
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Error ${res.status}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Sin respuesta del servidor (timeout). Verifica tu conexión.');
    }
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════
//  AUTH — Modo Admin
// ══════════════════════════════════════════════════════════════════

/**
 * Verifica el PIN del dueño contra el hash en config_negocio.
 * @param {string} pin - PIN en texto plano (ej: "123456")
 * @returns {Promise<boolean>} true si el PIN es correcto
 */
export async function verifyPin(pin) {
  const data = await request('/auth/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  return data.ok === true;
}

// ══════════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════════

/**
 * Verifica que la API esté respondiendo.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
//  CITAS
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene la lista de citas filtradas por fecha, estado o empleado.
 * @param {object} params - { fecha?, estado?, empleadoId? }
 * @returns {Promise<Array>}
 */
export async function getCitas(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/citas${query ? `?${query}` : ''}`);
}

/**
 * Obtiene todas las citas del día actual.
 * @returns {Promise<Array>}
 */
export async function getCitasHoy() {
  return request('/citas/hoy');
}

/**
 * Obtiene todas las citas del día de mañana.
 * @returns {Promise<Array>}
 */
export async function getCitasManana() {
  return request('/citas/manana');
}

/**
 * Obtiene los horarios disponibles reales para una fecha, servicio y especialista.
 * @param {string} fecha - 'YYYY-MM-DD'
 * @param {number} servicioId
 * @param {number|null} empleadoId
 * @returns {Promise<Array<string>>}
 */
export async function getSlots(fecha, servicioId, empleadoId = null) {
  const params = { fecha, servicioId };
  if (empleadoId) params.empleadoId = empleadoId;
  const query = new URLSearchParams(params).toString();
  return request(`/slots?${query}`);
}

/**
 * Crea una nueva cita manualmente desde la app.
 * @param {object} datos - { nombreCliente, telefonoCliente, servicioId, empleadoId?, fecha, hora }
 * @returns {Promise<object>}
 */
export async function crearCita(datos) {
  return request('/citas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

/**
 * Obtiene el catálogo de servicios disponibles.
 * @returns {Promise<Array>}
 */
export async function getServicios() {
  return request('/servicios');
}

/**
 * Obtiene el catálogo completo de servicios (para admin).
 */
export async function getServiciosAdmin() {
  return request('/servicios/admin');
}

/**
 * Crea o actualiza un servicio.
 * @param {object} datos - { id?, nombre, precio, duracionMin, descripcion, activo }
 */
export async function guardarServicio(datos) {
  return request('/servicios', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

/**
 * Elimina/desactiva un servicio.
 * @param {number} id
 */
export async function deleteServicio(id) {
  return request(`/servicios/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Cambia el estado de una cita.
 * @param {number} citaId
 * @param {'completada'|'cancelada'|'pendiente'} estado
 * @returns {Promise<object>}
 */
export async function updateEstadoCita(citaId, estado) {
  return request(`/citas/${citaId}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

// ══════════════════════════════════════════════════════════════════
//  CLIENTES
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene la lista de clientes registrados por el bot.
 * @returns {Promise<Array>}
 */
export async function getClientes() {
  return request('/clientes');
}

/**
 * Obtiene la URL pública para descargar/imprimir el reporte contable PDF.
 * @param {string} mesStr Ej: '2026-07'
 */
export function getReportePdfUrl(mesStr) {
  const mes = mesStr || new Date().toISOString().slice(0, 7);
  return `${BASE_URL}/reportes/ingresos/html?mes=${mes}`;
}

/**
 * Obtiene el historial completo de citas de un cliente.
 * @param {number} clienteId
 */
export async function getCitasCliente(clienteId) {
  return request(`/clientes/${clienteId}/citas`);
}

/**
 * Reenvía la confirmación de la cita por WhatsApp al cliente.
 * @param {number} citaId
 */
export async function reenviarWhatsApp(citaId) {
  return request(`/citas/${citaId}/reenviar-whatsapp`, {
    method: 'POST',
  });
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD (solo Modo Admin)
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene las estadísticas del dashboard del dueño.
 * @returns {Promise<{citasHoy, clientesNuevos, tasaAsistencia, ingresosHoy}>}
 */
export async function getDashboardStats() {
  return request('/dashboard/stats');
}

/**
 * Obtiene el historial de ingresos diarios (últimos 60 días).
 * Solo cuenta citas marcadas como 'completada'.
 * @returns {Promise<Array<{fecha, citas_completadas, total}>>}
 */
export async function getIngresosDiarios() {
  return request('/ingresos/diario');
}

// ══════════════════════════════════════════════════════════════════
//  BLOQUEOS
// ══════════════════════════════════════════════════════════════════

/**
 * Crea un bloqueo rápido (urgente) desde la app.
 * @param {object} datos - { motivo, fechaInicio, fechaFin, empleadoId? }
 * @returns {Promise<object>}
 */
export async function crearBloqueo(datos) {
  return request('/bloqueos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// ══════════════════════════════════════════════════════════════════
//  EMPLEADOS
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene la lista de empleados y sus teléfonos.
 * @returns {Promise<Array>}
 */
export async function getEmpleados() {
  return request('/empleados');
}

/**
 * Crea o actualiza un empleado con su número de teléfono y servicios autorizados.
 * @param {object} datos - { id?, nombre, email, password?, telefono, rol, activo, servicioIds? }
 * @returns {Promise<object>}
 */
export async function guardarEmpleado(datos) {
  return request('/empleados', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

/**
 * Obtiene la lista de IDs de servicios autorizados para un empleado.
 * @param {number} id
 * @returns {Promise<Array<number>>}
 */
export async function getServiciosEmpleado(id) {
  return request(`/empleados/${id}/servicios`);
}

// ══════════════════════════════════════════════════════════════════
//  CONFIG NEGOCIO
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene toda la configuración del negocio.
 * @returns {Promise<object>} clave → valor
 */
export async function getConfig() {
  return request('/config');
}
