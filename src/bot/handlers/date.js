// src/bot/handlers/date.js
// Estado DATE_SELECT: parsea la fecha que escribe el usuario y verifica disponibilidad.

const { extraerFecha } = require('../../utils/regex');
const { getSlotsDisponibles, formatFechaEspanol, formatSlotsParaWhatsApp, toDateStr } = require('../../utils/slots');

/**
 * Captura la fecha del mensaje del usuario y verifica si hay slots disponibles.
 */
async function handleDateSelect(sesion, msg) {
  // 1. Intentar extraer una fecha del mensaje
  const fecha = extraerFecha(msg);

  if (!fecha) {
    return {
      respuesta:
        '📅 No pude entender la fecha. Intenta con:\n' +
        '• _"mañana"_\n• _"el lunes"_\n• _"14 de abril"_\n• _"15/04"_',
      nuevoEstado: 'DATE_SELECT',
    };
  }

  // 2. Verificar que la fecha no sea en el pasado
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) {
    return {
      respuesta: '⏰ Esa fecha ya pasó. Por favor elige una fecha futura.',
      nuevoEstado: 'DATE_SELECT',
    };
  }

  // 3. Verificar disponibilidad en esa fecha
  const slots = await getSlotsDisponibles(fecha, sesion.duracionMin, sesion.empleadoId || null);

  if (slots.length === 0) {
    const fechaTexto = formatFechaEspanol(fecha);
    return {
      respuesta:
        `😕 Lo siento, no hay horarios disponibles el *${fechaTexto}*.\n\n` +
        `¿Quieres intentar con otro día?\n\n` +
        `Escribe la fecha que prefieres o _"mañana"_, _"lunes"_, etc.`,
      nuevoEstado: 'DATE_SELECT',
    };
  }

  // 4. Guardar fecha en sesión y mostrar slots disponibles
  sesion.fechaSeleccionada   = toDateStr(fecha);
  sesion.slotsDisponibles    = slots;
  const fechaTexto = formatFechaEspanol(fecha);

  return {
    respuesta:
      `📆 *${fechaTexto}*\n\n` +
      `Estos son los horarios disponibles:\n\n` +
      `${formatSlotsParaWhatsApp(slots)}\n\n` +
      `_Responde con el número del horario que prefieres._`,
    nuevoEstado: 'TIME_SELECT',
  };
}

module.exports = { handleDateSelect };
