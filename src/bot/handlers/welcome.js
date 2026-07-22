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
  const { nombre } = sesion;

  // Primera vez que escribe: pedir nombre
  if (!nombre) {
    return {
      respuesta:
        `👋 ¡Hola! Bienvenido/a a *${config.business.name}*.\n\n` +
        `Soy tu asistente virtual y puedo ayudarte a agendar, consultar o cancelar citas. 😊\n\n` +
        `¿Me podrías decir tu nombre, por favor?`,
      nuevoEstado: 'WAITING_NAME',
    };
  }

  // Ya tiene nombre: ir directo al menú
  return {
    respuesta: buildMenuPrincipal(nombre),
    nuevoEstado: 'MAIN_MENU',
  };
}

/**
 * Maneja el estado WAITING_NAME: guarda el nombre y muestra el menú.
 */
async function handleWaitingName(sesion, msg) {
  const nombreLimpio = msg.trim().split(' ').slice(0, 3).join(' '); // Máx 3 palabras

  if (nombreLimpio.length < 2) {
    return {
      respuesta: '🤔 No entendí bien tu nombre. ¿Cómo te llamas?',
      nuevoEstado: 'WAITING_NAME',
    };
  }

  // Guardar nombre en DB
  await updateClienteNombre(sesion.clienteId, nombreLimpio);
  sesion.nombre = nombreLimpio;

  return {
    respuesta: `¡Mucho gusto, *${nombreLimpio}*! 🤝\n\n${buildMenuPrincipal(nombreLimpio)}`,
    nuevoEstado: 'MAIN_MENU',
  };
}

function buildMenuPrincipal(nombre) {
  return (
    `¿En qué te puedo ayudar hoy, *${nombre}*? 😊\n\n` +
    `📅 *Agendar* una cita\n` +
    `📋 *Ver* mis citas\n` +
    `❌ *Cancelar* una cita\n\n` +
    `_Solo dime qué necesitas o escribe el número de la opción (1, 2 o 3)._`
  );
}

module.exports = { handleWelcome, handleWaitingName, buildMenuPrincipal };
