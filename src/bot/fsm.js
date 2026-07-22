// src/bot/fsm.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Máquina de Estados Finitos (FSM)
//  Punto central que recibe CADA mensaje y decide qué hacer.
// ══════════════════════════════════════════════════════════════════

const { findOrCreateCliente }               = require('../db/queries');
const { handleWelcome, handleWaitingName, buildMenuPrincipal } = require('./handlers/welcome');
const { handleServiceMenu, handleServiceSelect }               = require('./handlers/service');
const { handleDateSelect }                  = require('./handlers/date');
const { handleTimeSelect }                  = require('./handlers/time');
const { handleConfirmation, handleEditMenu, handleCancelFlow, handleCancelSelect } = require('./handlers/confirm');
const { quiereAgendar, quiereCancelar, quiereVerCitas } = require('../utils/regex');
const { getSlotsDisponibles, formatSlotsParaWhatsApp, formatFechaEspanol } = require('../utils/slots');

// ─────────────────────────────────────────────────────────────────
//  ALMACÉN DE SESIONES EN MEMORIA
//  Clave: número de teléfono  |  Valor: objeto de sesión
// ─────────────────────────────────────────────────────────────────
const sessions = new Map();

/** Tiempo de expiración de sesión inactiva: 30 minutos */
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Obtiene o crea la sesión de un usuario.
 * Si la sesión expiró (sin actividad > 30 min), la resetea.
 */
function getOrCreateSession(telefono) {
  if (sessions.has(telefono)) {
    const sesion = sessions.get(telefono);
    const ahora  = Date.now();

    // Expirar sesión inactiva
    if (ahora - sesion.lastActivity > SESSION_TTL_MS) {
      console.log(`⏱️  Sesión expirada para ${telefono}. Reiniciando.`);
      sessions.delete(telefono);
    } else {
      sesion.lastActivity = ahora;
      return sesion;
    }
  }

  // Sesión nueva
  const sesion = {
    state:        'IDLE',
    telefono,
    clienteId:    null,
    nombre:       null,
    // Datos de la cita en progreso:
    servicioId:       null,
    servicioNombre:   null,
    duracionMin:      null,
    empleadoId:       null,
    catalogoServicios: null,
    fechaSeleccionada: null,
    horaSeleccionada:  null,
    slotsDisponibles:  null,
    citasCancelables:  null,
    lastActivity: Date.now(),
  };
  sessions.set(telefono, sesion);
  return sesion;
}

/**
 * Limpia los datos de cita en progreso (pero mantiene cliente/nombre).
 */
function limpiarDatosCita(sesion) {
  sesion.servicioId        = null;
  sesion.servicioNombre    = null;
  sesion.duracionMin       = null;
  sesion.empleadoId        = null;
  sesion.catalogoServicios = null;
  sesion.fechaSeleccionada = null;
  sesion.horaSeleccionada  = null;
  sesion.slotsDisponibles  = null;
  sesion.citasCancelables  = null;
  sesion.state             = 'IDLE';
}

// ─────────────────────────────────────────────────────────────────
//  FUNCIÓN PRINCIPAL: handleMessage
//  Recibe el teléfono y el texto, retorna el texto de respuesta.
// ─────────────────────────────────────────────────────────────────

/**
 * @param {string} telefono  - Número de WhatsApp con código de país
 * @param {string} mensaje   - Texto crudo recibido
 * @returns {Promise<string>} - Texto a enviar de vuelta al usuario
 */
async function handleMessage(telefono, mensaje) {
  const msg    = mensaje.trim();
  const sesion = getOrCreateSession(telefono);

  // ── Registrar/recuperar cliente de la DB ──────────────────────
  if (!sesion.clienteId) {
    const cliente     = await findOrCreateCliente(telefono);
    sesion.clienteId  = cliente.id;
    sesion.nombre     = cliente.nombre || null;
  }

  // ── Comando "reiniciar" en cualquier estado ───────────────────
  if (/\b(reiniciar|restart|inicio|menu|menú)\b/i.test(msg)) {
    limpiarDatosCita(sesion);
    const result = await handleWelcome(sesion, msg);
    sesion.state = result.nuevoEstado;
    return result.respuesta;
  }

  // ── Intención global de cancelar (desde cualquier estado) ─────
  if (quiereCancelar(msg) && !['CANCEL_SELECT', 'CONFIRMATION'].includes(sesion.state)) {
    limpiarDatosCita(sesion);
    sesion.state = 'CANCEL_FLOW';
    const result = await handleCancelFlow(sesion, msg);
    sesion.state = result.nuevoEstado;
    return result.respuesta;
  }

  // ═══════════════════════════════════════════════════════════════
  //  ROUTER DE ESTADOS
  // ═══════════════════════════════════════════════════════════════
  let result;

  switch (sesion.state) {

    // ── IDLE: cualquier mensaje inicia el saludo ─────────────────
    case 'IDLE':
      result = await handleWelcome(sesion, msg);
      break;

    // ── WELCOME: esperando primer contacto ───────────────────────
    case 'WELCOME':
      result = await handleWelcome(sesion, msg);
      break;

    // ── WAITING_NAME: esperando que el usuario diga su nombre ────
    case 'WAITING_NAME':
      result = await handleWaitingName(sesion, msg);
      break;

    // ── MAIN_MENU: el usuario elige 1, 2 o 3 ────────────────────
    case 'MAIN_MENU': {
      const opcion = msg.trim();
      if (opcion === '1' || quiereAgendar(msg)) {
        result = await handleServiceMenu(sesion, msg);
      } else if (opcion === '2' || quiereVerCitas(msg)) {
        const { getCitasActivasCliente } = require('../db/queries');
        const citas = await getCitasActivasCliente(sesion.clienteId);
        if (citas.length === 0) {
          result = {
            respuesta: `No tienes citas próximas, *${sesion.nombre || 'amigo/a'}*. 😊\n\n¿Quieres *agendar* una nueva cita?`,
            nuevoEstado: 'MAIN_MENU'
          };
        } else {
          const lista = citas.map((c, i) => {
            const f = new Date(c.fecha_inicio);
            return `*${i + 1}.* ${c.servicio} — ${f.toLocaleDateString('es-MX')} ${f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
          }).join('\n');
          result = {
            respuesta: `📋 *Tus próximas citas:*\n\n${lista}\n\n_¿Necesitas algo más? Escribe *"menú"* para volver al inicio._`,
            nuevoEstado: 'MAIN_MENU'
          };
        }
      } else if (opcion === '3' || quiereCancelar(msg)) {
        sesion.citasCancelables = null;
        result = await handleCancelFlow(sesion, msg);
      } else {
        result = {
          respuesta: buildMenuPrincipal(sesion.nombre || 'amigo/a'),
          nuevoEstado: 'MAIN_MENU',
        };
      }
      break;
    }

    // ── SERVICE_SELECT: eligiendo servicio ───────────────────────
    case 'SERVICE_SELECT':
      result = await handleServiceSelect(sesion, msg);
      break;

    // ── DATE_SELECT: eligiendo fecha ─────────────────────────────
    case 'DATE_SELECT':
      result = await handleDateSelect(sesion, msg);
      // Si la FSM pide rehacer la fecha (slot ocupado al confirmar), usar la misma fecha
      if (result.rehacerFecha && sesion.fechaSeleccionada) {
        const fecha  = new Date(sesion.fechaSeleccionada + 'T00:00:00');
        const slots  = await getSlotsDisponibles(fecha, sesion.duracionMin, sesion.empleadoId || null);
        sesion.slotsDisponibles = slots;
        result = {
          respuesta:
            `Elige otro horario para el *${formatFechaEspanol(fecha)}*:\n\n` +
            formatSlotsParaWhatsApp(slots),
          nuevoEstado: 'TIME_SELECT',
        };
      }
      break;

    // ── TIME_SELECT: eligiendo hora ──────────────────────────────
    case 'TIME_SELECT':
      result = await handleTimeSelect(sesion, msg);
      break;

    // ── CONFIRMATION: confirmando la cita ────────────────────────
    case 'CONFIRMATION':
      result = await handleConfirmation(sesion, msg);
      break;

    // ── EDIT_MENU: el usuario dijo "no" en confirmación ──────────
    case 'EDIT_MENU':
      result = await handleEditMenu(sesion, msg);
      break;

    // ── CANCEL_FLOW: showing cancellable appointments ────────────
    case 'CANCEL_FLOW':
      result = await handleCancelFlow(sesion, msg);
      break;

    // ── CANCEL_SELECT: eligiendo cuál cita cancelar ──────────────
    case 'CANCEL_SELECT':
      result = await handleCancelSelect(sesion, msg);
      break;

    // ── Estado desconocido → reiniciar ───────────────────────────
    default:
      console.warn(`⚠️  Estado desconocido: "${sesion.state}" para ${telefono}. Reiniciando.`);
      limpiarDatosCita(sesion);
      result = await handleWelcome(sesion, msg);
  }

  // ── Aplicar el nuevo estado y (si aplica) limpiar la sesión ───
  sesion.state = result.nuevoEstado;
  if (result.limpiarSesion) {
    limpiarDatosCita(sesion);
    sesion.state = 'IDLE';
  }

  return result.respuesta;
}

module.exports = { handleMessage };
