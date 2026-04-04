// src/db/queries.js
// Todas las consultas SQL del motor de citas.
// Centralizar aquí hace que sea fácil ajustar queries sin tocar la lógica del bot.

const pool = require('./pool');

// ─────────────────────────────────────────────────────────────────
//  CLIENTES
// ─────────────────────────────────────────────────────────────────

/**
 * Busca un cliente por teléfono. Si no existe, lo crea.
 * @param {string} telefono - Número con código de país ej: +526789012345
 * @returns {Promise<{id, telefono, nombre}>}
 */
async function findOrCreateCliente(telefono) {
  const [rows] = await pool.execute(
    'SELECT id, telefono, nombre FROM clientes WHERE telefono = ?',
    [telefono]
  );
  if (rows.length > 0) return rows[0];

  const [result] = await pool.execute(
    'INSERT INTO clientes (telefono) VALUES (?)',
    [telefono]
  );
  return { id: result.insertId, telefono, nombre: null };
}

/**
 * Actualiza el nombre de un cliente.
 * @param {number} clienteId
 * @param {string} nombre
 */
async function updateClienteNombre(clienteId, nombre) {
  await pool.execute(
    'UPDATE clientes SET nombre = ? WHERE id = ?',
    [nombre, clienteId]
  );
}

// ─────────────────────────────────────────────────────────────────
//  SERVICIOS
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna todos los servicios activos.
 * @returns {Promise<Array<{id, nombre, descripcion, duracion_min}>>}
 */
async function getServicios() {
  const [rows] = await pool.execute(
    'SELECT id, nombre, descripcion, duracion_min FROM servicios WHERE activo = 1 ORDER BY id'
  );
  return rows;
}

/**
 * Retorna un servicio por su ID.
 * @param {number} id
 */
async function getServicioById(id) {
  const [rows] = await pool.execute(
    'SELECT id, nombre, descripcion, duracion_min FROM servicios WHERE id = ? AND activo = 1',
    [id]
  );
  return rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────
//  DISPONIBILIDAD
// ─────────────────────────────────────────────────────────────────

/**
 * Obtiene el horario de trabajo para un día de la semana específico.
 * dia: 0=Domingo, 1=Lunes, ..., 6=Sábado
 * Si no hay empleado asignado, retorna el horario global (empleado_id IS NULL).
 * @param {number} diaSemana
 * @param {number|null} empleadoId
 * @returns {Promise<{hora_inicio, hora_fin} | null>}
 */
async function getHorarioTrabajo(diaSemana, empleadoId = null) {
  const [rows] = await pool.execute(
    `SELECT hora_inicio, hora_fin
     FROM horarios_trabajo
     WHERE dia_semana = ?
       AND (empleado_id = ? OR empleado_id IS NULL)
     ORDER BY empleado_id DESC  -- Prioriza el horario específico del empleado
     LIMIT 1`,
    [diaSemana, empleadoId]
  );
  return rows[0] || null;
}

/**
 * Retorna los slots ya OCUPADOS en una fecha para un empleado dado.
 * La generación de slots disponibles se hace en utils/slots.js
 * @param {string} fecha - Formato 'YYYY-MM-DD'
 * @param {number|null} empleadoId
 * @returns {Promise<string[]>} - Array de horas ocupadas ej: ["09:00", "10:00"]
 */
async function getSlotOcupados(fecha, empleadoId = null) {
  let sql, params;

  if (empleadoId) {
    sql = `SELECT TIME_FORMAT(fecha_inicio, '%H:%i') AS slot
           FROM citas
           WHERE DATE(fecha_inicio) = ?
             AND empleado_id = ?
             AND estado != 'cancelada'`;
    params = [fecha, empleadoId];
  } else {
    // Sin empleado asignado: revisar todos los slots ocupados globalmente
    sql = `SELECT TIME_FORMAT(fecha_inicio, '%H:%i') AS slot
           FROM citas
           WHERE DATE(fecha_inicio) = ?
             AND estado != 'cancelada'`;
    params = [fecha];
  }

  const [rows] = await pool.execute(sql, params);
  return rows.map(r => r.slot);
}

/**
 * Verifica si una fecha/hora cae dentro de un bloqueo registrado.
 * @param {string} fechaHora - Formato 'YYYY-MM-DD HH:mm:ss'
 * @param {number|null} empleadoId
 * @returns {Promise<boolean>}
 */
async function isBloqueado(fechaHora, empleadoId = null) {
  const [rows] = await pool.execute(
    `SELECT id FROM bloqueos
     WHERE ? BETWEEN fecha_inicio AND fecha_fin
       AND (empleado_id = ? OR empleado_id IS NULL)
     LIMIT 1`,
    [fechaHora, empleadoId]
  );
  return rows.length > 0;
}

// ─────────────────────────────────────────────────────────────────
//  CITAS
// ─────────────────────────────────────────────────────────────────

/**
 * Crea una cita nueva en la base de datos.
 * @param {object} datos
 * @param {number} datos.clienteId
 * @param {number} datos.servicioId
 * @param {number|null} datos.empleadoId
 * @param {string} datos.fechaInicio - 'YYYY-MM-DD HH:mm:ss'
 * @param {string} datos.fechaFin    - 'YYYY-MM-DD HH:mm:ss'
 * @returns {Promise<number>} ID de la cita creada
 */
async function createCita({ clienteId, servicioId, empleadoId, fechaInicio, fechaFin }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO citas (cliente_id, servicio_id, empleado_id, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, 'confirmada')`,
      [clienteId, servicioId, empleadoId, fechaInicio, fechaFin]
    );
    return result.insertId;
  } catch (err) {
    // Error 1062 = Duplicate entry (UNIQUE KEY violado) → slot ya ocupado
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('SLOT_OCUPADO');
    }
    throw err;
  }
}

/**
 * Cancela una cita dado su ID y el teléfono del cliente (validación de seguridad).
 * @param {number} citaId
 * @param {string} telefono
 * @returns {Promise<boolean>} true si se canceló, false si no encontró
 */
async function cancelCita(citaId, telefono) {
  const [result] = await pool.execute(
    `UPDATE citas c
     JOIN clientes cl ON c.cliente_id = cl.id
     SET c.estado = 'cancelada'
     WHERE c.id = ? AND cl.telefono = ? AND c.estado = 'confirmada'`,
    [citaId, telefono]
  );
  return result.affectedRows > 0;
}

/**
 * Retorna las citas activas (confirmadas) de un cliente.
 * @param {number} clienteId
 * @returns {Promise<Array>}
 */
async function getCitasActivasCliente(clienteId) {
  const [rows] = await pool.execute(
    `SELECT c.id, s.nombre AS servicio, c.fecha_inicio, c.estado
     FROM citas c
     JOIN servicios s ON c.servicio_id = s.id
     WHERE c.cliente_id = ?
       AND c.estado = 'confirmada'
       AND c.fecha_inicio > NOW()
     ORDER BY c.fecha_inicio ASC`,
    [clienteId]
  );
  return rows;
}

module.exports = {
  findOrCreateCliente,
  updateClienteNombre,
  getServicios,
  getServicioById,
  getHorarioTrabajo,
  getSlotOcupados,
  isBloqueado,
  createCita,
  cancelCita,
  getCitasActivasCliente,
};
