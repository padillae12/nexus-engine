// src/bot/handlers/welcome.js
// Estado WELCOME: saluda al usuario y captura su nombre si es nuevo.

const { updateClienteNombre } = require('../../db/queries');
const { esNegacion } = require('../../utils/regex');
const config = require('../../config');

/**
 * Maneja el estado WELCOME.
 * - Si el cliente no tiene nombre: pide el nombre.
 * - Si ya tiene nombre: muestra el menú principal.
 */
async function handleWelcome(sesion, msg) {
  const { nombre, idioma } = sesion;
  const { getConfig } = require('../../db/queries');
  const businessName = await getConfig('BUSINESS_NAME').catch(() => null) || config.business.name || 'Nexus';

  const isEn = idioma === 'en';

  // Primera vez que escribe: pedir nombre
  if (!nombre) {
    return {
      respuesta: isEn
        ? `Hello! Welcome to *${businessName}*.\n\n` +
          `I am your virtual assistant and I can help you book, check, or cancel appointments.\n\n` +
          `Could you please tell me your name?`
        : `¡Hola! Bienvenido/a a *${businessName}*.\n\n` +
          `Soy tu asistente virtual y puedo ayudarte a agendar, consultar o cancelar citas.\n\n` +
          `¿Me podrías decir tu nombre, por favor?`,
      nuevoEstado: 'WAITING_NAME',
    };
  }

  // Ya tiene nombre: ir directo al menú
  return {
    respuesta: buildMenuPrincipal(nombre, idioma),
    nuevoEstado: 'MAIN_MENU',
  };
}

/**
 * Maneja el estado WAITING_NAME: guarda el nombre y muestra el menú.
 */
async function handleWaitingName(sesion, msg) {
  const isEn = sesion.idioma === 'en';
  // Eliminar frases de presentación comunes antes de guardar el nombre
  const PREFIJOS_NOMBRE = /^(soy|me llamo|mi nombre es|me dicen|soy el|soy la|mi nombre:|nombre:|i am|my name is|i'm|im)\s+/i;
  const rawName = msg.trim().replace(PREFIJOS_NOMBRE, '').trim();
  const nombreLimpio = rawName.split(' ').slice(0, 3).join(' '); // Máx 3 palabras

  if (nombreLimpio.length < 2) {
    return {
      respuesta: isEn
        ? "I didn't quite catch your name. What is your name?"
        : 'No entendí bien tu nombre. ¿Cómo te llamas?',
      nuevoEstado: 'WAITING_NAME',
    };
  }

  // Guardar nombre en DB
  await updateClienteNombre(sesion.clienteId, nombreLimpio);
  sesion.nombre = nombreLimpio;

  const saludo = isEn
    ? `Nice to meet you, *${nombreLimpio}*!\n\n${buildMenuPrincipal(nombreLimpio, 'en')}`
    : `¡Mucho gusto, *${nombreLimpio}*!\n\n${buildMenuPrincipal(nombreLimpio, 'es')}`;

  return {
    respuesta: saludo,
    nuevoEstado: 'MAIN_MENU',
  };
}

/**
 * Maneja el cambio de nombre solicitado por el cliente.
 */
async function handleWaitingNameChange(sesion, msg) {
  const isEn = sesion.idioma === 'en';
  const PREFIJOS_NOMBRE = /^(soy|me llamo|mi nombre es|me dicen|soy el|soy la|mi nombre:|nombre:|i am|my name is|i'm|im)\s+/i;
  const rawName = msg.trim().replace(PREFIJOS_NOMBRE, '').trim();
  const nombreLimpio = rawName.split(' ').slice(0, 3).join(' ');

  if (nombreLimpio.length < 2) {
    return {
      respuesta: isEn
        ? 'Please write your new name:'
        : 'Por favor escribe tu nuevo nombre:',
      nuevoEstado: 'WAITING_NAME_CHANGE',
    };
  }

  await updateClienteNombre(sesion.clienteId, nombreLimpio);
  sesion.nombre = nombreLimpio;

  const respuesta = isEn
    ? `Done! Your name has been updated to *${nombreLimpio}*.\n\n${buildMenuPrincipal(nombreLimpio, 'en')}`
    : `¡Listo! Tu nombre ha sido actualizado a *${nombreLimpio}*.\n\n${buildMenuPrincipal(nombreLimpio, 'es')}`;

  return {
    respuesta,
    nuevoEstado: 'MAIN_MENU',
  };
}

function buildMenuPrincipal(nombre, idioma = 'es') {
  if (idioma === 'en') {
    return (
      `How can I help you today, *${nombre}*?\n\n` +
      `1. 📅 *Book* an appointment\n` +
      `2. 📋 *View* my appointments\n` +
      `3. ❌ *Cancel* an appointment\n` +
      `4. ℹ️ *Info & Business Hours*\n` +
      `5. ✏️ *Change my name*\n` +
      `6. 🌐 *Español*\n\n` +
      `_Reply with the option number (1, 2, 3, 4, 5, 6) or tell me what you need._`
    );
  }
  return (
    `¿En qué te puedo ayudar hoy, *${nombre}*?\n\n` +
    `1. 📅 *Agendar* una cita\n` +
    `2. 📋 *Ver* mis citas\n` +
    `3. ❌ *Cancelar* una cita\n` +
    `4. ℹ️ *Información y Horarios*\n` +
    `5. ✏️ *Cambiar mi nombre*\n` +
    `6. 🌐 *English*\n\n` +
    `_Solo dime qué necesitas o escribe el número de la opción (1, 2, 3, 4, 5 o 6)._`
  );
}

module.exports = { handleWelcome, handleWaitingName, handleWaitingNameChange, buildMenuPrincipal };
