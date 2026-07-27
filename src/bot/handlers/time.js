// src/bot/handlers/time.js
// Estado TIME_SELECT: el usuario elige un horario de la lista y se genera el resumen.

const { extraerNumeroOpcion } = require('../../utils/regex');
const { formatFechaEspanol } = require('../../utils/slots');

/**
 * Captura el número de slot elegido y arma el resumen para confirmación.
 */
async function handleTimeSelect(sesion, msg) {
  const opcion = extraerNumeroOpcion(msg);
  const slots  = sesion.slotsDisponibles || [];

  if (!opcion || opcion < 1 || opcion > slots.length) {
    return {
      respuesta:
        `❓ Por favor elige un número del 1 al ${Math.min(slots.length, 10)}.\n\n` +
        `Si ya no quieres agendar, escribe *"cancelar"*.`,
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

  const fechaObj  = new Date(sesion.fechaSeleccionada + 'T00:00:00');
  const fechaTexto = formatFechaEspanol(fechaObj);

const { getPlanType } = require('../../db/queries');

  const planType = await getPlanType();

  if (planType === 'pro') {
    return {
      respuesta:
        `🔔 *¿Con cuánto tiempo de anticipación te gustaría recibir un recordatorio por WhatsApp?*\n\n` +
        `1️⃣ 1 hora antes\n` +
        `2️⃣ 2 horas antes\n` +
        `3️⃣ 1 día antes (24 hrs)\n` +
        `4️⃣ Sin recordatorio\n\n` +
        `_Escribe el número de la opción (1, 2, 3 o 4)._`,
      nuevoEstado: 'REMINDER_SELECT',
    };
  }

  // Plan Básico: Asignación automática de recordatorio (2h antes) y paso directo a confirmación
  sesion.recordatorioMins = 120;
  sesion.recordatorioTexto = '2 horas antes';

  const resumen =
    `✅ *Resumen de tu cita:*\n\n` +
    `👤 Nombre: *${sesion.nombre}*\n` +
    `🛎️ Servicio: *${sesion.servicioNombre}*\n` +
    `📅 Fecha: *${fechaTexto}*\n` +
    `⏰ Hora: *${horaTexto}*\n\n` +
    `¿Confirmas tu cita?\n` +
    `Responde *"sí"* para confirmar o *"no"* para cambiar algo.`;

  return {
    respuesta: resumen,
    nuevoEstado: 'CONFIRMATION',
  };
}

module.exports = { handleTimeSelect };
