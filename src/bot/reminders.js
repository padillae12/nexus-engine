// src/bot/reminders.js
// ══════════════════════════════════════════════════════════════════
//  SISTEMA DE RECORDATORIOS Y NOTIFICACIONES DE EMPLEADOS POR WHATSAPP
// ══════════════════════════════════════════════════════════════════

const {
  getCitasPendientesRecordatorio,
  markRecordatorioEnviado,
  getTelefonoEmpleado,
} = require('../db/queries');
const { formatFechaEspanol } = require('../utils/slots');
const config = require('../config');

/**
 * Limpia un teléfono o JID para obtener solo los dígitos del número.
 * Ej: "190838785216601@lid" → "5216601" (incorrecto)
 * Mejor: si contiene @, devolver solo los dígitos locales del teléfono.
 * @param {string} raw
 * @returns {string} teléfono limpio de 10 dígitos si es posible, o el raw sin @...
 */
function limpiarTelefonoDisplay(raw) {
  if (!raw) return '';
  // Si tiene @, es un JID — extraer solo la parte numérica antes del @
  if (raw.includes('@')) {
    const parteNumerica = raw.split('@')[0].replace(/[^0-9]/g, '');
    // Si son 12 dígitos con código 52, quitar el 52 para mostrar los 10 locales
    if (parteNumerica.startsWith('52') && parteNumerica.length === 12) {
      return parteNumerica.slice(2);
    }
    return parteNumerica;
  }
  return raw.replace(/[^0-9+]/g, '');
}

/**
 * Obtiene el JID de WhatsApp válido para un número telefónico (resuelve LIDs de WhatsApp Web).
 * Soporta:
 *   - JIDs directos: "1234@lid", "521234@c.us", "521234@s.whatsapp.net"
 *   - Números de 10 dígitos: "6861234567" → antepone código de país 52
 *   - Números con 52 ya incluido
 */
async function getWhatsAppJid(client, telefonoRaw) {
  if (!telefonoRaw) return null;

  // Si ya es un JID válido (@lid), úsarlo directamente
  if (telefonoRaw.includes('@lid') || telefonoRaw.includes('@s.whatsapp.net')) {
    return telefonoRaw;
  }
  // Si es @c.us, también es válido directamente
  if (telefonoRaw.includes('@c.us')) {
    return telefonoRaw;
  }

  // Limpiar a solo dígitos
  let cleanNumber = telefonoRaw.replace(/[^0-9]/g, '');
  if (!cleanNumber) return null;

  // Números de 14+ dígitos son probablemente LIDs de WhatsApp (protocolo de dispositivos enlazados)
  // Intentar primero como @lid, luego como número regular
  if (cleanNumber.length > 12) {
    console.log(`📡 Número largo detectado (${cleanNumber.length} dígitos), intentando como @lid...`);
    try {
      // Intentar enviar directamente como LID
      const lidJid = `${cleanNumber}@lid`;
      // Verificar si el cliente puede encontrar este LID
      const chat = await client.getChatById(lidJid).catch(() => null);
      if (chat) {
        console.log(`✅ LID válido encontrado: ${lidJid}`);
        return lidJid;
      }
    } catch (e) {
      console.log(`⚠️ No se pudo verificar como @lid, intentando como @c.us...`);
    }
    // Fallback: intentar como número normal @c.us
    return `${cleanNumber}@c.us`;
  }

  // Si el usuario ingresó un número local de 10 dígitos (ej. 6861234567), anteponer clave de país 52
  if (cleanNumber.length === 10) {
    cleanNumber = '52' + cleanNumber;
  }

  try {
    const numberId = await client.getNumberId(cleanNumber);
    if (numberId && numberId._serialized) {
      console.log(`✅ JID resuelto: ${numberId._serialized}`);
      return numberId._serialized;
    }
  } catch (e) {
    console.log(`⚠️ getNumberId falló para ${cleanNumber}: ${e.message}`);
  }
  return `${cleanNumber}@c.us`;
}

/**
 * Notifica inmediatamente al empleado (o admin) por WhatsApp cuando se agenda una cita.
 */
async function notificarNuevaCitaEmpleado(client, citaInfo) {
  try {
    const empleadoInfo = await getTelefonoEmpleado(citaInfo.empleadoId);
    if (!empleadoInfo || !empleadoInfo.telefono) return;

    const jid = await getWhatsAppJid(client, empleadoInfo.telefono);
    if (!jid) return;

    const fechaObj = new Date(citaInfo.fechaInicio);
    const fechaTexto = formatFechaEspanol(fechaObj);
    const horaTexto = citaInfo.fechaInicio.split(' ')[1]?.slice(0, 5) || '';

    const mensaje =
      `🔔 *NUEVA CITA ASIGNADA*\n\n` +
      `Hola *${empleadoInfo.nombre}*, se agendó una nueva cita:\n\n` +
      `👤 Cliente: *${citaInfo.clienteNombre || 'Cliente'}*\n` +
      `🛎️ Servicio: *${citaInfo.servicioNombre}*\n` +
      `📅 Fecha: *${fechaTexto}*\n` +
      `⏰ Hora: *${horaTexto}*\n\n` +
      `_Registrado en Nexus-Engine._`;

    await client.sendMessage(jid, mensaje);
    console.log(`📲 Notificación de nueva cita enviada al empleado (${empleadoInfo.nombre})`);
  } catch (err) {
    console.warn('⚠️ No se pudo notificar al empleado por WhatsApp:', err.message);
  }
}

/**
 * Envía un mensaje formal de confirmación por WhatsApp al cliente cuando se agenda o confirma su cita desde la App.
 */
async function notificarConfirmacionCitaCliente(client, citaInfo) {
  try {
    console.log(`📡 Intentando enviar confirmación por WhatsApp a ${citaInfo.clienteTelefono}...`);
    if (!client || !citaInfo.clienteTelefono) {
      console.warn('⚠️ No hay cliente de WhatsApp activo o falta el teléfono del cliente.');
      return;
    }
    const jid = await getWhatsAppJid(client, citaInfo.clienteTelefono);
    if (!jid) {
      console.warn(`⚠️ No se pudo obtener JID de WhatsApp para el número ${citaInfo.clienteTelefono}`);
      return;
    }

    const fechaObj = new Date(citaInfo.fechaInicio);
    const fechaTexto = formatFechaEspanol(fechaObj);
    const horaTexto = citaInfo.fechaInicio.split(' ')[1]?.slice(0, 5) || citaInfo.hora || '';

    const { getAllConfig } = require('../db/queries');
    const cfg = await getAllConfig().catch(() => ({}));
    const businessName = cfg.BUSINESS_NAME || config.business.name || 'Dental Loquero';
    const ubicacion = cfg.BUSINESS_ADDRESS || cfg.UBICACION || '';
    const ubicacionTexto = ubicacion ? `\n📍 Ubicación: *${ubicacion}*` : '';

    const mensaje =
      `✅ *CITA CONFIRMADA EN ${businessName.toUpperCase()}*\n\n` +
      `Hola *${citaInfo.clienteNombre || 'Cliente'}*, tu cita ha sido registrada con éxito:\n\n` +
      `🛎️ Servicio: *${citaInfo.servicioNombre}*\n` +
      `📅 Fecha: *${fechaTexto}*\n` +
      `⏰ Hora: *${horaTexto}*` +
      ubicacionTexto + `\n\n` +
      `¡Te esperamos! Si necesitas cambiar tu cita, avísanos con anticipación. 😊`;

    await client.sendMessage(jid, mensaje);
    console.log(`✅ Confirmación de cita enviada por WhatsApp a ${citaInfo.clienteNombre} (${jid})`);
  } catch (err) {
    console.warn('⚠️ Error al enviar confirmación al cliente por WhatsApp:', err.message);
  }
}

/**
 * Inicia el temporizador en segundo plano que revisa cita por cita los recordatorios pendientes.
 */
function iniciarMotorRecordatorios(client) {
  console.log('⏰ Motor de recordatorios de citas activado.');

  // Revisar cada 60 segundos
  setInterval(async () => {
    try {
      const citasPendientes = await getCitasPendientesRecordatorio();
      for (const cita of citasPendientes) {
        if (!cita.cliente_telefono) continue;
        const clienteJid = await getWhatsAppJid(client, cita.cliente_telefono);
        if (!clienteJid) continue;

        const fechaObj = new Date(cita.fecha_inicio);
        const fechaTexto = formatFechaEspanol(fechaObj);
        const horaTexto = cita.fecha_inicio.toISOString().split('T')[1]?.slice(0, 5) || '';

        const msgCliente =
          `🔔 *RECORDATORIO DE CITA*\n\n` +
          `Hola *${cita.cliente_nombre || 'cliente'}*, te recordamos tu próxima cita en *${config.business.name}*:\n\n` +
          `🛎️ Servicio: *${cita.servicio_nombre}*\n` +
          `📅 Fecha: *${fechaTexto}*\n` +
          `⏰ Hora: *${horaTexto}*\n\n` +
          `📍 Te esperamos. Si necesitas cambiar tu horario, avísanos con anticipación. 😊`;

        await client.sendMessage(clienteJid, msgCliente).catch(err => {
          console.warn(`No se pudo enviar recordatorio a ${clienteJid}:`, err.message);
        });

        // Notificar también al empleado si tiene teléfono
        if (cita.empleado_telefono) {
          const empJid = await getWhatsAppJid(client, cita.empleado_telefono);
          if (empJid) {
            const msgEmp =
              `⏰ *RECORDATORIO DE CITA (PRÓXIMA)*\n\n` +
              `Hola *${cita.empleado_nombre}*, tienes una cita próxima:\n` +
              `👤 Cliente: *${cita.cliente_nombre}*\n` +
              `🛎️ Servicio: *${cita.servicio_nombre}*\n` +
              `📅 Fecha: *${fechaTexto}*\n` +
              `⏰ Hora: *${horaTexto}*`;
            await client.sendMessage(empJid, msgEmp).catch(() => {});
          }
        }

        await markRecordatorioEnviado(cita.id);
        console.log(`✅ Recordatorio enviado exitosamente para la Cita #${cita.id}`);
      }
    } catch (err) {
      console.error('❌ Error en el motor de recordatorios:', err.message);
    }
  }, 60000);
}

module.exports = {
  iniciarMotorRecordatorios,
  notificarNuevaCitaEmpleado,
  notificarConfirmacionCitaCliente,
};
