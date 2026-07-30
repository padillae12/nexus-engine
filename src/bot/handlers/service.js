// src/bot/handlers/service.js
// Estado SERVICE_SELECT: muestra lista de servicios y captura la elección.

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
 * Captura la elección del servicio y avanza al estado de fecha.
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

  // ── Intentar por nombre (búsqueda parcial, case-insensitive) ─────
  if (!servicioElegido) {
    servicioElegido = catalogo.find(s =>
      s.nombre.toLowerCase().includes(msgLower) ||
      msgLower.includes(s.nombre.toLowerCase())
    );
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
      ? `Selected: *${servicioElegido.nombre}*\n` +
        `${textoEspecialista}` +
        `📅 For what date would you like your appointment?\n\n` +
        `_Examples: "tomorrow", "Monday", "April 14"_`
      : `Seleccionado: *${servicioElegido.nombre}*\n` +
        `${textoEspecialista}` +
        `📅 ¿Para qué día te gustaría tu cita?\n\n` +
        `_Ejemplos: "mañana", "el lunes", "14 de abril"_`,
    nuevoEstado: 'DATE_SELECT',
  };
}

module.exports = { handleServiceMenu, handleServiceSelect };
