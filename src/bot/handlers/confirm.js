const { createCita, getCitasActivasCliente } = require('../../db/queries');
const { esConfirmacion, esNegacion, extraerNumeroOpcion } = require('../../utils/regex');
const { formatFechaEspanol } = require('../../utils/slots');
const { notificarNuevaCitaEmpleado } = require('../reminders');

/**
 * Maneja la selección del tiempo del recordatorio por parte del cliente.
 */
async function handleReminderSelect(sesion, msg) {
  const opcion = extraerNumeroOpcion(msg);

  let mins = 120;
  let text = '2 horas antes';

  if (opcion === 1) { mins = 60; text = '1 hora antes'; }
  else if (opcion === 2) { mins = 120; text = '2 horas antes'; }
  else if (opcion === 3) { mins = 1440; text = '1 día antes (24 hrs)'; }
  else if (opcion === 4) { mins = 0; text = 'Desactivado'; }
  else {
    return {
      respuesta: `Por favor elige un número del 1 al 4 para seleccionar cuándo deseas tu recordatorio.`,
      nuevoEstado: 'REMINDER_SELECT',
    };
  }

  sesion.recordatorioMins = mins;
  sesion.recordatorioTexto = text;

  const [h, m] = sesion.horaSeleccionada.split(':').map(Number);
  const periodo = h >= 12 ? 'pm' : 'am';
  const h12     = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const horaTexto = `${h12}:${String(m).padStart(2, '0')}${periodo}`;

  const fechaObj  = new Date(sesion.fechaSeleccionada + 'T00:00:00');
  const fechaTexto = formatFechaEspanol(fechaObj);

  const resumen =
    `✅ *Resumen de tu cita:*\n\n` +
    `👤 Nombre: *${sesion.nombre}*\n` +
    `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
    `📅 Fecha: *${fechaTexto}*\n` +
    `⏰ Hora: *${horaTexto}*\n` +
    `🔔 Recordatorio: *${text}*\n\n` +
    `¿Confirmas tu cita?\n` +
    `Responde *"sí"* para confirmar o *"no"* para cambiar algo.`;

  return {
    respuesta: resumen,
    nuevoEstado: 'CONFIRMATION',
  };
}

/**
 * Maneja la respuesta de confirmación del usuario.
 */
async function handleConfirmation(sesion, msg) {
  // — Usuario confirma —
  if (esConfirmacion(msg)) {
    const fechaInicio = `${sesion.fechaSeleccionada} ${sesion.horaSeleccionada}:00`;

    // Calcular fecha_fin sumando la duración del servicio
    const [h, m] = sesion.horaSeleccionada.split(':').map(Number);
    const totalMin  = h * 60 + m + sesion.duracionMin;
    const finH      = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const finM      = String(totalMin % 60).padStart(2, '0');
    const fechaFin  = `${sesion.fechaSeleccionada} ${finH}:${finM}:00`;

    try {
      const citaId = await createCita({
        clienteId:   sesion.clienteId,
        servicioId:  sesion.servicioId,
        empleadoId:  sesion.empleadoId || null,
        fechaInicio,
        fechaFin,
        recordatorioMins: sesion.recordatorioMins ?? 120,
      });

      // Notificar al empleado/admin por WhatsApp si aplica (asíncrono)
      if (global.whatsappClient) {
        notificarNuevaCitaEmpleado(global.whatsappClient, {
          clienteNombre: sesion.nombre,
          clienteTelefono: sesion.telefono,
          servicioNombre: sesion.servicioNombre,
          fechaInicio,
          empleadoId: sesion.empleadoId,
        }).catch(() => {});
      }

      const fechaObj  = new Date(sesion.fechaSeleccionada + 'T00:00:00');
      const fechaTexto = formatFechaEspanol(fechaObj);
      const [hd, md]   = sesion.horaSeleccionada.split(':').map(Number);
      const periodo    = hd >= 12 ? 'pm' : 'am';
      const h12        = hd > 12 ? hd - 12 : hd === 0 ? 12 : hd;
      const horaTexto  = `${h12}:${String(md).padStart(2, '0')}${periodo}`;

      return {
        respuesta:
          `🎉 *¡Cita confirmada!*\n\n` +
          `📋 Folio: *#${citaId}*\n` +
          `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
          `📅 Fecha: *${fechaTexto}*\n` +
          `⏰ Hora: *${horaTexto}*\n\n` +
          `Te esperamos. Si necesitas cancelar o cambiar tu cita, escríbenos aquí.\n\n` +
          `_Guarda tu folio #${citaId} por si lo necesitas._ 😊`,
        nuevoEstado: 'IDLE',
        limpiarSesion: true,
      };

    } catch (err) {
      if (err.message === 'SLOT_OCUPADO') {
        // Alguien tomó el slot justo antes → regresar a elegir hora
        return {
          respuesta:
            `😅 ¡Ups! Ese horario acaba de ser tomado por otra persona.\n\n` +
            `Elige otro horario disponible:`,
          nuevoEstado: 'DATE_SELECT',
          // La FSM re-lanzará el handler de fecha con la misma fecha guardada en sesión
          rehacerFecha: true,
        };
      }
      throw err;
    }
  }

  // — Usuario niega —
  if (esNegacion(msg)) {
    return {
      respuesta:
        `Entendido. ¿Qué quieres cambiar?\n\n` +
        `📅 *1.* Cambiar la fecha\n` +
        `⏰ *2.* Cambiar la hora\n` +
        `🛎️ *3.* Cambiar el servicio\n` +
        `❌ *4.* Cancelar y salir`,
      nuevoEstado: 'EDIT_MENU',
    };
  }

  // — No entendió —
  return {
    respuesta: `No entendí tu respuesta. Por favor escribe *"sí"* para confirmar o *"no"* para cambiar algo.`,
    nuevoEstado: 'CONFIRMATION',
  };
}

/**
 * Maneja el menú de edición (cuando el usuario dice "no" en confirmación).
 */
async function handleEditMenu(sesion, msg) {
  const opcion = msg.trim();

  if (opcion === '1') {
    return {
      respuesta: `📅 ¿Para qué día quieres tu cita?\nEscribe la fecha que prefieres.`,
      nuevoEstado: 'DATE_SELECT',
    };
  }
  if (opcion === '2') {
    // Volver a mostrar los slots del mismo día
    const { formatSlotsParaWhatsApp, formatFechaEspanol } = require('../../utils/slots');
    const slots     = sesion.slotsDisponibles || [];
    const fechaObj  = new Date(sesion.fechaSeleccionada + 'T00:00:00');
    const fechaTexto = formatFechaEspanol(fechaObj);
    return {
      respuesta:
        `⏰ Elige otro horario para el *${fechaTexto}*:\n\n` +
        formatSlotsParaWhatsApp(slots),
      nuevoEstado: 'TIME_SELECT',
    };
  }
  if (opcion === '3') {
    const { handleServiceMenu } = require('./service');
    return handleServiceMenu(sesion, msg);
  }
  if (opcion === '4') {
    return {
      respuesta: `Está bien. Si necesitas algo más, escríbenos cuando quieras. 👋`,
      nuevoEstado: 'IDLE',
      limpiarSesion: true,
    };
  }

  return {
    respuesta: `Por favor elige una opción del 1 al 4.`,
    nuevoEstado: 'EDIT_MENU',
  };
}

/**
 * Maneja el estado de cancelación: muestra las citas activas y deja cancelar.
 */
async function handleCancelFlow(sesion, msg) {
  const { cancelCita } = require('../../db/queries');
  const { extraerNumeroOpcion } = require('../../utils/regex');

  // Primera visita al estado: mostrar citas activas
  if (!sesion.citasCancelables) {
    const citas = await getCitasActivasCliente(sesion.clienteId);

    if (citas.length === 0) {
      return {
        respuesta: `No tienes citas activas para cancelar. 😊`,
        nuevoEstado: 'IDLE',
      };
    }

    sesion.citasCancelables = citas;

    const lista = citas.map((c, i) => {
      const fecha = new Date(c.fecha_inicio);
      return `*${i + 1}.* ${c.servicio} — ${fecha.toLocaleDateString('es-MX')} ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    }).join('\n');

    return {
      respuesta:
        `📋 *Tus citas activas:*\n\n${lista}\n\n` +
        `¿Cuál quieres cancelar? Responde con el número, o escribe *"ninguna"* para salir.`,
      nuevoEstado: 'CANCEL_SELECT',
    };
  }

  return {
    respuesta: `Algo salió mal. Intenta de nuevo.`,
    nuevoEstado: 'IDLE',
  };
}

/**
 * Procesa la selección de la cita a cancelar.
 */
async function handleCancelSelect(sesion, msg) {
  const { cancelCita } = require('../../db/queries');
  const { extraerNumeroOpcion } = require('../../utils/regex');

  if (/ninguna|salir|no/i.test(msg)) {
    return {
      respuesta: `De acuerdo. Tus citas siguen activas. 👍`,
      nuevoEstado: 'IDLE',
      limpiarSesion: true,
    };
  }

  const opcion = extraerNumeroOpcion(msg);
  const citas  = sesion.citasCancelables || [];

  if (!opcion || opcion < 1 || opcion > citas.length) {
    return {
      respuesta: `Por favor elige un número del 1 al ${citas.length}, o escribe *"ninguna"* para salir.`,
      nuevoEstado: 'CANCEL_SELECT',
    };
  }

  const citaElegida = citas[opcion - 1];
  const cancelada   = await cancelCita(citaElegida.id, sesion.telefono);

  if (cancelada) {
    return {
      respuesta:
        `✅ Tu cita *#${citaElegida.id}* (${citaElegida.servicio}) ha sido cancelada.\n\n` +
        `Si necesitas reagendar, escríbenos cuando quieras. 😊`,
      nuevoEstado: 'IDLE',
      limpiarSesion: true,
    };
  }

  return {
    respuesta: `⚠️ No se pudo cancelar la cita. Puede que ya haya sido procesada. Contáctanos directamente.`,
    nuevoEstado: 'IDLE',
    limpiarSesion: true,
  };
}

module.exports = {
  handleReminderSelect,
  handleConfirmation,
  handleEditMenu,
  handleCancelFlow,
  handleCancelSelect,
};
