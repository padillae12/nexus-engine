// src/db/queries.js
// Todas las consultas SQL del motor de citas.
// Centralizar aquí hace que sea fácil ajustar queries sin tocar la lógica del bot.
//
// ── Modo mock ───────────────────────────────────────────────────
// Si USE_MOCK_DB=true en .env, se usa queries.mock.js (sin VPS).
// El resto del proyecto no necesita cambiar nada.

require('dotenv').config();
if (process.env.USE_MOCK_DB === 'true') {
  module.exports = require('./queries.mock');
  return;
}

const pool = require('./pool');


// ─────────────────────────────────────────────────────────────────
//  CLIENTES
// ─────────────────────────────────────────────────────────────────

/**
 * Busca un cliente por teléfono. Si no existe, lo crea.
 * @param {string} telefono - Número con código de país ej: +526789012345
 * @returns {Promise<{id, telefono, nombre}>}
 */
async function findOrCreateCliente(telefono, nombre = null) {
  let rawStr = String(telefono || '').trim().split('@')[0];
  let searchDigits = rawStr.replace(/[^0-9]/g, '');

  let cleanTel = searchDigits;
  if (searchDigits.length === 13 && searchDigits.startsWith('521')) {
    cleanTel = '52' + searchDigits.slice(3);
  } else if (searchDigits.length === 10) {
    cleanTel = '52' + searchDigits;
  }

  // 1. Buscar por teléfono exacto o coincidencias de los últimos 10 dígitos
  const last10 = cleanTel.length >= 10 ? cleanTel.slice(-10) : cleanTel;
  const [rows] = await pool.execute(
    'SELECT id, telefono, nombre FROM clientes WHERE telefono = ? OR telefono LIKE ?',
    [cleanTel, `%${last10}`]
  );

  if (rows.length > 0) {
    const clienteEncontrado = rows[0];
    // Si el registro existente tiene un teléfono LID antiguo (más de 12 dígitos) o diferente, actualizarlo
    if (cleanTel.length <= 12 && (clienteEncontrado.telefono.length > 12 || clienteEncontrado.telefono !== cleanTel)) {
      await pool.execute('UPDATE clientes SET telefono = ? WHERE id = ?', [cleanTel, clienteEncontrado.id]);
      clienteEncontrado.telefono = cleanTel;
    }
    if (nombre && !clienteEncontrado.nombre) {
      await updateClienteNombre(clienteEncontrado.id, nombre);
      clienteEncontrado.nombre = nombre;
    }
    return clienteEncontrado;
  }

  // 2. Si hay nombre, buscar por nombre para actualizar teléfono si existía un registro viejo sin teléfono o con LID
  if (nombre) {
    const [byName] = await pool.execute(
      'SELECT id, telefono, nombre FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1',
      [nombre]
    );
    if (byName.length > 0) {
      const clienteExistente = byName[0];
      await pool.execute('UPDATE clientes SET telefono = ? WHERE id = ?', [cleanTel, clienteExistente.id]);
      clienteExistente.telefono = cleanTel;
      return clienteExistente;
    }
  }

  // 3. Crear nuevo cliente
  const [result] = await pool.execute(
    'INSERT INTO clientes (telefono, nombre) VALUES (?, ?)',
    [cleanTel, nombre || null]
  );
  return { id: result.insertId, telefono: cleanTel, nombre };
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
    'SELECT id, nombre, descripcion, precio, mostrar_precio, duracion_min FROM servicios WHERE activo = 1 ORDER BY id'
  );
  return rows;
}

/**
 * Retorna un servicio por su ID.
 * @param {number} id
 */
async function getServicioById(id) {
  const [rows] = await pool.execute(
    'SELECT id, nombre, descripcion, precio, mostrar_precio, duracion_min FROM servicios WHERE id = ? AND activo = 1',
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
  // Primero verifica bloqueos puntuales (recurrente = 0)
  const [puntuales] = await pool.execute(
    `SELECT id FROM bloqueos
     WHERE recurrente = 0
       AND ? BETWEEN fecha_inicio AND fecha_fin
       AND (empleado_id = ? OR empleado_id IS NULL)
     LIMIT 1`,
    [fechaHora, empleadoId]
  );
  if (puntuales.length > 0) return true;

  // Luego verifica bloqueos recurrentes activos ese día y hora
  const dt = new Date(fechaHora);
  const diaSemana = dt.getDay();           // 0=Dom … 6=Sáb
  const horaActual = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:00`;

  const [recurrentes] = await pool.execute(
    `SELECT id FROM bloqueos
     WHERE recurrente = 1
       AND ? BETWEEN fecha_inicio AND fecha_fin
       AND FIND_IN_SET(?, dias_semana) > 0
       AND hora_inicio_hora <= ?
       AND hora_fin_hora > ?
       AND (empleado_id = ? OR empleado_id IS NULL)
     LIMIT 1`,
    [fechaHora, diaSemana, horaActual, horaActual, empleadoId]
  );
  if (recurrentes.length > 0) return true;

  // Verificar horario de comida individual del empleado (en usuarios)
  if (empleadoId) {
    const [comida] = await pool.execute(
      `SELECT id FROM usuarios
       WHERE id = ?
         AND hora_inicio_comida IS NOT NULL AND hora_inicio_comida != ''
         AND hora_fin_comida IS NOT NULL AND hora_fin_comida != ''
         AND ? >= CONCAT(hora_inicio_comida, ':00')
         AND ? < CONCAT(hora_fin_comida, ':00')
       LIMIT 1`,
      [empleadoId, horaActual, horaActual]
    );
    if (comida.length > 0) return true;
  } else {
    // Si no hay especialista asignado ("cualquiera libre"), verificar si TODOS los empleados activos están en horario de comida
    const [todosConComida] = await pool.execute(
      `SELECT id, hora_inicio_comida, hora_fin_comida FROM usuarios WHERE activo = 1`
    );
    if (todosConComida.length > 0) {
      const todosEnComida = todosConComida.every(u => {
        if (!u.hora_inicio_comida || !u.hora_fin_comida) return false;
        const inicio = `${u.hora_inicio_comida.slice(0, 5)}:00`;
        const fin = `${u.hora_fin_comida.slice(0, 5)}:00`;
        return horaActual >= inicio && horaActual < fin;
      });
      if (todosEnComida) return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────
//  CITAS
// ─────────────────────────────────────────────────────────────────

/**
 * Crea una nueva cita en la base de datos.
 * @param {object} datos
 * @param {number} datos.clienteId
 * @param {number} datos.servicioId
 * @param {number|null} datos.empleadoId
 * @param {string} datos.fechaInicio - 'YYYY-MM-DD HH:mm:ss'
 * @param {string} datos.fechaFin    - 'YYYY-MM-DD HH:mm:ss'
 * @param {number} [datos.recordatorioMins] - Minutos de anticipación para el recordatorio (ej. 60, 120, 1440)
 * @returns {Promise<number>} ID de la cita creada
 */
async function createCita({ clienteId, servicioId, empleadoId, fechaInicio, fechaFin, recordatorioMins = 120 }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO citas (cliente_id, servicio_id, empleado_id, fecha_inicio, fecha_fin, estado, recordatorio_mins)
       VALUES (?, ?, ?, ?, ?, 'confirmada', ?)`,
      [clienteId, servicioId, empleadoId, fechaInicio, fechaFin, recordatorioMins]
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
    `SELECT c.id, s.nombre AS servicio, s.id AS servicio_id, s.duracion_min,
            c.fecha_inicio, c.estado, c.empleado_id
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

/**
 * Actualiza la fecha/hora de una cita existente.
 * @param {number} citaId
 * @param {string} fechaInicio  - 'YYYY-MM-DD HH:mm:ss'
 * @param {string} fechaFin     - 'YYYY-MM-DD HH:mm:ss'
 */
async function actualizarFechaHoraCita(citaId, fechaInicio, fechaFin) {
  const [result] = await pool.execute(
    `UPDATE citas SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?`,
    [fechaInicio, fechaFin, citaId]
  );
  return result.affectedRows > 0;
}

// ─────────────────────────────────────────────────────────────────
//  CITAS — Queries para la API REST (Nexus-App)
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna todas las citas de un día específico, con info de cliente,
 * servicio y empleado. Usada por GET /api/citas/hoy.
 * @param {string} fecha - Formato 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
async function getCitasPorFecha(fecha) {
  const usaCurDate = !fecha || fecha === 'hoy';
  const usaManana  = fecha === 'manana';

  let dateWhere = 'DATE(c.fecha_inicio) = ?';
  let params    = [fecha];

  if (usaCurDate) {
    dateWhere = 'DATE(c.fecha_inicio) = CURDATE()';
    params    = [];
  } else if (usaManana) {
    dateWhere = 'DATE(c.fecha_inicio) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
    params    = [];
  }

  const [rows] = await pool.execute(
    `SELECT
       c.id,
       DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d') AS fecha,
       TIME_FORMAT(c.fecha_inicio, '%H:%i')    AS hora,
       TIME_FORMAT(c.fecha_fin,   '%H:%i')    AS hora_fin,
       DATE_FORMAT(c.creado_en, '%Y-%m-%d %H:%i') AS creado_en,
       c.estado,
       cl.nombre   AS cliente,
       cl.telefono,
       s.nombre    AS servicio,
       c.servicio_id,
       s.duracion_min,
       COALESCE(c.precio, s.precio) AS precio,
       u.nombre    AS empleado
     FROM citas c
     JOIN clientes  cl ON c.cliente_id  = cl.id
     JOIN servicios  s ON c.servicio_id = s.id
     LEFT JOIN usuarios u ON c.empleado_id = u.id
     WHERE ${dateWhere}
     ORDER BY c.fecha_inicio ASC`,
    params
  );
  return rows;
}

/**
 * Retorna citas con filtros opcionales: fecha, estado, empleadoId.
 * Usada por GET /api/citas.
 * @param {object} filtros - { fecha?, estado?, empleadoId? }
 * @returns {Promise<Array>}
 */
async function getCitasFiltradas({ fecha, estado, empleadoId } = {}) {
  const condiciones = [];
  const params = [];

  if (fecha)      { condiciones.push('DATE(c.fecha_inicio) = ?'); params.push(fecha); }
  if (estado)     { condiciones.push('c.estado = ?');             params.push(estado); }
  if (empleadoId) { condiciones.push('c.empleado_id = ?');        params.push(Number(empleadoId)); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT
       c.id,
       DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d') AS fecha,
       TIME_FORMAT(c.fecha_inicio, '%H:%i')    AS hora,
       DATE_FORMAT(c.creado_en, '%Y-%m-%d %H:%i') AS creado_en,
       c.estado,
       cl.nombre   AS cliente,
       cl.telefono,
       s.nombre    AS servicio,
       c.servicio_id,
       s.duracion_min,
       COALESCE(c.precio, s.precio) AS precio,
       u.nombre    AS empleado
     FROM citas c
     JOIN clientes  cl ON c.cliente_id  = cl.id
     JOIN servicios  s ON c.servicio_id = s.id
     LEFT JOIN usuarios u ON c.empleado_id = u.id
     ${where}
     ORDER BY c.fecha_inicio DESC
     LIMIT 200`,
    params
  );
  return rows;
}

/**
 * Actualiza el estado de una cita desde la app (recepcionista o admin).
 * @param {number} citaId
 * @param {string} estado - 'completada' | 'cancelada' | 'pendiente' | 'confirmada'
 * @returns {Promise<boolean>} true si se actualizó
 */
async function updateEstadoCita(citaId, estado) {
  const [result] = await pool.execute(
    'UPDATE citas SET estado = ? WHERE id = ?',
    [estado, citaId]
  );
  return result.affectedRows > 0;
}

// ─────────────────────────────────────────────────────────────────
//  CLIENTES — Lista para la app
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna la lista de clientes con su número de citas.
 * Usada por GET /api/clientes.
 * @returns {Promise<Array>}
 */
async function getClientesLista() {
  const [rows] = await pool.execute(
    `SELECT
       cl.id,
       cl.telefono,
       cl.nombre,
       cl.creado_en,
       COUNT(c.id)                                        AS total_citas,
       MAX(DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d %H:%i')) AS ultima_cita
     FROM clientes cl
     LEFT JOIN citas c ON cl.id = c.cliente_id
     GROUP BY cl.id
     ORDER BY cl.creado_en DESC
     LIMIT 500`
  );

  // Deduplicar por nombre (priorizando los que tienen teléfono real vs LID)
  const mapaUnico = new Map();
  for (const row of rows) {
    const key = (row.nombre || '').toLowerCase().trim();
    if (!key) {
      mapaUnico.set(`id_${row.id}`, row);
      continue;
    }
    if (!mapaUnico.has(key)) {
      mapaUnico.set(key, row);
    } else {
      const existente = mapaUnico.get(key);
      const telExistente = (existente.telefono || '').replace(/[^0-9]/g, '');
      const telNuevo = (row.telefono || '').replace(/[^0-9]/g, '');
      if (telExistente.length > 12 && telNuevo.length <= 12 && telNuevo.length >= 10) {
        mapaUnico.set(key, row);
      }
    }
  }

  return Array.from(mapaUnico.values());
}

// ─────────────────────────────────────────────────────────────────
//  DASHBOARD — Estadísticas para el dueño
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula las métricas del dashboard:
 * - citasHoy          → total de citas del día
 * - clientesNuevos    → clientes registrados este mes
 * - tasaAsistencia    → % de citas completadas vs confirmadas (últimos 30 días)
 * - ingresosEstimados → suma de precios de citas completadas hoy
 * @returns {Promise<object>}
 */
async function getDashboardStats() {
  // Citas de hoy
  const [[{ citasHoy }]] = await pool.execute(
    `SELECT COUNT(*) AS citasHoy FROM citas WHERE DATE(fecha_inicio) = CURDATE() AND estado != 'cancelada'`
  );

  // Citas de mañana
  const [[{ citasManana }]] = await pool.execute(
    `SELECT COUNT(*) AS citasManana FROM citas WHERE DATE(fecha_inicio) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND estado != 'cancelada'`
  );

  // Clientes nuevos este mes
  const [[{ clientesNuevos }]] = await pool.execute(
    `SELECT COUNT(*) AS clientesNuevos FROM clientes
     WHERE YEAR(creado_en) = YEAR(NOW()) AND MONTH(creado_en) = MONTH(NOW())`
  );

  // Tasa de asistencia (últimos 30 días)
  const [[tasaRow]] = await pool.execute(
    `SELECT
       COUNT(CASE WHEN estado = 'completada' THEN 1 END) AS completadas,
       COUNT(CASE WHEN estado IN ('completada','cancelada') THEN 1 END) AS finalizadas
     FROM citas
     WHERE fecha_inicio >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  const tasaAsistencia = tasaRow.finalizadas > 0
    ? `${Math.round((tasaRow.completadas / tasaRow.finalizadas) * 100)}%`
    : 'N/A';

  // Ingresos del día — solo citas marcadas como completada
  const [[{ ingresosHoy }]] = await pool.execute(
    `SELECT COALESCE(SUM(COALESCE(c.precio, s.precio)), 0) AS ingresosHoy
     FROM citas c
     JOIN servicios s ON c.servicio_id = s.id
     WHERE DATE(c.fecha_inicio) = CURDATE() AND c.estado = 'completada'`
  );

  return {
    citasHoy,
    citasManana,
    clientesNuevos,
    tasaAsistencia,
    ingresosHoy: ingresosHoy > 0 ? `$${Number(ingresosHoy).toFixed(0)}` : '$0',
  };
}

// ─────────────────────────────────────────────────────────────────
//  INGRESOS — Historial diario para la app
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna el historial de ingresos agrupado por día (últimos 60 días).
 * Solo cuenta citas con estado = 'completada'.
 * @returns {Promise<Array>} [{ fecha, citas_completadas, total }]
 */
async function getIngresosDiarios() {
  const [rows] = await pool.execute(
    `SELECT
       DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d') AS fecha,
       COUNT(c.id)                             AS citas_completadas,
       COALESCE(SUM(COALESCE(c.precio, s.precio)), 0) AS total
     FROM citas c
     JOIN servicios s ON c.servicio_id = s.id
     WHERE c.estado = 'completada'
       AND c.fecha_inicio >= DATE_SUB(NOW(), INTERVAL 60 DAY)
     GROUP BY DATE(c.fecha_inicio)
     ORDER BY fecha DESC`
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────────
//  BLOQUEOS — Creación desde la app
// ─────────────────────────────────────────────────────────────────

/**
 * Crea un bloqueo puntual (urgente) desde la Nexus-App.
 * @param {object} datos - { motivo, fechaInicio, fechaFin, empleadoId? }
 * @returns {Promise<number>} ID del bloqueo creado
 */
async function crearBloqueo({ motivo, fechaInicio, fechaFin, empleadoId }) {
  const [result] = await pool.execute(
    `INSERT INTO bloqueos (empleado_id, motivo, fecha_inicio, fecha_fin, recurrente)
     VALUES (?, ?, ?, ?, 0)`,
    [empleadoId || null, motivo, fechaInicio, fechaFin]
  );
  return result.insertId;
}

// ─────────────────────────────────────────────────────────────────
//  CONFIG NEGOCIO
// ─────────────────────────────────────────────────────────────────

/**
 * Retorna el valor de una clave de configuración del negocio.
 * @param {string} clave  - Ej: 'MIN_BOOKING_HOURS'
 * @returns {Promise<string|null>}
 */
async function getConfig(clave) {
  const [rows] = await pool.execute(
    'SELECT valor FROM config_negocio WHERE clave = ?',
    [clave]
  );
  return rows[0]?.valor ?? null;
}

/**
 * Obtiene toda la configuración del negocio como objeto clave: valor.
 */
async function getAllConfig() {
  const [rows] = await pool.execute('SELECT clave, valor FROM config_negocio');
  const configObj = {};
  for (const row of rows) {
    configObj[row.clave] = row.valor;
  }
  return configObj;
}

/**
 * Auto-migración silenciosa de columnas para recordatorios y teléfonos de empleados
 */
async function ensureRemindersSchema() {
  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20) NULL').catch(() => {});
    await pool.query('ALTER TABLE usuarios ADD COLUMN hora_inicio_comida VARCHAR(10) NULL').catch(() => {});
    await pool.query('ALTER TABLE usuarios ADD COLUMN hora_fin_comida VARCHAR(10) NULL').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN recordatorio_mins INT UNSIGNED NOT NULL DEFAULT 120').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN recordatorio_enviado TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN notificacion_empleado_enviada TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN precio DECIMAL(10,2) NULL').catch(() => {});
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empleado_servicios (
        empleado_id INT UNSIGNED NOT NULL,
        servicio_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (empleado_id, servicio_id)
      ) ENGINE=InnoDB
    `).catch(() => {});

    await pool.query(`
      INSERT INTO config_negocio (clave, valor)
      VALUES ('PLAN_TYPE', 'pro')
      ON DUPLICATE KEY UPDATE valor = valor
    `).catch(() => {});

    console.log('✅ Esquema MariaDB verificado (empleado_servicios, horario comida & PLAN_TYPE)');
  } catch (e) {
    console.warn('⚠️ Nota sobre esquema:', e.message);
  }
}
ensureRemindersSchema();

/**
 * Obtiene el plan activo del negocio ('basico' | 'pro').
 */
async function getPlanType() {
  const plan = await getConfig('PLAN_TYPE');
  return (plan || 'pro').toLowerCase();
}

/**
 * Obtiene el especialista preferido/frecuente de un cliente para un servicio dado (ej. Ortodoncia).
 */
async function getEmpleadoPreferidoCliente(clienteId, servicioId) {
  if (!clienteId || !servicioId) return null;
  const [rows] = await pool.execute(
    `SELECT c.empleado_id, u.nombre AS empleado_nombre
     FROM citas c
     JOIN usuarios u ON c.empleado_id = u.id
     WHERE c.cliente_id = ?
       AND c.servicio_id = ?
       AND c.empleado_id IS NOT NULL
       AND c.estado != 'cancelada'
     ORDER BY c.fecha_inicio DESC
     LIMIT 1`,
    [clienteId, servicioId]
  );
  return rows[0] || null;
}

/**
 * Obtiene la lista de empleados habilitados para realizar un servicio.
 */
async function getEmpleadosPorServicio(servicioId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre, u.telefono
     FROM usuarios u
     JOIN empleado_servicios es ON u.id = es.empleado_id
     WHERE es.servicio_id = ? AND u.activo = 1`,
    [servicioId]
  );
  if (rows.length > 0) return rows;

  // Si no hay asignación explícita, se consideran todos los empleados activos
  const [todos] = await pool.execute(
    `SELECT id, nombre, telefono FROM usuarios WHERE activo = 1 ORDER BY id ASC`
  );
  return todos;
}

/**
 * Obtiene la lista de IDs de servicios autorizados para un empleado.
 */
async function getServiciosEmpleado(empleadoId) {
  const [rows] = await pool.execute(
    `SELECT servicio_id FROM empleado_servicios WHERE empleado_id = ?`,
    [empleadoId]
  );
  return rows.map(r => r.servicio_id);
}

/**
 * Guarda los servicios habilitados para un empleado.
 */
async function setServiciosEmpleado(empleadoId, servicioIds = []) {
  await pool.execute(`DELETE FROM empleado_servicios WHERE empleado_id = ?`, [empleadoId]);
  for (const sId of servicioIds) {
    await pool.execute(
      `INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES (?, ?)`,
      [empleadoId, sId]
    ).catch(() => {});
  }
}

/**
 * Obtiene la lista de empleados/usuarios del negocio.
 */
async function getEmpleados() {
  const [rows] = await pool.execute(
    `SELECT id, nombre, email, telefono, rol, activo, hora_inicio_comida, hora_fin_comida, creado_en FROM usuarios ORDER BY id DESC`
  );
  return rows;
}

/**
 * Crea o actualiza un empleado en la base de datos.
 */
async function guardarEmpleado({ id, nombre, email, password, telefono, rol = 'empleado', activo = 1, horaInicioComida = null, horaFinComida = null }) {
  const bcrypt = require('bcrypt');
  const hInicio = horaInicioComida && horaInicioComida.trim() ? horaInicioComida.trim() : null;
  const hFin = horaFinComida && horaFinComida.trim() ? horaFinComida.trim() : null;

  if (id) {
    let sql = 'UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, rol = ?, activo = ?, hora_inicio_comida = ?, hora_fin_comida = ?';
    const params = [nombre, email, telefono || null, rol, activo, hInicio, hFin];
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sql += ', password = ?';
      params.push(hash);
    }
    sql += ' WHERE id = ?';
    params.push(id);
    await pool.execute(sql, params);
    return id;
  } else {
    const hash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('123456', 10);
    const [res] = await pool.execute(
      `INSERT INTO usuarios (nombre, email, password, telefono, rol, activo, hora_inicio_comida, hora_fin_comida) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, email, hash, telefono || null, rol, activo, hInicio, hFin]
    );
    return res.insertId;
  }
}

/**
 * Obtiene todos los servicios (incluyendo inactivos para admin).
 */
async function getServiciosAdmin() {
  const [rows] = await pool.execute(
    'SELECT id, nombre, descripcion, precio, duracion_min, activo FROM servicios ORDER BY id ASC'
  );
  return rows;
}

/**
 * Crea o actualiza un servicio.
 */
async function guardarServicio({ id, nombre, precio, duracionMin, descripcion, activo = 1 }) {
  const numPrecio = (precio != null && precio !== '') ? Number(precio) : null;
  const numDuracion = (duracionMin != null && duracionMin !== '') ? Number(duracionMin) : 60;
  const act = activo ? 1 : 0;
  const desc = descripcion ? descripcion.trim() : null;

  if (id) {
    await pool.execute(
      `UPDATE servicios SET nombre = ?, precio = ?, duracion_min = ?, descripcion = ?, activo = ? WHERE id = ?`,
      [nombre.trim(), numPrecio, numDuracion, desc, act, id]
    );
    return id;
  } else {
    const [res] = await pool.execute(
      `INSERT INTO servicios (nombre, precio, duracion_min, descripcion, activo) VALUES (?, ?, ?, ?, ?)`,
      [nombre.trim(), numPrecio, numDuracion, desc, act]
    );
    return res.insertId;
  }
}

/**
 * Desactiva / Elimina un servicio.
 */
async function deleteServicio(id) {
  await pool.execute(`UPDATE servicios SET activo = 0 WHERE id = ?`, [id]);
  return true;
}

/**
 * Obtiene el teléfono del empleado asignado a una cita o el teléfono del admin.
 */
async function getTelefonoEmpleado(empleadoId = null) {
  if (empleadoId) {
    const [rows] = await pool.execute(
      "SELECT telefono, nombre FROM usuarios WHERE id = ? AND telefono IS NOT NULL AND telefono != ''",
      [empleadoId]
    );
    if (rows.length > 0 && rows[0].telefono) return rows[0];
  }
  // Fallback: buscar cualquier usuario (admin o empleado) que tenga teléfono registrado
  const [usuariosConTel] = await pool.execute(
    "SELECT telefono, nombre FROM usuarios WHERE telefono IS NOT NULL AND telefono != '' ORDER BY (rol = 'admin') DESC, id ASC LIMIT 1"
  );
  return usuariosConTel[0] || null;
}

/**
 * Busca citas confirmadas cuyos recordatorios deben enviarse ahora por WhatsApp.
 */
async function getCitasPendientesRecordatorio() {
  const [rows] = await pool.execute(
    `SELECT 
       c.id,
       c.fecha_inicio,
       c.recordatorio_mins,
       cl.telefono AS cliente_telefono,
       cl.nombre AS cliente_nombre,
       s.nombre AS servicio_nombre,
       u.nombre AS empleado_nombre,
       u.telefono AS empleado_telefono
     FROM citas c
     JOIN clientes cl ON c.cliente_id = cl.id
     JOIN servicios s ON c.servicio_id = s.id
     LEFT JOIN usuarios u ON c.empleado_id = u.id
     WHERE c.estado = 'confirmada'
       AND c.recordatorio_mins > 0
       AND c.recordatorio_enviado = 0
       AND c.fecha_inicio > NOW()
       AND TIMESTAMPDIFF(MINUTE, NOW(), c.fecha_inicio) <= c.recordatorio_mins`
  );
  return rows;
}

/**
 * Marca que el recordatorio por WhatsApp de una cita fue enviado.
 */
async function markRecordatorioEnviado(citaId) {
  await pool.execute('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?', [citaId]);
}

/**
 * Obtiene el historial completo de citas de un cliente.
 */
async function getCitasCliente(clienteId) {
  const [rows] = await pool.execute(
    `SELECT 
       c.id,
       c.fecha_inicio,
       c.fecha_fin,
       c.estado,
       c.creado_en,
       s.nombre AS servicio,
       c.servicio_id,
       COALESCE(c.precio, s.precio) AS precio,
       s.duracion_min,
       u.nombre AS empleado
     FROM citas c
     JOIN servicios s ON c.servicio_id = s.id
     LEFT JOIN usuarios u ON c.empleado_id = u.id
     WHERE c.cliente_id = ?
     ORDER BY c.fecha_inicio DESC`,
    [clienteId]
  );
  return rows;
}

/**
 * Obtiene información detallada de una cita por su ID.
 */
async function getCitaFullInfo(citaId) {
  const [rows] = await pool.execute(
    `SELECT 
       c.id,
       c.fecha_inicio,
       c.fecha_fin,
       c.estado,
       c.creado_en,
       c.servicio_id,
       cl.nombre AS cliente_nombre,
       cl.telefono AS cliente_telefono,
       s.nombre AS servicio_nombre,
       COALESCE(c.precio, s.precio) AS precio,
       u.nombre AS empleado_nombre,
       u.id AS empleado_id
     FROM citas c
     JOIN clientes cl ON c.cliente_id = cl.id
     JOIN servicios s ON c.servicio_id = s.id
     LEFT JOIN usuarios u ON c.empleado_id = u.id
     WHERE c.id = ?`,
    [citaId]
  );
  return rows[0] || null;
}

/**
 * Obtiene el detalle mensual de citas completadas para reporte contable.
 */
async function getReporteIngresosMensual(mesStr) {
  // mesStr ej: '2026-07'
  const [rows] = await pool.execute(
    `SELECT 
       c.id,
       DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d %H:%i') AS fecha,
       cl.nombre AS cliente,
       cl.telefono,
       s.nombre AS servicio,
       COALESCE(c.precio, s.precio, 0) AS precio,
       COALESCE(u.nombre, 'Sin asignar') AS empleado
     FROM citas c
     JOIN clientes cl ON c.cliente_id = cl.id
     JOIN servicios s ON c.servicio_id = s.id
     LEFT JOIN usuarios u ON c.empleado_id = u.id
     WHERE c.estado = 'completada'
       AND DATE_FORMAT(c.fecha_inicio, '%Y-%m') = ?
     ORDER BY c.fecha_inicio ASC`,
    [mesStr]
  );
  return rows;
}

/**
 * Actualiza el servicio y/o precio personalizado de una cita existente.
 */
async function updateCitaServicioPrecio(citaId, { servicioId, precio }) {
  const numPrecio = (precio != null && precio !== '') ? Number(precio) : null;
  await pool.execute(
    `UPDATE citas 
     SET servicio_id = COALESCE(?, servicio_id),
         precio = ?
     WHERE id = ?`,
    [servicioId || null, numPrecio, citaId]
  );
}

module.exports = {
  // Bot
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
  getConfig,
  getAllConfig,
  getPlanType,
  getEmpleados,
  guardarEmpleado,
  getServiciosAdmin,
  guardarServicio,
  deleteServicio,
  getEmpleadoPreferidoCliente,
  getEmpleadosPorServicio,
  getServiciosEmpleado,
  setServiciosEmpleado,
  getTelefonoEmpleado,
  getCitasPendientesRecordatorio,
  markRecordatorioEnviado,
  getCitasCliente,
  getCitaFullInfo,
  getReporteIngresosMensual,
  updateCitaServicioPrecio,
  // API REST (Nexus-App)
  getCitasPorFecha,
  getCitasFiltradas,
  updateEstadoCita,
  getClientesLista,
  getDashboardStats,
  getIngresosDiarios,
  crearBloqueo,
  actualizarFechaHoraCita,
};
