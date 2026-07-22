// src/db/queries.mock.js
// ══════════════════════════════════════════════════════════════════
//  MOCK DE QUERIES — Simula la base de datos en memoria.
//  Misma interfaz exacta que queries.js → el bot funciona completo.
//  Activar: renombra este archivo a queries.js (guarda el original).
// ══════════════════════════════════════════════════════════════════

console.log('🟡 [MOCK] Base de datos en modo simulación (datos en memoria).');

// ─────────────────────────────────────────────────────────────────
//  DATOS DE MUESTRA
//  Edítalos a gusto para simular distintos escenarios.
// ─────────────────────────────────────────────────────────────────

// Clientes registrados (se agregan dinámicamente al llamar findOrCreateCliente)
const clientes = [
  { id: 1, telefono: '+526789012345', nombre: 'Eduardo' },
];

// Catálogo de servicios (refleja el schema real del VPS)
// precio: null = precio variable / no aplica | mostrar_precio: 1 = el bot lo menciona
const servicios = [
  { id: 1, nombre: 'Consulta general',  descripcion: 'Revisión y diagnóstico',        duracion_min: 30, precio: null,   mostrar_precio: 0, activo: 1 },
  { id: 2, nombre: 'Limpieza dental',   descripcion: 'Limpieza y pulido profesional',  duracion_min: 60, precio: null,   mostrar_precio: 0, activo: 1 },
  { id: 3, nombre: 'Extracción simple', descripcion: 'Extracción de pieza dental',     duracion_min: 45, precio: null,   mostrar_precio: 0, activo: 1 },
  { id: 4, nombre: 'Ortodoncia',        descripcion: 'Revisión de aparato',            duracion_min: 20, precio: null,   mostrar_precio: 0, activo: 1 },
];

// Horarios de trabajo: Lunes (1) a Viernes (5), 9am–6pm (horario global)
const horarios_trabajo = [
  { id: 1, empleado_id: null, dia_semana: 1, hora_inicio: '09:00:00', hora_fin: '18:00:00' },
  { id: 2, empleado_id: null, dia_semana: 2, hora_inicio: '09:00:00', hora_fin: '18:00:00' },
  { id: 3, empleado_id: null, dia_semana: 3, hora_inicio: '09:00:00', hora_fin: '18:00:00' },
  { id: 4, empleado_id: null, dia_semana: 4, hora_inicio: '09:00:00', hora_fin: '18:00:00' },
  { id: 5, empleado_id: null, dia_semana: 5, hora_inicio: '09:00:00', hora_fin: '18:00:00' },
];

// Bloqueos activos (comidas, festivos, etc.)
// recurrente = false → bloqueo puntual (fecha_inicio/fecha_fin absolutas)
// recurrente = true  → bloqueo diario repetido:
//   hora_inicio_hora / hora_fin_hora = hora del día que bloquea
//   dias_semana = array de días (0=Dom, 1=Lun, ..., 6=Sáb)
//   fecha_inicio / fecha_fin = rango de validez de la recurrencia
const bloqueos = [
  // Ejemplo bloqueo puntual:
  // { id: 1, empleado_id: null, motivo: 'Festivo', fecha_inicio: new Date('2026-07-04 00:00:00'), fecha_fin: new Date('2026-07-04 23:59:59'), recurrente: false },
  //
  // Ejemplo bloqueo recurrente (comida Lun–Vie 2pm–3pm):
  // { id: 2, empleado_id: null, motivo: 'Comida', fecha_inicio: new Date('2026-01-01'), fecha_fin: new Date('2026-12-31'), recurrente: true, hora_inicio_hora: '14:00', hora_fin_hora: '15:00', dias_semana: [1,2,3,4,5] },
];

// Citas agendadas (se agregan dinámicamente al llamar createCita)
const citas = [];
let nextCitaId = 100;
let nextClienteId = clientes.length + 1;

// ─────────────────────────────────────────────────────────────────
//  CONFIG DEL NEGOCIO — tabla config_negocio (migración 002)
//  Mismos valores por defecto que el INSERT de la migración SQL.
// ─────────────────────────────────────────────────────────────────
const config_negocio = {
  MIN_BOOKING_HOURS:  process.env.MIN_BOOKING_HOURS  || '2',
  MAX_BOOKING_DAYS:   process.env.MAX_BOOKING_DAYS   || '30',
  EMPLOYEE_SELECTION: process.env.EMPLOYEE_SELECTION || 'false',
  CANCEL_HOURS_LIMIT: process.env.CANCEL_HOURS_LIMIT || '24',
  OFFER_RESCHEDULE:   process.env.OFFER_RESCHEDULE   || 'true',
  BOT_NAME:           process.env.BOT_NAME           || 'Nexus',
  BOT_WELCOME_MSG:    process.env.BOT_WELCOME_MSG    || '',
};

// ─────────────────────────────────────────────────────────────────
//  CLIENTES
// ─────────────────────────────────────────────────────────────────

async function findOrCreateCliente(telefono) {
  let cliente = clientes.find(c => c.telefono === telefono);
  if (cliente) return cliente;

  cliente = { id: nextClienteId++, telefono, nombre: null };
  clientes.push(cliente);
  console.log(`[MOCK] Cliente nuevo creado: ${telefono} (id=${cliente.id})`);
  return cliente;
}

async function updateClienteNombre(clienteId, nombre) {
  const cliente = clientes.find(c => c.id === clienteId);
  if (cliente) {
    cliente.nombre = nombre;
    console.log(`[MOCK] Nombre actualizado → cliente ${clienteId}: "${nombre}"`);
  }
}

// ─────────────────────────────────────────────────────────────────
//  SERVICIOS
// ─────────────────────────────────────────────────────────────────

async function getServicios() {
  return [...servicios];
}

async function getServicioById(id) {
  return servicios.find(s => s.id === Number(id)) || null;
}

// ─────────────────────────────────────────────────────────────────
//  DISPONIBILIDAD
// ─────────────────────────────────────────────────────────────────

async function getHorarioTrabajo(diaSemana, empleadoId = null) {
  // Prioriza horario específico del empleado; si no, el global
  const especifico = horarios_trabajo.find(
    h => h.dia_semana === diaSemana && h.empleado_id === empleadoId
  );
  if (especifico) return especifico;

  const global = horarios_trabajo.find(
    h => h.dia_semana === diaSemana && h.empleado_id === null
  );
  return global || null;
}

async function getSlotOcupados(fecha, empleadoId = null) {
  return citas
    .filter(c => {
      const fechaCita = new Date(c.fecha_inicio);
      const fechaBuscar = fecha; // 'YYYY-MM-DD'
      const citaFecha = fechaCita.toISOString().slice(0, 10);
      const mismoEmpleado = empleadoId ? c.empleado_id === empleadoId : true;
      return citaFecha === fechaBuscar && c.estado !== 'cancelada' && mismoEmpleado;
    })
    .map(c => {
      const d = new Date(c.fecha_inicio);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    });
}

async function isBloqueado(fechaHora, empleadoId = null) {
  const dt  = new Date(fechaHora);
  const ts  = dt.getTime();

  return bloqueos.some(b => {
    const aplica = b.empleado_id === null || b.empleado_id === empleadoId;
    if (!aplica) return false;

    if (!b.recurrente) {
      // ── Bloqueo puntual: rango absoluto de fecha ──────────────
      return ts >= new Date(b.fecha_inicio).getTime() && ts <= new Date(b.fecha_fin).getTime();
    }

    // ── Bloqueo recurrente: verificar rango de validez, día y hora ─
    const dentroDelRango = ts >= new Date(b.fecha_inicio).getTime() && ts <= new Date(b.fecha_fin).getTime();
    if (!dentroDelRango) return false;

    const diaActual = dt.getDay(); // 0=Dom … 6=Sáb
    if (!b.dias_semana.includes(diaActual)) return false;

    // Comparar hora del slot con la ventana de bloqueo diaria
    const [hIni, mIni] = b.hora_inicio_hora.split(':').map(Number);
    const [hFin, mFin] = b.hora_fin_hora.split(':').map(Number);
    const minutosSlot  = dt.getHours() * 60 + dt.getMinutes();
    const minutosIni   = hIni * 60 + mIni;
    const minutosFin   = hFin * 60 + mFin;

    return minutosSlot >= minutosIni && minutosSlot < minutosFin;
  });
}

// ─────────────────────────────────────────────────────────────────
//  CITAS
// ─────────────────────────────────────────────────────────────────

async function createCita({ clienteId, servicioId, empleadoId, fechaInicio, fechaFin }) {
  // Simula la restricción UNIQUE KEY (empleado_id, fecha_inicio)
  const duplicado = citas.find(
    c => c.empleado_id === empleadoId && c.fecha_inicio === fechaInicio && c.estado !== 'cancelada'
  );
  if (duplicado) throw new Error('SLOT_OCUPADO');

  const cita = {
    id: nextCitaId++,
    cliente_id: clienteId,
    servicio_id: servicioId,
    empleado_id: empleadoId,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    estado: 'confirmada',
  };
  citas.push(cita);
  console.log(`[MOCK] ✅ Cita creada id=${cita.id} | ${fechaInicio} | servicio=${servicioId}`);
  return cita.id;
}

async function cancelCita(citaId, telefono) {
  const cliente = clientes.find(c => c.telefono === telefono);
  if (!cliente) return false;

  const cita = citas.find(
    c => c.id === Number(citaId) && c.cliente_id === cliente.id && c.estado === 'confirmada'
  );
  if (!cita) return false;

  cita.estado = 'cancelada';
  console.log(`[MOCK] ❌ Cita cancelada id=${citaId}`);
  return true;
}

async function getCitasActivasCliente(clienteId) {
  const ahora = new Date();
  return citas
    .filter(c => c.cliente_id === clienteId && c.estado === 'confirmada' && new Date(c.fecha_inicio) > ahora)
    .map(c => {
      const servicio = servicios.find(s => s.id === c.servicio_id);
      return {
        id: c.id,
        servicio: servicio ? servicio.nombre : 'Servicio desconocido',
        fecha_inicio: new Date(c.fecha_inicio),
        estado: c.estado,
      };
    })
    .sort((a, b) => a.fecha_inicio - b.fecha_inicio);
}

// ─────────────────────────────────────────────────────────────────
//  CITAS — Queries para la API REST (Nexus-App)
// ─────────────────────────────────────────────────────────────────

// Helper que enriquece una cita con datos relacionados
function _enrichCita(c) {
  const cl = clientes.find(x => x.id === c.cliente_id);
  const s  = servicios.find(x => x.id === c.servicio_id);
  const dt = new Date(c.fecha_inicio);
  const dtFin = new Date(c.fecha_fin);
  const pad = n => String(n).padStart(2, '0');
  return {
    id:          c.id,
    fecha:       dt.toISOString().slice(0, 10),
    hora:        `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    hora_fin:    `${pad(dtFin.getHours())}:${pad(dtFin.getMinutes())}`,
    estado:      c.estado,
    cliente:     cl?.nombre ?? null,
    telefono:    cl?.telefono ?? null,
    servicio:    s?.nombre ?? 'Servicio desconocido',
    duracion_min: s?.duracion_min ?? 0,
    empleado:    null, // sin tabla usuarios en mock
  };
}

async function getCitasPorFecha(fecha) {
  return citas
    .filter(c => new Date(c.fecha_inicio).toISOString().slice(0, 10) === fecha)
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
    .map(_enrichCita);
}

async function getCitasFiltradas({ fecha, estado, empleadoId } = {}) {
  return citas
    .filter(c => {
      if (fecha && new Date(c.fecha_inicio).toISOString().slice(0, 10) !== fecha) return false;
      if (estado && c.estado !== estado) return false;
      if (empleadoId && c.empleado_id !== Number(empleadoId)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
    .map(_enrichCita);
}

async function updateEstadoCita(citaId, estado) {
  const cita = citas.find(c => c.id === Number(citaId));
  if (!cita) return false;
  cita.estado = estado;
  console.log(`[MOCK] Estado de cita ${citaId} actualizado a "${estado}"`);
  return true;
}

// ─────────────────────────────────────────────────────────────────
//  CLIENTES — Lista para la app
// ─────────────────────────────────────────────────────────────────

async function getClientesLista() {
  return clientes.map(cl => {
    const citasCliente = citas.filter(c => c.cliente_id === cl.id);
    const ultima = citasCliente
      .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))[0];
    return {
      id:          cl.id,
      telefono:    cl.telefono,
      nombre:      cl.nombre,
      creado_en:   new Date().toISOString(),
      total_citas: citasCliente.length,
      ultima_cita: ultima ? new Date(ultima.fecha_inicio).toISOString().slice(0, 16).replace('T', ' ') : null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
//  DASHBOARD — Estadísticas para el dueño
// ─────────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const hoy = new Date().toISOString().slice(0, 10);

  const citasHoy = citas.filter(
    c => new Date(c.fecha_inicio).toISOString().slice(0, 10) === hoy && c.estado !== 'cancelada'
  ).length;

  const clientesNuevos = clientes.length; // en mock todos son "nuevos"

  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const citasRecientes = citas.filter(c => new Date(c.fecha_inicio) >= hace30);
  const completadas = citasRecientes.filter(c => c.estado === 'completada').length;
  const finalizadas = citasRecientes.filter(c => ['completada', 'cancelada'].includes(c.estado)).length;
  const tasaAsistencia = finalizadas > 0 ? `${Math.round((completadas / finalizadas) * 100)}%` : 'N/A';

  // Ingresos (mock no tiene precios, devuelve $0)
  const ingresosEstimados = '$0';

  return { citasHoy, clientesNuevos, tasaAsistencia, ingresosEstimados };
}

// ─────────────────────────────────────────────────────────────────
//  BLOQUEOS — Creación desde la app
// ─────────────────────────────────────────────────────────────────

let nextBloqueoId = 10;
async function crearBloqueo({ motivo, fechaInicio, fechaFin, empleadoId }) {
  const bloqueo = {
    id: nextBloqueoId++,
    empleado_id: empleadoId || null,
    motivo,
    fecha_inicio: new Date(fechaInicio),
    fecha_fin:    new Date(fechaFin),
    recurrente: false,
  };
  bloqueos.push(bloqueo);
  console.log(`[MOCK] Bloqueo creado: "${motivo}" ${fechaInicio} → ${fechaFin}`);
  return bloqueo.id;
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
  return config_negocio[clave] ?? null;
}

/**
 * Retorna toda la configuración del negocio como objeto clave→valor.
 * @returns {Promise<object>}
 */
async function getAllConfig() {
  return { ...config_negocio };
}

// ─────────────────────────────────────────────────────────────────
//  EXPORTS — misma interfaz que queries.js real
// ─────────────────────────────────────────────────────────────────

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
  // API REST (Nexus-App)
  getCitasPorFecha,
  getCitasFiltradas,
  updateEstadoCita,
  getClientesLista,
  getDashboardStats,
  crearBloqueo,
};
