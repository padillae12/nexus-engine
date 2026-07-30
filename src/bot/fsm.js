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
const { handleConfirmation, handleEditMenu, handleCancelFlow, handleCancelSelect, handleReminderSelect } = require('./handlers/confirm');
const { quiereAgendar, quiereCancelar, quiereVerCitas, quiereInfo } = require('../utils/regex');
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
    // Historial de estados para el comando "atrás"
    stateHistory: [],
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
  sesion.stateHistory      = [];
  sesion.state             = 'IDLE';
}

/**
 * Empuja el estado actual al historial antes de transicionar.
 */
function pushHistory(sesion) {
  // Solo guardar estados "navegables" (no guardar IDLE repetidamente)
  const ESTADOS_NAVEGABLES = ['MAIN_MENU','SERVICE_SELECT','DATE_SELECT','TIME_SELECT','REMINDER_SELECT','CONFIRMATION','EDIT_MENU','CANCEL_FLOW','CANCEL_SELECT'];
  if (ESTADOS_NAVEGABLES.includes(sesion.state)) {
    sesion.stateHistory = sesion.stateHistory || [];
    // Limitar historial a 10 pasos
    if (sesion.stateHistory.length >= 10) sesion.stateHistory.shift();
    sesion.stateHistory.push(sesion.state);
  }
}

/**
 * Detecta si el mensaje es un comando "atrás".
 */
function esAtras(msg) {
  return /^(atrás|atras|regresar|volver|back|anterior|regresa|volver atrás|volver atras)$/i.test(msg.trim());
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

  // ── Comando "atrás" — navega al estado anterior ───────────────
  if (esAtras(msg)) {
    const hist = sesion.stateHistory || [];
    if (hist.length === 0) {
      // No hay historial: ir al menú principal
      limpiarDatosCita(sesion);
      const result = await handleWelcome(sesion, msg);
      sesion.state = result.nuevoEstado;
      return result.respuesta;
    }

    const estadoAnterior = hist.pop();
    sesion.state = estadoAnterior;

    // Re-ejecutar el handler del estado anterior para mostrar el menú correcto
    let result;
    switch (estadoAnterior) {
      case 'MAIN_MENU':
        result = {
          respuesta: buildMenuPrincipal(sesion.nombre || 'amigo/a'),
          nuevoEstado: 'MAIN_MENU',
        };
        break;
      case 'SERVICE_SELECT':
        result = await handleServiceMenu(sesion, msg);
        break;
      case 'DATE_SELECT':
        result = {
          respuesta:
            `📅 ¿Para qué día quieres tu cita?\\n\\n` +
            `Puedes decirme algo como:\\n` +
            `• _"mañana"_\\n• _"el lunes"_\\n• _"14 de abril"_\\n• _"15/04"_`,
          nuevoEstado: 'DATE_SELECT',
        };
        break;
      case 'TIME_SELECT': {
        const slots = sesion.slotsDisponibles || [];
        const fechaObj = new Date((sesion.fechaSeleccionada || new Date().toISOString().slice(0,10)) + 'T00:00:00');
        const fechaTexto = formatFechaEspanol(fechaObj);
        result = {
          respuesta:
            `📆 *${fechaTexto}*\n\nEstos son los horarios disponibles:\n\n` +
            `${formatSlotsParaWhatsApp(slots)}\n\n` +
            `_Responde con el número del horario que prefieres._`,
          nuevoEstado: 'TIME_SELECT',
        };
        break;
      }
      case 'REMINDER_SELECT':
        result = {
          respuesta:
            `🔔 *¿Con cuánto tiempo de anticipación te gustaría recibir un recordatorio por WhatsApp?*\n\n` +
            `1️⃣ 1 hora antes\n2️⃣ 2 horas antes\n3️⃣ 1 día antes (24 hrs)\n4️⃣ Sin recordatorio\n\n` +
            `_Escribe el número de la opción (1, 2, 3 o 4)._`,
          nuevoEstado: 'REMINDER_SELECT',
        };
        break;
      case 'CONFIRMATION':
        // Re-generar el resumen de la cita
        result = await _generarResumenConfirmacion(sesion);
        break;
      case 'EDIT_MENU':
        result = {
          respuesta:
            `Entendido. ¿Qué quieres cambiar?\n\n` +
            `📅 *1.* Cambiar la fecha\n⏰ *2.* Cambiar la hora\n🛎️ *3.* Cambiar el servicio\n❌ *4.* Cancelar y salir`,
          nuevoEstado: 'EDIT_MENU',
        };
        break;
      default:
        result = {
          respuesta: buildMenuPrincipal(sesion.nombre || 'amigo/a'),
          nuevoEstado: 'MAIN_MENU',
        };
    }

    sesion.state = result.nuevoEstado;
    return result.respuesta;
  }

  // ── Intención global de cancelar (desde cualquier estado) ─────
  if (quiereCancelar(msg) && !['CANCEL_SELECT', 'CONFIRMATION'].includes(sesion.state)) {
    pushHistory(sesion);
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

    // ── MAIN_MENU: el usuario elige 1, 2, 3 o 4 ─────────────────
    case 'MAIN_MENU': {
      const opcion = msg.trim();
      if (opcion === '1' || quiereAgendar(msg)) {
        pushHistory(sesion);
        result = await handleServiceMenu(sesion, msg);
      } else if (opcion === '2' || quiereVerCitas(msg)) {
        pushHistory(sesion);
        const { getCitasActivasCliente } = require('../db/queries');
        const citas = await getCitasActivasCliente(sesion.clienteId);
        if (citas.length === 0) {
          result = {
            respuesta: `No tienes citas próximas, *${sesion.nombre || 'amigo/a'}*. 😊\n\n¿Quieres *agendar* una nueva cita?`,
            nuevoEstado: 'MAIN_MENU'
          };
        } else {
          sesion.citasVista = citas; // guardamos para edición posterior
          const lista = citas.map((c, i) => {
            const f = new Date(c.fecha_inicio);
            return `*${i + 1}.* ${c.servicio} — ${f.toLocaleDateString('es-MX')} ${f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
          }).join('\n');
          result = {
            respuesta:
              `📋 *Tus próximas citas:*\n\n${lista}\n\n` +
              `¿Qué deseas hacer?\n` +
              `• Escribe el *número* de la cita para cambiar su fecha/hora\n` +
              `• Escribe *"menú"* para volver al inicio`,
            nuevoEstado: 'VIEW_CITAS'
          };
        }
      } else if (opcion === '3' || quiereCancelar(msg)) {
        pushHistory(sesion);
        sesion.citasCancelables = null;
        result = await handleCancelFlow(sesion, msg);
      } else if (opcion === '4' || quiereInfo(msg)) {
        const { getAllConfig } = require('../db/queries');
        const configNegocio = await getAllConfig().catch(() => ({}));
        const nombreNegocio = configNegocio.BUSINESS_NAME || 'Dental Loquero';
        const horarioAtencion = configNegocio.HORARIO_ATENCION || '• Lunes a Viernes: 08:00 AM - 06:00 PM\n• Sábados: 10:00 AM - 04:00 PM\n• Domingos: Cerrado';
        const ubicacion = configNegocio.BUSINESS_ADDRESS || configNegocio.UBICACION || 'Consulta directamente con nosotros';

        result = {
          respuesta:
            `ℹ️ *INFORMACIÓN Y HORARIOS — ${nombreNegocio.toUpperCase()}*\n\n` +
            `⏰ *Horarios de Atención:*\n${horarioAtencion}\n\n` +
            `📍 *Ubicación:*\n${ubicacion}\n\n` +
            `_¿Necesitas algo más? Escribe el número de la opción (1, 2, 3) o *"menú"* para volver al inicio._`,
          nuevoEstado: 'MAIN_MENU'
        };
      } else {
        result = {
          respuesta: buildMenuPrincipal(sesion.nombre || 'amigo/a'),
          nuevoEstado: 'MAIN_MENU',
        };
      }
      break;
    }

    // ── VIEW_CITAS: viendo las citas, puede elegir una para editar ─
    case 'VIEW_CITAS': {
      const { extraerNumeroOpcion } = require('../utils/regex');
      const citas = sesion.citasVista || [];
      const opcion = extraerNumeroOpcion(msg);

      if (!opcion || opcion < 1 || opcion > citas.length) {
        const lista = citas.map((c, i) => {
          const f = new Date(c.fecha_inicio);
          return `*${i + 1}.* ${c.servicio} — ${f.toLocaleDateString('es-MX')} ${f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
        }).join('\n');
        result = {
          respuesta:
            `Por favor elige el número de la cita que deseas modificar:\n\n${lista}\n\n` +
            `_(Escribe "menú" para volver al inicio)_`,
          nuevoEstado: 'VIEW_CITAS',
        };
        break;
      }

      const citaElegida = citas[opcion - 1];
      // Cargar datos de la cita elegida en sesión para re-agendar
      sesion.citaEditandoId    = citaElegida.id;
      sesion.servicioId        = citaElegida.servicio_id;
      sesion.servicioNombre    = citaElegida.servicio;
      sesion.duracionMin       = citaElegida.duracion_min || 45;
      sesion.empleadoId        = citaElegida.empleado_id || null;

      const f = new Date(citaElegida.fecha_inicio);
      result = {
        respuesta:
          `✏️ *Modificando cita:* ${citaElegida.servicio}\n` +
          `📅 Fecha actual: ${f.toLocaleDateString('es-MX')} a las ${f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}\n\n` +
          `¿Qué nueva fecha deseas?\n\n` +
          `• _"mañana"_\n• _"el lunes"_\n• _"14 de abril"_`,
        nuevoEstado: 'EDIT_FECHA_CITA',
      };
      pushHistory(sesion);
      break;
    }

    // ── EDIT_FECHA_CITA: nueva fecha para una cita existente ─────
    case 'EDIT_FECHA_CITA': {
      pushHistory(sesion);
      const result2 = await handleDateSelect(sesion, msg);
      // Si encontró fecha + slots, pasar a elegir hora para edición
      if (result2.nuevoEstado === 'TIME_SELECT') {
        result = {
          ...result2,
          nuevoEstado: 'EDIT_HORA_CITA',
        };
        sesion.slotsDisponibles = sesion.slotsDisponibles; // ya guardados por handleDateSelect
      } else {
        result = result2;
      }
      break;
    }

    // ── EDIT_HORA_CITA: nueva hora para la cita existente ────────
    case 'EDIT_HORA_CITA': {
      const { extraerNumeroOpcion } = require('../utils/regex');
      const slots = sesion.slotsDisponibles || [];
      const op = extraerNumeroOpcion(msg);

      if (!op || op < 1 || op > slots.length) {
        result = {
          respuesta: `❓ Por favor elige un número del 1 al ${Math.min(slots.length, 10)}.`,
          nuevoEstado: 'EDIT_HORA_CITA',
        };
        break;
      }

      const slotElegido = slots[op - 1];
      const { actualizarFechaHoraCita } = require('../db/queries');

      try {
        const [h, m] = slotElegido.split(':').map(Number);
        const totalMin = h * 60 + m + (sesion.duracionMin || 45);
        const finH = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const finM = String(totalMin % 60).padStart(2, '0');
        const nuevaFechaInicio = `${sesion.fechaSeleccionada} ${slotElegido}:00`;
        const nuevaFechaFin    = `${sesion.fechaSeleccionada} ${finH}:${finM}:00`;

        await actualizarFechaHoraCita(sesion.citaEditandoId, nuevaFechaInicio, nuevaFechaFin);

        const periodo = h >= 12 ? 'pm' : 'am';
        const h12     = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const horaTexto = `${h12}:${String(m).padStart(2, '0')}${periodo}`;
        const fechaObj   = new Date(sesion.fechaSeleccionada + 'T00:00:00');
        const fechaTexto = formatFechaEspanol(fechaObj);

        result = {
          respuesta:
            `✅ *¡Cita actualizada!*\n\n` +
            `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
            `📅 Nueva fecha: *${fechaTexto}*\n` +
            `⏰ Nueva hora: *${horaTexto}*\n\n` +
            `Si necesitas algo más, escríbeme. 😊`,
          nuevoEstado: 'IDLE',
          limpiarSesion: true,
        };
      } catch (err) {
        console.error('Error actualizando cita:', err);
        result = {
          respuesta: `⚠️ No pude actualizar tu cita. Por favor intenta de nuevo o contáctanos.`,
          nuevoEstado: 'IDLE',
          limpiarSesion: true,
        };
      }
      break;
    }

    // ── SERVICE_SELECT: eligiendo servicio ───────────────────────
    case 'SERVICE_SELECT':
      pushHistory(sesion);
      result = await handleServiceSelect(sesion, msg);
      break;

    // ── DATE_SELECT: eligiendo fecha ─────────────────────────────
    case 'DATE_SELECT':
      pushHistory(sesion);
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
      pushHistory(sesion);
      result = await handleTimeSelect(sesion, msg);
      break;

    // ── REMINDER_SELECT: eligiendo anticipación del recordatorio ──
    case 'REMINDER_SELECT':
      pushHistory(sesion);
      result = await handleReminderSelect(sesion, msg);
      break;

    // ── CONFIRMATION: confirmando la cita ────────────────────────
    case 'CONFIRMATION':
      pushHistory(sesion);
      result = await handleConfirmation(sesion, msg);
      break;

    // ── EDIT_MENU: el usuario dijo "no" en confirmación ──────────
    case 'EDIT_MENU':
      pushHistory(sesion);
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

// ─────────────────────────────────────────────────────────────────
//  HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────

/**
 * Re-genera el resumen de confirmación sin avanzar de estado.
 */
async function _generarResumenConfirmacion(sesion) {
  const { formatFechaEspanol } = require('../utils/slots');
  const [h, m] = (sesion.horaSeleccionada || '00:00').split(':').map(Number);
  const periodo = h >= 12 ? 'pm' : 'am';
  const h12     = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const horaTexto = `${h12}:${String(m).padStart(2, '0')}${periodo}`;
  const fechaObj  = new Date((sesion.fechaSeleccionada || new Date().toISOString().slice(0,10)) + 'T00:00:00');
  const fechaTexto = formatFechaEspanol(fechaObj);
  const recText = sesion.recordatorioTexto || '2 horas antes';

  return {
    respuesta:
      `✅ *Resumen de tu cita:*\n\n` +
      `👤 Nombre: *${sesion.nombre}*\n` +
      `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
      `📅 Fecha: *${fechaTexto}*\n` +
      `⏰ Hora: *${horaTexto}*\n` +
      `🔔 Recordatorio: *${recText}*\n\n` +
      `¿Confirmas tu cita?\nResponde *"sí"* para confirmar o *"no"* para cambiar algo.`,
    nuevoEstado: 'CONFIRMATION',
  };
}

module.exports = { handleMessage };
