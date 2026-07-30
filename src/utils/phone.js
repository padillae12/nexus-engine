// src/utils/phone.js
// Normalización y formateo de teléfonos (México, EE.UU. e Internacionales)

/**
 * Normaliza cualquier número de teléfono (México, EE.UU. o Internacional) a formato E.164 limpio (sin '+').
 * Ejemplos:
 *   "+1 (442) 367-0431" → "14423670431"   (EE.UU.)
 *   "14423670431"       → "14423670431"   (EE.UU.)
 *   "+52 686 123 4567"  → "526861234567"  (México)
 *   "526861234567"      → "526861234567"  (México con clave de país)
 *   "52526861234567"    → "526861234567"  (Evita doble '5252')
 *   "6861234567"        → "526861234567"  (10 dígitos loc. MX → antepone 52)
 */
function normalizarTelefono(raw) {
  if (!raw) return '';
  let str = String(raw).trim().split('@')[0];
  let digits = str.replace(/[^0-9]/g, '');

  if (!digits) return '';

  // Evitar duplicados de "5252" al principio
  if (digits.startsWith('5252')) {
    digits = digits.slice(2);
  }

  // 1. Si empieza con '+' en el input original (ej. +14423670431, +526861234567)
  if (str.startsWith('+')) {
    return digits;
  }

  // 2. Si tiene 11 dígitos y empieza con 1 (EE.UU. / Canadá)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }

  // 3. Si tiene 13 dígitos y empieza con 521 (México móvil con 1)
  if (digits.length === 13 && digits.startsWith('521')) {
    return '52' + digits.slice(3);
  }

  // 4. Si tiene 12 dígitos y empieza con 52 (México ya con clave de país)
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits;
  }

  // 5. Si tiene 10 dígitos:
  if (digits.length === 10) {
    // Lista de códigos de área fronterizos de EE.UU. (California/Arizona/SoCal)
    const usAreaCodes = [
      '442', '760', '619', '858', '928', '480', '602', '623',
      '213', '310', '323', '424', '626', '818', '909', '951',
      '714', '949', '562'
    ];
    const prefix3 = digits.slice(0, 3);
    if (usAreaCodes.includes(prefix3)) {
      return '1' + digits; // Tratado como EE.UU.: "14423670431"
    }
    return '52' + digits; // Tratado como México: "526861234567"
  }

  return digits;
}

/**
 * Formatea un teléfono para mostrar en la interfaz de usuario de la App.
 */
function formatTelefonoDisplay(raw) {
  if (!raw) return '';
  let str = String(raw).trim().split('@')[0].replace(/[^0-9]/g, '');
  if (!str) return '';

  // EE.UU. / Canadá (11 dígitos empezando con 1)
  if (str.length === 11 && str.startsWith('1')) {
    return `+1 ${str.slice(1, 4)} ${str.slice(4, 7)}-${str.slice(7)}`;
  }
  // México (12 dígitos empezando con 52)
  if (str.length === 12 && str.startsWith('52')) {
    return str.slice(2);
  }
  // México (13 dígitos empezando con 521)
  if (str.length === 13 && str.startsWith('521')) {
    return str.slice(3);
  }
  if (str.length === 10) return str;
  if (str.length >= 10) return str.slice(-10);
  return str;
}

module.exports = {
  normalizarTelefono,
  formatTelefonoDisplay,
};
