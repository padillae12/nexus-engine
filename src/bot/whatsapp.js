// src/bot/whatsapp.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Helpers de WhatsApp (whatsapp-web.js)
//
//  Módulo de utilidades para el cliente de whatsapp-web.js.
//  La lógica de envío vive directamente en index.js vía msg.reply(),
//  pero este módulo exporta helpers opcionales reutilizables.
// ══════════════════════════════════════════════════════════════════

/**
 * Normaliza un número de teléfono al formato de whatsapp-web.js:
 * "5216861234567@c.us"
 *
 * @param {string} numero - Número con o sin código de país, con o sin "+"
 * @returns {string} - Número en formato chatId de whatsapp-web.js
 */
function normalizarChatId(numero) {
  // Quitar "+" y espacios, luego agregar sufijo @c.us si no lo tiene
  const limpio = numero.replace(/^\+/, '').replace(/\s/g, '');
  if (limpio.endsWith('@c.us')) return limpio;
  return `${limpio}@c.us`;
}

/**
 * Extrae el número de teléfono limpio desde un chatId de whatsapp-web.js.
 * Ej: "5216861234567@c.us" → "5216861234567"
 *
 * @param {string} chatId
 * @returns {string}
 */
function extraerTelefono(chatId) {
  return chatId.replace('@c.us', '').replace('@g.us', '');
}

module.exports = { normalizarChatId, extraerTelefono };
