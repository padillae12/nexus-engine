// src/bot/handlers/welcome.js
// Estado WELCOME: saluda al usuario y captura su nombre si es nuevo.

const { updateClienteNombre } = require('../../db/queries');
const { esNegacion } = require('../../utils/regex');
const config = require('../../config');

/**
 * Maneja el estado WELCOME.
 * - Si el cliente no tiene nombre: pide el nombre.
 * - Si ya tiene nombre: muestra el menú principal.
 *
 * @param {object} sesion  - La sesión actual del usuario
 * @param {string} msg     - Texto recibido del usuario
 * @returns {{ respuesta: string, nuevoEstado: string }}
 */
async function handleWelcome(sesion, msg) {
  const { nombre } = sesion;

  // Primera vez que escribe: pedir nombre
  if (!nombre) {
    return {
      respuesta: `👋 ¡Hola! Bienvenido/a a *${config.business.name}*.\n\nSoy tu asistente virtual para citas. 😊\n\n¿Me podrías decir tu nombre, por favor?`,
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
    `¿Qué necesitas hoy, *${nombre}*?\n\n` +
    `📅 *1.* Agendar una cita\n` +
    `📋 *2.* Ver mis citas\n` +
    `❌ *3.* Cancelar una cita\n\n` +
    `_Responde con el número de la opción._`
  );
}

module.exports = { handleWelcome, handleWaitingName, buildMenuPrincipal };
