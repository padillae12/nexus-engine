// src/bot/handlers/service.js
// Estado SERVICE_SELECT: muestra lista de servicios y captura la elección.

const { getServicios, getServicioById } = require('../../db/queries');
const { extraerNumeroOpcion } = require('../../utils/regex');

// Palabras clave que indican que el cliente quiere más info del servicio
const PALABRAS_MAS_INFO = ['más información', 'mas informacion', 'más info', 'mas info',
  'detalles', 'cuánto dura', 'cuanto dura', 'duración', 'duracion',
  'cuánto tiempo', 'cuanto tiempo', 'info', 'información', 'informacion'];

/**
 * Muestra la lista de servicios disponibles con precio.
 * La duración solo se muestra si el cliente pide más información.
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
      const precio = s.precio != null
        ? ` — *$${Number(s.precio).toLocaleString('es-MX')}*`
        : '';
      return `*${i + 1}.* ${s.nombre}${precio}`;
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
 * Si el cliente pide más información, muestra duración y detalles.
 */
async function handleServiceSelect(sesion, msg) {
  const catalogo = sesion.catalogoServicios || [];
  const msgLower = msg.toLowerCase().trim();

  // ── ¿El cliente pide más información? ───────────────────────────
  const pideMasInfo = PALABRAS_MAS_INFO.some(p => msgLower.includes(p));
  if (pideMasInfo && catalogo.length > 0) {
    const detalles = catalogo
      .map((s, i) => {
        const precio   = s.precio != null ? `$${Number(s.precio).toLocaleString('es-MX')}` : 'Variable';
        const duracion = `${s.duracion_min} min`;
        return `*${i + 1}.* ${s.nombre}\n   💰 ${precio}  ⏱ ${duracion}`;
      })
      .join('\n\n');

    return {
      respuesta:
        `Aquí tienes los detalles de nuestros servicios:\n\n${detalles}\n\n` +
        `_¿Cuál te gustaría agendar?_`,
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
      respuesta:
        `No entendí cuál servicio quieres 🤔\n\n` +
        `Puedes escribir el número o el nombre:\n\n${lista}\n\n` +
        `_Escribe "más información" para ver duración y detalles._`,
      nuevoEstado: 'SERVICE_SELECT',
    };
  }

  sesion.servicioId     = servicioElegido.id;
  sesion.servicioNombre = servicioElegido.nombre;
  sesion.duracionMin    = servicioElegido.duracion_min;

  // ── Detección de Especialista Frecuente / Capacitado (Solo Plan Pro) ─
  const { getEmpleadoPreferidoCliente, getEmpleadosPorServicio, getPlanType } = require('../../db/queries');
  const planType = await getPlanType();
  let textoEspecialista = '';

  if (planType === 'pro') {
    const preferido = await getEmpleadoPreferidoCliente(sesion.clienteId, servicioElegido.id);
    if (preferido) {
      sesion.empleadoId = preferido.empleado_id;
      textoEspecialista = `👨‍⚕️ *Especialista Asignado:* ${preferido.empleado_nombre} (Tu especialista frecuente en ${servicioElegido.nombre})\n\n`;
    } else {
      const capacitados = await getEmpleadosPorServicio(servicioElegido.id);
      if (capacitados.length === 1) {
        sesion.empleadoId = capacitados[0].id;
        textoEspecialista = `👨‍⚕️ *Especialista Asignado:* ${capacitados[0].nombre}\n\n`;
      } else {
        sesion.empleadoId = null; // Cualquier especialista disponible
      }
    }
  } else {
    // Plan Básico (Barberías/Spas/Estéticas): Asignación directa ultra-rápida sin preguntas
    sesion.empleadoId = null;
  }

  const precioTexto = servicioElegido.precio != null
    ? ` · *$${Number(servicioElegido.precio).toLocaleString('es-MX')}*`
    : '';

  return {
    respuesta:
      `✅ *${servicioElegido.nombre}* seleccionado${precioTexto}.\n\n` +
      textoEspecialista +
      `📅 ¿Para qué día quieres tu cita?\n\n` +
      `Puedes decirme algo como:\n` +
      `• _"mañana"_\n• _"el lunes"_\n• _"14 de abril"_\n• _"15/04"_`,
    nuevoEstado: 'DATE_SELECT',
  };
}

module.exports = { handleServiceMenu, handleServiceSelect };
