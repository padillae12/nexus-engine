// src/bot/handlers/service.js
// Estado SERVICE_SELECT: muestra lista de servicios y captura la elección.

const { getServicios, getServicioById } = require('../../db/queries');
const { extraerNumeroOpcion } = require('../../utils/regex');

/**
 * Muestra la lista de servicios disponibles.
 */
async function handleServiceMenu(sesion, msg) {
  const servicios = await getServicios();

  if (servicios.length === 0) {
    return {
      respuesta: '⚠️ No hay servicios disponibles en este momento. Por favor contáctanos directamente.',
      nuevoEstado: 'IDLE',
    };
  }

  // Guardar catálogo en sesión para usarlo al recibir la opción
  sesion.catalogoServicios = servicios;

  const lista = servicios
    .map((s, i) => `*${i + 1}.* ${s.nombre} _(${s.duracion_min} min)_`)
    .join('\n');

  return {
    respuesta: `🛎️ *¿Qué servicio necesitas?*\n\n${lista}\n\n_Responde con el número._`,
    nuevoEstado: 'SERVICE_SELECT',
  };
}

/**
 * Captura la elección del servicio y avanza al estado de fecha.
 */
async function handleServiceSelect(sesion, msg) {
  const opcion = extraerNumeroOpcion(msg);
  const catalogo = sesion.catalogoServicios || [];

  if (!opcion || opcion < 1 || opcion > catalogo.length) {
    const lista = catalogo
      .map((s, i) => `*${i + 1}.* ${s.nombre}`)
      .join('\n');
    return {
      respuesta: `❓ No entendí la opción. Por favor elige un número del 1 al ${catalogo.length}:\n\n${lista}`,
      nuevoEstado: 'SERVICE_SELECT',
    };
  }

  const servicioElegido = catalogo[opcion - 1];
  sesion.servicioId     = servicioElegido.id;
  sesion.servicioNombre = servicioElegido.nombre;
  sesion.duracionMin    = servicioElegido.duracion_min;

  return {
    respuesta:
      `✅ *${servicioElegido.nombre}* seleccionado _(${servicioElegido.duracion_min} min)_.\n\n` +
      `📅 ¿Para qué día quieres tu cita?\n\n` +
      `Puedes escribir algo como:\n` +
      `• _"mañana"_\n• _"el lunes"_\n• _"14 de abril"_\n• _"15/04"_`,
    nuevoEstado: 'DATE_SELECT',
  };
}

module.exports = { handleServiceMenu, handleServiceSelect };
