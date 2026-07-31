const { extraerNumeroOpcion } = require('../../utils/regex');
const { formatFechaEspanol, formatFechaIngles } = require('../../utils/slots');

/**
 * Captura el número de slot elegido y arma el resumen para confirmación.
 */
async function handleTimeSelect(sesion, msg) {
  const opcion = extraerNumeroOpcion(msg);
  const slots  = sesion.slotsDisponibles || [];
  const isEn   = sesion.idioma === 'en';

  if (!opcion || opcion < 1 || opcion > slots.length) {
    return {
      respuesta: isEn
        ? `❓ Please reply with a number between 1 and ${Math.min(slots.length, 10)}.\n\n` +
          `Type *"back"* to choose another date.\n` +
          `Or type *"menu"* to return to main menu.`
        : `❓ Por favor elige un número del 1 al ${Math.min(slots.length, 10)}.\n\n` +
          `Escribe *"atrás"* para elegir otra fecha.\n` +
          `O escribe *"menú"* para volver al inicio.`,
      nuevoEstado: 'TIME_SELECT',
    };
  }

  // Guardar slot elegido
  const slotElegido = slots[opcion - 1]; // "HH:mm"
  sesion.horaSeleccionada = slotElegido;

  // Formatear para el mensaje de confirmación
  const [h, m] = slotElegido.split(':').map(Number);
  const periodo = h >= 12 ? 'pm' : 'am';
  const h12     = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const horaTexto = `${h12}:${String(m).padStart(2, '0')}${periodo}`;

  const fechaObj   = new Date(sesion.fechaSeleccionada + 'T00:00:00');
  const fechaTexto = isEn ? formatFechaIngles(fechaObj) : formatFechaEspanol(fechaObj);

  const { getPlanType } = require('../../db/queries');
  const planType = await getPlanType();

  if (planType === 'pro') {
    return {
      respuesta: isEn
        ? `🔔 *How far in advance would you like a WhatsApp reminder?*\n\n` +
          `1️⃣ 1 hour before\n` +
          `2️⃣ 2 hours before\n` +
          `3️⃣ 1 day before (24 hrs)\n` +
          `4️⃣ No reminder\n\n` +
          `_Reply with the option number (1, 2, 3 or 4)._\n` +
          `_Type *"back"* to choose another time slot._`
        : `🔔 *¿Con cuánto tiempo de anticipación te gustaría recibir un recordatorio por WhatsApp?*\n\n` +
          `1️⃣ 1 hora antes\n` +
          `2️⃣ 2 horas antes\n` +
          `3️⃣ 1 día antes (24 hrs)\n` +
          `4️⃣ Sin recordatorio\n\n` +
          `_Escribe el número de la opción (1, 2, 3 o 4)._\n` +
          `_Escribe *"atrás"* para elegir otro horario._`,
      nuevoEstado: 'REMINDER_SELECT',
    };
  }

  // Plan Básico: Asignación automática de recordatorio (2h antes) y paso directo a confirmación
  sesion.recordatorioMins = 120;
  sesion.recordatorioTexto = isEn ? '2 hours before' : '2 horas antes';

  const resumen = isEn
    ? `✅ *Appointment Summary:*\n\n` +
      `👤 Name: *${sesion.nombre}*\n` +
      `🛀️ Service: *${sesion.servicioNombre}*\n` +
      `📅 Date: *${fechaTexto}*\n` +
      `⏰ Time: *${horaTexto}*\n\n` +
      `Do you confirm your appointment?\n` +
      `Reply *"yes"* to confirm or *"no"* to change something.\n` +
      `_Type *"back"* to choose another time slot._`
    : `✅ *Resumen de tu cita:*\n\n` +
      `👤 Nombre: *${sesion.nombre}*\n` +
      `🛀️ Servicio: *${sesion.servicioNombre}*\n` +
      `📅 Fecha: *${fechaTexto}*\n` +
      `⏰ Hora: *${horaTexto}*\n\n` +
      `¿Confirmas tu cita?\n` +
      `Responde *"sí"* para confirmar o *"no"* para cambiar algo.\n` +
      `_Escribe *"atrás"* para elegir otro horario._`;

  return {
    respuesta: resumen,
    nuevoEstado: 'CONFIRMATION',
  };
}

module.exports = { handleTimeSelect };
