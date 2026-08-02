// src/bot/handlers/service.js
// Estado SERVICE_SELECT, FOR_WHOM_SELECT y PATIENT_NAME_SELECT

const { getServicios } = require('../../db/queries');
const { extraerNumeroOpcion } = require('../../utils/regex');

// Palabras clave que indican que el cliente quiere más info del servicio
const PALABRAS_MAS_INFO = ['más información', 'mas informacion', 'más info', 'mas info',
  'detalles', 'cuánto dura', 'cuanto dura', 'duración', 'duracion',
  'cuánto tiempo', 'cuanto tiempo', 'info', 'información', 'informacion',
  'more info', 'details', 'how long', 'duration', 'information'];

/**
 * Muestra la lista de servicios disponibles con precio.
 */
async function handleServiceMenu(sesion, msg) {
  const servicios = await getServicios();
  const isEn = sesion.idioma === 'en';

  if (servicios.length === 0) {
    return {
      respuesta: isEn
        ? 'No services are available at this time. Please contact us directly.'
        : 'No hay servicios disponibles en este momento. Por favor contáctanos directamente.',
      nuevoEstado: 'IDLE',
    };
  }

  // ── Filtro Anti-Spam / Anti-Troll: Verificar si el cliente ya tiene demasiadas citas activas ──
  const { getCitasActivasCliente, getConfig } = require('../../db/queries');
  const maxCitasPermitidas = Number(await getConfig('MAX_ACTIVE_APPOINTMENTS').catch(() => null)) || 2;
  const citasActivas = await getCitasActivasCliente(sesion.clienteId).catch(() => []);

  if (citasActivas.length >= maxCitasPermitidas) {
    const emergencyPhone = await getConfig('EMERGENCY_PHONE').catch(() => null) || 'recepción';
    return {
      respuesta: isEn
        ? `⚠️ Hello *${sesion.nombre || 'Customer'}*, you currently have *${citasActivas.length} active appointments* booked.\n\n` +
          `To ensure availability and prevent abuse, automatic booking via WhatsApp is limited to ${maxCitasPermitidas} active appointments per client.\n\n` +
          `If you need an additional appointment or specialized attention, please contact reception directly at *${emergencyPhone}*. 😊`
        : `⚠️ Hola *${sesion.nombre || 'cliente'}*, actualmente ya tienes *${citasActivas.length} citas activas* agendadas.\n\n` +
          `Para garantizar la disponibilidad de horarios y evitar bloqueos falsos, el agendamiento automático por WhatsApp está limitado a ${maxCitasPermitidas} citas activas por cliente.\n\n` +
          `Si necesitas agendar una cita adicional o atención especial, por favor comunícate directamente con recepción al *${emergencyPhone}*. 😊`,
      nuevoEstado: 'MAIN_MENU',
    };
  }

  // Guardar catálogo en sesión para usarlo al recibir la opción
  sesion.catalogoServicios = servicios;

  const lista = servicios
    .map((s, i) => {
      const precio = s.precio != null
        ? ` — *$${Number(s.precio).toLocaleString('es-MX')}*`
        : '';
      return `*${i + 1}.* ${s.nombre}${precio}`;
    })
    .join('\n');

  if (isEn) {
    return {
      respuesta:
        `Which service do you need?\n\n${lista}\n\n` +
        `_Reply with the number or service name._\n` +
        `_Type *"back"* to return to the menu._`,
      nuevoEstado: 'SERVICE_SELECT',
    };
  }

  return {
    respuesta:
      `¿Qué servicio necesitas?\n\n${lista}\n\n` +
      `_Puedes escribir el número o el nombre del servicio._\n` +
      `_Escribe *"atrás"* para regresar al menú._`,
    nuevoEstado: 'SERVICE_SELECT',
  };
}

/**
 * Captura la elección del servicio y avanza a preguntar para quién es la cita.
 */
async function handleServiceSelect(sesion, msg) {
  const catalogo = sesion.catalogoServicios || [];
  const msgLower = msg.toLowerCase().trim();
  const isEn = sesion.idioma === 'en';

  // ── ¿El cliente pide más información? ───────────────────────────
  const pideMasInfo = PALABRAS_MAS_INFO.some(p => msgLower.includes(p));
  if (pideMasInfo && catalogo.length > 0) {
    const detalles = catalogo
      .map((s, i) => {
        const precio   = s.precio != null ? `$${Number(s.precio).toLocaleString('es-MX')}` : 'Variable';
        const duracion = `${s.duracion_min} min`;
        return `*${i + 1}.* ${s.nombre}\n   Precio: ${precio} | Duración: ${duracion}`;
      })
      .join('\n\n');

    return {
      respuesta: isEn
        ? `Here are the details for our services:\n\n${detalles}\n\n_Which one would you like to book?_`
        : `Aquí tienes los detalles de nuestros servicios:\n\n${detalles}\n\n_¿Cuál te gustaría agendar?_`,
      nuevoEstado: 'SERVICE_SELECT',
    };
  }

  // ── Intentar por número ──────────────────────────────────────────
  let servicioElegido = null;
  const opcion = extraerNumeroOpcion(msg);
  if (opcion && opcion >= 1 && opcion <= catalogo.length) {
    servicioElegido = catalogo[opcion - 1];
  }

  // ── Intentar por nombre (búsqueda fonética & tolerancia a errores ortográficos) ─────
  if (!servicioElegido) {
    const { normalizarTexto } = require('../../utils/regex');
    const normMsg = normalizarTexto(msg);

    servicioElegido = catalogo.find(s => {
      const normNombre = normalizarTexto(s.nombre);
      const normDesc = normalizarTexto(s.descripcion || '');
      return (
        normNombre.includes(normMsg) ||
        normMsg.includes(normNombre) ||
        (normDesc && normDesc.includes(normMsg)) ||
        (normMsg.length >= 4 && normNombre.includes(normMsg.slice(0, 4)))
      );
    });
  }

  // ── No se reconoció la opción ────────────────────────────────────
  if (!servicioElegido) {
    const lista = catalogo
      .map((s, i) => {
        const precio = s.precio != null ? ` — *$${Number(s.precio).toLocaleString('es-MX')}*` : '';
        return `*${i + 1}.* ${s.nombre}${precio}`;
      })
      .join('\n');
    return {
      respuesta: isEn
        ? `I didn't recognize that service option.\n\n` +
          `You can type the number or service name:\n\n${lista}\n\n` +
          `_Type *"more info"* to view duration & details._\n` +
          `_Type *"back"* to return to the menu._`
        : `No entendí cuál servicio quieres.\n\n` +
          `Puedes escribir el número o el nombre:\n\n${lista}\n\n` +
          `_Escribe *"más información"* para ver duración y detalles._\n` +
          `_Escribe *"atrás"* para regresar al menú._`,
      nuevoEstado: 'SERVICE_SELECT',
    };
  }

  sesion.servicioId     = servicioElegido.id;
  sesion.servicioNombre = servicioElegido.nombre;
  sesion.duracionMin    = servicioElegido.duracion_min;

  // ── Detección de Especialista ─
  const { getEmpleadoPreferidoCliente, getEmpleadosPorServicio, getPlanType } = require('../../db/queries');
  const planType = await getPlanType();
  let textoEspecialista = '';

  if (planType === 'pro') {
    const preferido = await getEmpleadoPreferidoCliente(sesion.clienteId, servicioElegido.id);
    if (preferido) {
      sesion.empleadoId = preferido.empleado_id;
      textoEspecialista = isEn
        ? `Especialista asignado: *${preferido.empleado_nombre}*\n\n`
        : `Especialista asignado: *${preferido.empleado_nombre}*\n\n`;
    } else {
      const capacitados = await getEmpleadosPorServicio(servicioElegido.id);
      if (capacitados.length === 1) {
        sesion.empleadoId = capacitados[0].id;
        textoEspecialista = isEn
          ? `Especialista asignado: *${capacitados[0].nombre}*\n\n`
          : `Especialista asignado: *${capacitados[0].nombre}*\n\n`;
      } else {
        sesion.empleadoId = null;
      }
    }
  } else {
    sesion.empleadoId = null;
  }

  return {
    respuesta: isEn
      ? `Selected: *${servicioElegido.nombre}*\n${textoEspecialista}` +
        `Who is this appointment for?\n\n` +
        `1. 👤 For me (*${sesion.nombre || 'myself'}*)\n` +
        `2. 👨‍👩‍👧 For someone else (child, spouse, relative)\n\n` +
        `_Reply with 1 or 2._`
      : `Seleccionado: *${servicioElegido.nombre}*\n${textoEspecialista}` +
        `¿Para quién es esta cita?\n\n` +
        `1. 👤 Para mí (*${sesion.nombre || 'mí'}*)\n` +
        `2. 👨‍👩‍👧 Para otra persona (hijo/a, familiar, etc.)\n\n` +
        `_Responde con 1 o 2._`,
    nuevoEstado: 'FOR_WHOM_SELECT',
  };
}

/**
 * Maneja la pregunta de para quién es la cita.
 */
async function handleForWhomSelect(sesion, msg) {
  const isEn = sesion.idioma === 'en';
  const opcion = extraerNumeroOpcion(msg);
  const msgLower = msg.toLowerCase().trim();

  // Opción 1: Para mí
  if (opcion === 1 || /^(yo|m[ií]|para m[ií]|me|for me|myself)$/i.test(msgLower)) {
    sesion.pacienteNombre = sesion.nombre;
    return {
      respuesta: isEn
        ? `📅 For what date would you like your appointment?\n\n` +
          `_Examples: "tomorrow", "Monday", "April 14"_`
        : `📅 ¿Para qué día te gustaría tu cita?\n\n` +
          `_Ejemplos: "mañana", "el lunes", "14 de abril"_`,
      nuevoEstado: 'DATE_SELECT',
    };
  }

  // Opción 2: Para otra persona
  if (opcion === 2 || /^(otra|otro|alguien|hijo|hija|esposo|esposa|familiar|someone|child|other)$/i.test(msgLower)) {
    return {
      respuesta: isEn
        ? `What is the name of the person attending the appointment?`
        : `¿Cómo se llama la persona que asistirá a la cita?`,
      nuevoEstado: 'PATIENT_NAME_SELECT',
    };
  }

  return {
    respuesta: isEn
      ? `Please reply with 1 or 2:\n1. 👤 For me (*${sesion.nombre || 'myself'}*)\n2. 👨‍👩‍👧 For someone else`
      : `Por favor responde con 1 o 2:\n1. 👤 Para mí (*${sesion.nombre || 'mí'}*)\n2. 👨‍👩‍👧 Para otra persona`,
    nuevoEstado: 'FOR_WHOM_SELECT',
  };
}

/**
 * Captura el nombre de la otra persona que asistirá a la cita.
 */
async function handlePatientNameSelect(sesion, msg) {
  const isEn = sesion.idioma === 'en';
  const PREFIJOS = /^(se llama|su nombre es|es para|para|mi hijo|mi hija|mi esposo|mi esposa|his name is|her name is|for)\s+/i;
  const rawName = msg.trim().replace(PREFIJOS, '').trim();
  const nombreLimpio = rawName.split(' ').slice(0, 3).join(' ');

  if (nombreLimpio.length < 2) {
    return {
      respuesta: isEn
        ? "Please write the name of the person attending:"
        : 'Por favor escribe el nombre de la persona que asistirá:',
      nuevoEstado: 'PATIENT_NAME_SELECT',
    };
  }

  sesion.pacienteNombre = nombreLimpio;

  return {
    respuesta: isEn
      ? `Patient: *${nombreLimpio}*\n\n📅 For what date would you like the appointment?\n\n` +
        `_Examples: "tomorrow", "Monday", "April 14"_`
      : `Paciente: *${nombreLimpio}*\n\n📅 ¿Para qué día te gustaría la cita?\n\n` +
        `_Ejemplos: "mañana", "el lunes", "14 de abril"_`,
    nuevoEstado: 'DATE_SELECT',
  };
}

module.exports = {
  handleServiceMenu,
  handleServiceSelect,
  handleForWhomSelect,
  handlePatientNameSelect,
};
