// src/bot/reminders.js
// ══════════════════════════════════════════════════════════════════
//  SISTEMA DE RECORDATORIOS Y NOTIFICACIONES DE EMPLEADOS POR WHATSAPP
// ══════════════════════════════════════════════════════════════════

const {
  getCitasPendientesRecordatorio,
  markRecordatorioEnviado,
  getTelefonoEmpleado,
} = require('../db/queries');
const { formatFechaEspanol, formatFechaIngles } = require('../utils/slots');
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

const { normalizarTelefono, formatTelefonoDisplay } = require('../utils/phone');

/**
 * Obtiene el JID de WhatsApp válido para un número telefónico (México, EE.UU. o Internacional).
 */
async function getWhatsAppJid(client, telefonoRaw) {
  if (!client || !telefonoRaw) return null;

  // Si ya viene formateado como JID válido con dominio
  if (typeof telefonoRaw === 'string' && (telefonoRaw.endsWith('@c.us') || telefonoRaw.endsWith('@s.whatsapp.net') || telefonoRaw.endsWith('@lid'))) {
    return telefonoRaw;
  }

  let rawStr = String(telefonoRaw).trim();
  let digitsOnly = rawStr.split('@')[0].replace(/[^0-9]/g, '');
  if (!digitsOnly) return null;

  // LIDs internos (14+ dígitos)
  if (digitsOnly.length > 13) {
    return `${digitsOnly}@lid`;
  }

  // Normalizar número telefónico (soporta +1 EE.UU., +52 México, etc.)
  const cleanNumber = normalizarTelefono(telefonoRaw);
  if (!cleanNumber) return null;

  // Probar resolución con getNumberId de WhatsApp Web
  try {
    const numberId = await client.getNumberId(cleanNumber);
    if (numberId && numberId._serialized) {
      console.log(`✅ JID resuelto para ${cleanNumber}: ${numberId._serialized}`);
      return numberId._serialized;
    }
  } catch (e) {
    console.warn(`⚠️ getNumberId error para ${cleanNumber}:`, e.message);
  }

  // Fallback si es de México (12 dígitos comenzando en 52), probar con '521'
  if (cleanNumber.length === 12 && cleanNumber.startsWith('52')) {
    const digitsWith1 = '521' + cleanNumber.slice(2);
    try {
      const numberId = await client.getNumberId(digitsWith1);
      if (numberId && numberId._serialized) {
        console.log(`✅ JID resuelto con 521: ${numberId._serialized}`);
        return numberId._serialized;
      }
    } catch (e) {}
    return `${digitsWith1}@c.us`;
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

    let fechaObj = citaInfo.fechaInicio instanceof Date ? citaInfo.fechaInicio : new Date(citaInfo.fechaInicio);
    if (isNaN(fechaObj.getTime())) fechaObj = new Date();
    const fechaTexto = formatFechaEspanol(fechaObj);

    let horaTexto = citaInfo.hora || '';
    if (!horaTexto) {
      const rawStr = String(citaInfo.fechaInicio || '');
      if (rawStr.includes(' ')) {
        horaTexto = rawStr.split(' ')[1]?.slice(0, 5) || '';
      } else if (rawStr.includes('T')) {
        horaTexto = rawStr.split('T')[1]?.slice(0, 5) || '';
      } else if (citaInfo.fechaInicio instanceof Date) {
        const h = String(citaInfo.fechaInicio.getHours()).padStart(2, '0');
        const m = String(citaInfo.fechaInicio.getMinutes()).padStart(2, '0');
        horaTexto = `${h}:${m}`;
      }
    }

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

    const isEn = (citaInfo.clienteTelefono && citaInfo.clienteTelefono.startsWith('1')) || citaInfo.idioma === 'en';

    let fechaObj = citaInfo.fechaInicio instanceof Date ? citaInfo.fechaInicio : new Date(citaInfo.fechaInicio);
    if (isNaN(fechaObj.getTime())) fechaObj = new Date();

    const fechaTexto = isEn ? formatFechaIngles(fechaObj) : formatFechaEspanol(fechaObj);

    let horaTexto = citaInfo.hora || '';
    if (!horaTexto) {
      const rawStr = String(citaInfo.fechaInicio || '');
      if (rawStr.includes(' ')) {
        horaTexto = rawStr.split(' ')[1]?.slice(0, 5) || '';
      } else if (rawStr.includes('T')) {
        horaTexto = rawStr.split('T')[1]?.slice(0, 5) || '';
      } else if (citaInfo.fechaInicio instanceof Date) {
        const h = String(citaInfo.fechaInicio.getHours()).padStart(2, '0');
        const m = String(citaInfo.fechaInicio.getMinutes()).padStart(2, '0');
        horaTexto = `${h}:${m}`;
      }
    }

    const { getAllConfig } = require('../db/queries');
    const cfg = await getAllConfig().catch(() => ({}));
    const businessName = cfg.BUSINESS_NAME || config.business.name || 'Dental Loquero';
    const ubicacion = cfg.BUSINESS_ADDRESS || cfg.UBICACION || '';
    const ubicacionTexto = ubicacion ? (isEn ? `\n📍 Location: *${ubicacion}*` : `\n📍 Ubicación: *${ubicacion}*`) : '';

    const mensaje = isEn
      ? `✅ *APPOINTMENT CONFIRMED AT ${businessName.toUpperCase()}*\n\n` +
        `Hello *${citaInfo.clienteNombre || 'Customer'}*, your appointment has been successfully booked:\n\n` +
        `🛎️ Service: *${citaInfo.servicioNombre}*\n` +
        `📅 Date: *${fechaTexto}*\n` +
        `⏰ Time: *${horaTexto}*` +
        ubicacionTexto + `\n\n` +
        `We look forward to seeing you! If you need to change your appointment, please let us know in advance. 😊`
      : `✅ *CITA CONFIRMADA EN ${businessName.toUpperCase()}*\n\n` +
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

        const isEn = cita.cliente_telefono.startsWith('1');
        const fechaObj = new Date(cita.fecha_inicio);
        const fechaTexto = isEn ? formatFechaIngles(fechaObj) : formatFechaEspanol(fechaObj);
        const horaTexto = cita.fecha_inicio.toISOString().split('T')[1]?.slice(0, 5) || '';

        const msgCliente = isEn
          ? `🔔 *APPOINTMENT REMINDER*\n\n` +
            `Hello *${cita.cliente_nombre || 'Customer'}*, this is a reminder for your upcoming appointment at *${config.business.name}*:\n\n` +
            `🛎️ Service: *${cita.servicio_nombre}*\n` +
            `📅 Date: *${fechaTexto}*\n` +
            `⏰ Time: *${horaTexto}*\n\n` +
            `📍 We look forward to seeing you. If you need to reschedule, please let us know. 😊`
          : `🔔 *RECORDATORIO DE CITA*\n\n` +
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
