const { createCita, getCitasActivasCliente } = require('../../db/queries');
const { esConfirmacion, esNegacion, extraerNumeroOpcion } = require('../../utils/regex');
const { formatFechaEspanol, formatFechaIngles } = require('../../utils/slots');
const { notificarNuevaCitaEmpleado } = require('../reminders');

/**
 * Maneja la selección del tiempo del recordatorio por parte del cliente.
 */
async function handleReminderSelect(sesion, msg) {
  const opcion = extraerNumeroOpcion(msg);
  const isEn   = sesion.idioma === 'en';

  let mins = 120;
  let text = isEn ? '2 hours before' : '2 horas antes';

  if (opcion === 1) { mins = 60; text = isEn ? '1 hour before' : '1 hora antes'; }
  else if (opcion === 2) { mins = 120; text = isEn ? '2 hours before' : '2 horas antes'; }
  else if (opcion === 3) { mins = 1440; text = isEn ? '1 day before (24 hrs)' : '1 día antes (24 hrs)'; }
  else if (opcion === 4) { mins = 0; text = isEn ? 'Off' : 'Desactivado'; }
  else {
    return {
      respuesta: isEn
        ? `Please reply with a number between 1 and 4 to select your reminder timing.`
        : `Por favor elige un número del 1 al 4 para seleccionar cuándo deseas tu recordatorio.`,
      nuevoEstado: 'REMINDER_SELECT',
    };
  }

  sesion.recordatorioMins = mins;
  sesion.recordatorioTexto = text;

  const [h, m] = sesion.horaSeleccionada.split(':').map(Number);
  const periodo = h >= 12 ? 'pm' : 'am';
  const h12     = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const horaTexto = `${h12}:${String(m).padStart(2, '0')}${periodo}`;

  const fechaObj   = new Date(sesion.fechaSeleccionada + 'T00:00:00');
  const fechaTexto = isEn ? formatFechaIngles(fechaObj) : formatFechaEspanol(fechaObj);

  const esOtraPersona = sesion.pacienteNombre && sesion.pacienteNombre.toLowerCase() !== sesion.nombre?.toLowerCase();
  const pacienteTexto = esOtraPersona
    ? (isEn ? `👤 Booked by: *${sesion.nombre}*\n👶 Patient: *${sesion.pacienteNombre}*` : `👤 Agendado por: *${sesion.nombre}*\n👶 Paciente: *${sesion.pacienteNombre}*`)
    : (isEn ? `👤 Name: *${sesion.nombre}*` : `👤 Nombre: *${sesion.nombre}*`);

  const resumen = isEn
    ? `✅ *Appointment Summary:*\n\n` +
      `${pacienteTexto}\n` +
      `🛎️ Service: *${sesion.servicioNombre}*\n` +
      `📅 Date: *${fechaTexto}*\n` +
      `⏰ Time: *${horaTexto}*\n` +
      `🔔 Reminder: *${text}*\n\n` +
      `Do you confirm your appointment?\n` +
      `Reply *"yes"* to confirm or *"no"* to change something.\n` +
      `_Type *"back"* to return._`
    : `✅ *Resumen de tu cita:*\n\n` +
      `${pacienteTexto}\n` +
      `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
      `📅 Fecha: *${fechaTexto}*\n` +
      `⏰ Hora: *${horaTexto}*\n` +
      `🔔 Recordatorio: *${text}*\n\n` +
      `¿Confirmas tu cita?\n` +
      `Responde *"sí"* para confirmar o *"no"* para cambiar algo.\n` +
      `_Escribe *"atrás"* para volver a elegir el recordatorio._`;

  return {
    respuesta: resumen,
    nuevoEstado: 'CONFIRMATION',
  };
}

/**
 * Maneja la respuesta de confirmación del usuario.
 */
async function handleConfirmation(sesion, msg) {
  const isEn = sesion.idioma === 'en';

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
        clienteId:        sesion.clienteId,
        servicioId:       sesion.servicioId,
        empleadoId:       sesion.empleadoId || null,
        fechaInicio,
        fechaFin,
        recordatorioMins: sesion.recordatorioMins ?? 120,
        pacienteNombre:   sesion.pacienteNombre || null,
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

      const fechaObj   = new Date(sesion.fechaSeleccionada + 'T00:00:00');
      const fechaTexto = isEn ? formatFechaIngles(fechaObj) : formatFechaEspanol(fechaObj);
      const [hd, md]   = sesion.horaSeleccionada.split(':').map(Number);
      const periodo    = hd >= 12 ? 'pm' : 'am';
      const h12        = hd > 12 ? hd - 12 : hd === 0 ? 12 : hd;
      const horaTexto  = `${h12}:${String(md).padStart(2, '0')}${periodo}`;

      // Obtener indicaciones_precita si existen para este servicio (Plan Pro o Módulo 'PREPOSTCITA')
      const { getServicioById, tieneModulo } = require('../../db/queries');
      const habilitadoPrePost = await tieneModulo('PREPOSTCITA').catch(() => false);
      const servicioInfo = await getServicioById(sesion.servicioId).catch(() => null);
      const precita = habilitadoPrePost ? servicioInfo?.indicaciones_precita : null;
      const precitaTexto = precita
        ? (isEn ? `\n📋 *Pre-Appointment Requirements:*\n_${precita}_\n` : `\n📋 *Recomendaciones Pre-Cita / Requisitos:*\n_${precita}_\n`)
        : '';

      return {
        respuesta: isEn
          ? `🎉 *Appointment Confirmed!*\n\n` +
            `📋 Confirmation #: *#${citaId}*\n` +
            `🛎️ Service: *${sesion.servicioNombre}*\n` +
            `📅 Date: *${fechaTexto}*\n` +
            `⏰ Time: *${horaTexto}*` + precitaTexto + `\n\n` +
            `We look forward to seeing you. If you need to change or reschedule your appointment, message us anytime.\n\n` +
            `_Save your confirmation #${citaId} for your records._ 😊`
          : `🎉 *¡Cita confirmada!*\n\n` +
            `📋 Folio: *#${citaId}*\n` +
            `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
            `📅 Fecha: *${fechaTexto}*\n` +
            `⏰ Hora: *${horaTexto}*` + precitaTexto + `\n\n` +
            `Te esperamos. Si necesitas cambiar o reagendar tu cita, escríbenos aquí.\n\n` +
            `_Guarda tu folio #${citaId} por si lo necesitas._ 😊`,
        nuevoEstado: 'IDLE',
        limpiarSesion: true,
      };

    } catch (err) {
      if (err.message === 'SLOT_OCUPADO') {
        return {
          respuesta: isEn
            ? `😅 Oops! That time slot was just taken by another user.\n\nPlease choose another available time slot:`
            : `😅 ¡Ups! Ese horario acaba de ser tomado por otra persona.\n\nElige otro horario disponible:`,
          nuevoEstado: 'DATE_SELECT',
          rehacerFecha: true,
        };
      }
      throw err;
    }
  }

  // — Usuario niega —
  if (esNegacion(msg)) {
    return {
      respuesta: isEn
        ? `Got it. What would you like to change?\n\n` +
          `📅 *1.* Change date\n` +
          `⏰ *2.* Change time\n` +
          `🛎️ *3.* Change service\n` +
          `❌ *4.* Cancel and exit`
        : `Entendido. ¿Qué quieres cambiar?\n\n` +
          `📅 *1.* Cambiar la fecha\n` +
          `⏰ *2.* Cambiar la hora\n` +
          `🛎️ *3.* Cambiar el servicio\n` +
          `❌ *4.* Cancelar y salir`,
      nuevoEstado: 'EDIT_MENU',
    };
  }

  // — No entendió —
  return {
    respuesta: isEn
      ? `I didn't understand your response. Please reply *"yes"* to confirm or *"no"* to change something.`
      : `No entendí tu respuesta. Por favor escribe *"sí"* para confirmar o *"no"* para cambiar algo.`,
    nuevoEstado: 'CONFIRMATION',
  };
}

/**
 * Maneja el menú de edición (cuando el usuario dice "no" en confirmación).
 */
async function handleEditMenu(sesion, msg) {
  const opcion = msg.trim();
  const isEn   = sesion.idioma === 'en';

  if (opcion === '1') {
    return {
      respuesta: isEn
        ? `📅 What day would you like your appointment?\nType your preferred date.\n_Type *"back"* to return to the summary._`
        : `📅 ¿Para qué día quieres tu cita?\nEscribe la fecha que prefieres.\n_Escribe *"atrás"* para volver al resumen._`,
      nuevoEstado: 'DATE_SELECT',
    };
  }
  if (opcion === '2') {
    const { getSlotsDisponibles, formatSlotsParaWhatsApp, formatFechaEspanol, formatFechaIngles } = require('../../utils/slots');
    const fecha = new Date((sesion.fechaSeleccionada || new Date().toISOString().slice(0,10)) + 'T00:00:00');
    const slots = await getSlotsDisponibles(fecha, sesion.duracionMin, sesion.empleadoId || null);
    sesion.slotsDisponibles = slots;
    const fechaTexto = isEn ? formatFechaIngles(fecha) : formatFechaEspanol(fecha);

    if (slots.length === 0) {
      return {
        respuesta: isEn
          ? `😕 There are no time slots available for *${fechaTexto}*.\n\nWould you like to choose another date? Type *"1"* to change date.`
          : `😕 Ya no hay horarios disponibles el *${fechaTexto}*.\n\n¿Quieres elegir otra fecha? Escribe *"1"* para cambiar la fecha.`,
        nuevoEstado: 'EDIT_MENU',
      };
    }

    return {
      respuesta: isEn
        ? `⏰ Choose another time slot for *${fechaTexto}*:\n\n` + formatSlotsParaWhatsApp(slots) + '\n\n_Type *"back"* to return._'
        : `⏰ Elige otro horario para el *${fechaTexto}*:\n\n` + formatSlotsParaWhatsApp(slots) + '\n\n_Escribe *"atrás"* para volver._',
      nuevoEstado: 'TIME_SELECT',
    };
  }
  if (opcion === '3') {
    const { handleServiceMenu } = require('./service');
    return handleServiceMenu(sesion, msg);
  }
  if (opcion === '4') {
    return {
      respuesta: isEn
        ? `Alright. Feel free to message us anytime if you need anything else. 👋`
        : `Está bien. Si necesitas algo más, escríbenos cuando quieras. 👋`,
      nuevoEstado: 'IDLE',
      limpiarSesion: true,
    };
  }

  return {
    respuesta: isEn
      ? `Please choose an option between 1 and 4.\n\n` +
        `📅 *1.* Change date\n⏰ *2.* Change time\n🛎️ *3.* Change service\n❌ *4.* Cancel and exit\n\n` +
        `_Type *"back"* to return._`
      : `Por favor elige una opción del 1 al 4.\n\n` +
        `📅 *1.* Cambiar la fecha\n⏰ *2.* Cambiar la hora\n🛎️ *3.* Cambiar el servicio\n❌ *4.* Cancelar y salir\n\n` +
        `_Escribe *"atrás"* para volver al resumen._`,
    nuevoEstado: 'EDIT_MENU',
  };
}

/**
 * Maneja el estado de cancelación: muestra las citas activas y deja cancelar.
 */
async function handleCancelFlow(sesion, msg) {
  const isEn = sesion.idioma === 'en';

  if (!sesion.citasCancelables) {
    const citas = await getCitasActivasCliente(sesion.clienteId);

    if (citas.length === 0) {
      return {
        respuesta: isEn
          ? `You have no active appointments to cancel. 😊`
          : `No tienes citas activas para cancelar. 😊`,
        nuevoEstado: 'IDLE',
      };
    }

    sesion.citasCancelables = citas;

    const lista = citas.map((c, i) => {
      const fecha = new Date(c.fecha_inicio);
      const fechaStr = isEn ? formatFechaIngles(fecha) : fecha.toLocaleDateString('es-MX');
      return `*${i + 1}.* ${c.servicio} — ${fechaStr} ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }).join('\n');

    return {
      respuesta: isEn
        ? `📋 *Your active appointments:*\n\n${lista}\n\n` +
          `Which one do you want to cancel? Reply with the number, or type *"back"* to exit.`
        : `📋 *Tus citas activas:*\n\n${lista}\n\n` +
          `¿Cuál deseas cancelar? Responde con el número de la cita, o escribe *"atrás"* para salir.`,
      nuevoEstado: 'CANCEL_SELECT',
    };
  }

  return {
    respuesta: isEn ? `Something went wrong. Please try again.` : `Algo salió mal. Intenta de nuevo.`,
    nuevoEstado: 'IDLE',
  };
}

/**
 * Procesa la selección de la cita a cancelar.
 */
async function handleCancelSelect(sesion, msg) {
  const { cancelCita } = require('../../db/queries');
  const isEn = sesion.idioma === 'en';

  if (/atr[aá]s|ninguna|salir|no|none|exit|back/i.test(msg)) {
    return {
      respuesta: isEn
        ? `Alright. Your appointments remain active. 👍`
        : `De acuerdo. Tus citas siguen activas. 👍`,
      nuevoEstado: 'IDLE',
      limpiarSesion: true,
    };
  }

  const opcion = extraerNumeroOpcion(msg);
  const citas  = sesion.citasCancelables || [];

  if (!opcion || opcion < 1 || opcion > citas.length) {
    return {
      respuesta: isEn
        ? `Please reply with a number between 1 and ${citas.length}, or type *"back"* to exit.`
        : `Por favor elige un número del 1 al ${citas.length}, o escribe *"atrás"* para salir.`,
      nuevoEstado: 'CANCEL_SELECT',
    };
  }

  const citaElegida = citas[opcion - 1];
  const cancelada   = await cancelCita(citaElegida.id, sesion.telefono);

  if (cancelada) {
    if (global.whatsappClient) {
      const { notificarCancelacionCitaEmpleado } = require('../reminders');
      notificarCancelacionCitaEmpleado(global.whatsappClient, citaElegida).catch((e) => console.warn('[WA] Error notificando cancelación a empleado:', e.message));
    }
    return {
      respuesta: isEn
        ? `✅ Your appointment *#${citaElegida.id}* (${citaElegida.servicio}) has been cancelled.\n\n` +
          `Message us anytime if you need to reschedule. 😊`
        : `✅ Tu cita *#${citaElegida.id}* (${citaElegida.servicio}) ha sido cancelada.\n\n` +
          `Si necesitas reagendar, escríbenos cuando quieras. 😊`,
      nuevoEstado: 'IDLE',
      limpiarSesion: true,
    };
  }

  return {
    respuesta: isEn
      ? `⚠️ Could not cancel appointment. It may have already been processed.`
      : `⚠️ No se pudo cancelar la cita. Puede que ya haya sido procesada. Contáctanos directamente.`,
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
