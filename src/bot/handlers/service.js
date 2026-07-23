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
    .map((s, i) => {
      const precio = s.mostrar_precio && s.precio != null
        ? ` — $${Number(s.precio).toLocaleString('es-MX')}`
        : '';
      return `*${i + 1}.* ${s.nombre} _(${s.duracion_min} min)_${precio}`;
    })
    .join('\n');

  return {
    respuesta:
      `¡Perfecto! ¿Qué servicio necesitas? 🛎️\n\n${lista}\n\n` +
      `_Puedes escribir el número o el nombre del servicio._`,
    nuevoEstado: 'SERVICE_SELECT',
  };
}

/**
 * Captura la elección del servicio y avanza al estado de fecha.
 * Acepta: número de opción (1, 2, 3...) o nombre del servicio.
 */
async function handleServiceSelect(sesion, msg) {
  const catalogo = sesion.catalogoServicios || [];
  let servicioElegido = null;

  // ── Intentar por número ──────────────────────────────────────────
  const opcion = extraerNumeroOpcion(msg);
  if (opcion && opcion >= 1 && opcion <= catalogo.length) {
    servicioElegido = catalogo[opcion - 1];
  }

  // ── Intentar por nombre (búsqueda parcial, case-insensitive) ─────
  if (!servicioElegido) {
    const msgLower = msg.toLowerCase().trim();
    servicioElegido = catalogo.find(s =>
      s.nombre.toLowerCase().includes(msgLower) ||
      msgLower.includes(s.nombre.toLowerCase())
    );
  }

  // ── No se reconoció la opción ────────────────────────────────────
  if (!servicioElegido) {
    const lista = catalogo
      .map((s, i) => `*${i + 1}.* ${s.nombre}`)
      .join('\n');
    return {
      respuesta:
        `No entendí cuál servicio quieres 🤔\n\n` +
        `Puedes escribir el número o el nombre:\n\n${lista}`,
      nuevoEstado: 'SERVICE_SELECT',
    };
  }

  sesion.servicioId     = servicioElegido.id;
  sesion.servicioNombre = servicioElegido.nombre;
  sesion.duracionMin    = servicioElegido.duracion_min;

  return {
    respuesta:
      `✅ *${servicioElegido.nombre}* seleccionado _(${servicioElegido.duracion_min} min)_.\n\n` +
      `📅 ¿Para qué día quieres tu cita?\n\n` +
      `Puedes decirme algo como:\n` +
      `• _"mañana"_\n• _"el lunes"_\n• _"14 de abril"_\n• _"15/04"_`,
    nuevoEstado: 'DATE_SELECT',
  };
}

module.exports = { handleServiceMenu, handleServiceSelect };
