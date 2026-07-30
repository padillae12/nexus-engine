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
  let str = String(raw).split('@')[0].replace(/[^0-9]/g, '');
  if (str.length > 12) return ''; // LID interno, no es teléfono real
  if (str.length === 13 && str.startsWith('521')) return str.slice(3);
  if (str.length === 12 && str.startsWith('52')) return str.slice(2);
  if (str.length === 10) return str;
  return str;
}

/**
 * Obtiene el JID de WhatsApp válido para un número telefónico.
 */
async function getWhatsAppJid(client, telefonoRaw) {
  if (!client || !telefonoRaw) return null;

  // Si ya viene formateado como JID válido con dominio
  if (typeof telefonoRaw === 'string' && (telefonoRaw.endsWith('@c.us') || telefonoRaw.endsWith('@s.whatsapp.net'))) {
    return telefonoRaw;
  }
  if (typeof telefonoRaw === 'string' && telefonoRaw.endsWith('@lid')) {
    return telefonoRaw;
  }

  let digits = String(telefonoRaw).replace(/[^0-9]/g, '');
  if (!digits) return null;

  // Si es un LID puro (14+ dígitos), intentar primero como @lid y luego getNumberId
  if (digits.length > 13) {
    return `${digits}@lid`;
  }

  // Si tiene 10 dígitos (ej. 6861234567), anteponer 52 (México)
  if (digits.length === 10) {
    digits = '52' + digits;
  }

  // Probar con getNumberId
  try {
    const numberId = await client.getNumberId(digits);
    if (numberId && numberId._serialized) {
      console.log(`✅ JID resuelto para ${digits}: ${numberId._serialized}`);
      return numberId._serialized;
    }
  } catch (e) {
    console.warn(`⚠️ getNumberId error para ${digits}:`, e.message);
  }

  // Para números de México de 12 dígitos (52XXXXXXXXXX), probar anteponiendo el '1' (521XXXXXXXXXX)
  if (digits.length === 12 && digits.startsWith('52')) {
    const digitsWith1 = '521' + digits.slice(2);
    try {
      const numberId = await client.getNumberId(digitsWith1);
      if (numberId && numberId._serialized) {
        console.log(`✅ JID resuelto con 521: ${numberId._serialized}`);
        return numberId._serialized;
      }
    } catch (e) {}
    return `${digitsWith1}@c.us`;
  }

  return `${digits}@c.us`;
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
