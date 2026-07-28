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
 * Obtiene el JID de WhatsApp válido para un número telefónico (resuelve LIDs de WhatsApp Web).
 */
async function getWhatsAppJid(client, telefonoRaw) {
  if (!telefonoRaw) return null;
  const cleanNumber = telefonoRaw.replace(/[^0-9]/g, '');
  if (!cleanNumber) return null;

  try {
    const numberId = await client.getNumberId(cleanNumber);
    if (numberId && numberId._serialized) {
      return numberId._serialized;
    }
  } catch (e) {
    // Si no se puede resolver en WhatsApp Web, se usa el fallback clásico @c.us
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
    if (!client || !citaInfo.clienteTelefono) return;
    const jid = await getWhatsAppJid(client, citaInfo.clienteTelefono);
    if (!jid) return;

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
    console.log(`📲 Confirmación de cita enviada por WhatsApp al cliente (${citaInfo.clienteNombre})`);
  } catch (err) {
    console.warn('⚠️ No se pudo enviar confirmación al cliente por WhatsApp:', err.message);
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
