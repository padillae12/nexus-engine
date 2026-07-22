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
const BASE_URL = 'http://192.168.1.100:3001/api';

// ── Helper base ───────────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const res = await fetch(url, config);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  return res.json();
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
 * Obtiene todas las citas del día actual.
 * @returns {Promise<Array>}
 */
export async function getCitasHoy() {
  return request('/citas/hoy');
}

/**
 * Obtiene todas las citas (con filtros opcionales).
 * @param {object} params - { fecha, estado, empleadoId }
 * @returns {Promise<Array>}
 */
export async function getCitas(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/citas${query ? `?${query}` : ''}`);
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

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD (solo Modo Admin)
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene las estadísticas del dashboard del dueño.
 * @returns {Promise<{citasHoy, clientesNuevos, tasaAsistencia, ingresosEstimados}>}
 */
export async function getDashboardStats() {
  return request('/dashboard/stats');
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
//  CONFIG NEGOCIO
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene toda la configuración del negocio.
 * @returns {Promise<object>} clave → valor
 */
export async function getConfig() {
  return request('/config');
}
