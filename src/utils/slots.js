// src/utils/slots.js
// Generador de slots de tiempo disponibles.
// Ya que MySQL no tiene generate_series(), esta lógica vive en Node.js.

const { getHorarioTrabajo, getSlotOcupados, isBloqueado } = require('../db/queries');

/**
 * Formatea un objeto Date como 'YYYY-MM-DD'
 * @param {Date} date
 */
function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Formatea un objeto Date como 'HH:mm'
 * @param {Date} date
 */
function toTimeStr(date) {
  return date.toTimeString().slice(0, 5);
}

/**
 * Dado un string 'HH:mm', retorna los minutos totales desde medianoche.
 * @param {string} timeStr
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Genera todos los slots posibles de un día y filtra los ocupados/bloqueados.
 *
 * @param {Date}        fecha        - La fecha para buscar disponibilidad
 * @param {number}      duracionMin  - Duración del servicio en minutos
 * @param {number|null} empleadoId   - ID del empleado (null = cualquiera/global)
 * @returns {Promise<string[]>}       - Array de slots disponibles ej: ["09:00","10:00"]
 */
async function getSlotsDisponibles(fecha, duracionMin, empleadoId = null) {
  const diaSemana = fecha.getDay(); // 0=Domingo … 6=Sábado
  const fechaStr  = toDateStr(fecha);

  // 1. Obtener horario de trabajo del día
  const horario = await getHorarioTrabajo(diaSemana, empleadoId);
  if (!horario) {
    // El negocio no trabaja ese día
    return [];
  }

  const inicioMin = timeToMinutes(horario.hora_inicio);
  const finMin    = timeToMinutes(horario.hora_fin);

  // 2. Generar todos los slots posibles (cada duracionMin minutos)
  const todoSlots = [];
  for (let min = inicioMin; min + duracionMin <= finMin; min += duracionMin) {
    const hh = String(Math.floor(min / 60)).padStart(2, '0');
    const mm = String(min % 60).padStart(2, '0');
    todoSlots.push(`${hh}:${mm}`);
  }

  // 3. Obtener slots ya ocupados en la DB
  const ocupados = await getSlotOcupados(fechaStr, empleadoId);
  const ocupadosSet = new Set(ocupados);

  // 4. Filtrar slots ocupados y bloqueados
  const disponibles = [];
  for (const slot of todoSlots) {
    if (ocupadosSet.has(slot)) continue; // ya está reservado

    // Verificar si cae dentro de un bloqueo (ej: hora de comida)
    const fechaHoraStr = `${fechaStr} ${slot}:00`;
    const bloqueado = await isBloqueado(fechaHoraStr, empleadoId);
    if (bloqueado) continue;

    disponibles.push(slot);
  }

  return disponibles;
}

/**
 * Formatea la lista de slots disponibles como texto para mandar por WhatsApp.
 * Ejemplo: "1️⃣ 09:00am\n2️⃣ 10:00am\n3️⃣ 11:00am"
 * @param {string[]} slots
 */
function formatSlotsParaWhatsApp(slots) {
  const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  return slots
    .slice(0, 10) // Máximo 10 opciones para no saturar el chat
    .map((slot, i) => {
      const [h, m] = slot.split(':').map(Number);
      const periodo = h >= 12 ? 'pm' : 'am';
      const h12     = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const label   = `${h12}:${String(m).padStart(2,'0')}${periodo}`;
      return `${emojis[i] || `${i + 1}.`} ${label}`;
    })
    .join('\n');
}

/**
 * Formatea una fecha Date como texto legible en español.
 * Ejemplo: "lunes 14 de abril de 2026"
 * @param {Date} date
 */
function formatFechaEspanol(date) {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

module.exports = {
  getSlotsDisponibles,
  formatSlotsParaWhatsApp,
  formatFechaEspanol,
  toDateStr,
  toTimeStr,
};
