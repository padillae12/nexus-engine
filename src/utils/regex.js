// src/utils/regex.js
// Motor de detección de intenciones mediante expresiones regulares.
// Cada función recibe el texto del mensaje y retorna true/false o el dato extraído.

// ─────────────────────────────────────────────────────────────────
//  INTENCIONES GENERALES
// ─────────────────────────────────────────────────────────────────

/** El usuario quiere agendar una cita */
const quiereAgendar = (msg) =>
  /\b(cita|agendar|reservar|quiero\s+una|necesito|appointment|turno)\b/i.test(msg);

/** El usuario confirma algo (sí, ok, dale, etc.) */
const esConfirmacion = (msg) =>
  /^(sí|si|s|yes|ok|dale|confirmo|confirmar|claro|va|andale|adelante|correcto|exacto|está\s+bien|de\s+acuerdo)[\s.!]*$/i.test(msg.trim());

/** El usuario niega o quiere cambiar algo */
const esNegacion = (msg) =>
  /^(no|nope|nel|nah|cambiar|otro|otra|diferente|equivocado|error|mal)[\s.!]*$/i.test(msg.trim());

/** El usuario quiere cancelar una cita */
const quiereCancelar = (msg) =>
  /\b(cancelar|cancel|eliminar|borrar|quitar\s+cita|no\s+voy\s+a\s+ir)\b/i.test(msg);

/** El usuario quiere ver sus citas */
const quiereVerCitas = (msg) =>
  /\b(mis\s+citas?|tengo\s+cita|ver\s*citas?|ver|cuando\s+es|cuand[oa]\s+tengo)\b/i.test(msg);

/** El usuario quiere ver información u horarios del negocio */
const quiereInfo = (msg) =>
  /\b(info|informaci[oó]n|horario|horarios|atenci[oó]n|ubicaci[oó]n|direcci[oó]n|d[oó]nde\s+est[aá]n|d[oó]nde\s+se\s+ubican|direcci[oó]n)\b/i.test(msg);

// ─────────────────────────────────────────────────────────────────
//  EXTRACCIÓN DE FECHAS
// ─────────────────────────────────────────────────────────────────

/** Retorna la fecha como objeto Date si el mensaje contiene una fecha relativa */
function extraerFechaRelativa(msg) {
  const hoy = new Date();
  const lower = msg.toLowerCase();

  if (/\bhoy\b/.test(lower)) return hoy;

  if (/\bma[ñn]ana\b/.test(lower)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (/\bpasado\s+ma[ñn]ana\b/.test(lower)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return d;
  }

  // Detecta día de semana: "el lunes", "el martes"...
  const dias = ['domingo','lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado'];
  for (let i = 0; i < dias.length; i++) {
    const patron = new RegExp(`\\b${dias[i]}\\b`, 'i');
    if (patron.test(lower)) {
      const diaObjetivo = i === 4 ? 3 : i === 8 ? 6 : i; // normaliza tildes
      const d = new Date(hoy);
      const diff = (diaObjetivo - d.getDay() + 7) % 7 || 7; // siempre el próximo
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  return null;
}

/** Extrae una fecha explícita del tipo "14/04", "14-04-2026", "14 de abril" */
function extraerFechaExplicita(msg) {
  // Formato: DD/MM o DD/MM/AAAA o DD-MM o DD-MM-AAAA
  const matchNumerico = msg.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (matchNumerico) {
    const dia  = parseInt(matchNumerico[1], 10);
    const mes  = parseInt(matchNumerico[2], 10) - 1; // JS: meses 0-indexados
    const year = matchNumerico[3]
      ? (matchNumerico[3].length === 2 ? 2000 + parseInt(matchNumerico[3]) : parseInt(matchNumerico[3]))
      : new Date().getFullYear();
    const d = new Date(year, mes, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato: "14 de abril", "5 de enero"
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const matchTexto = msg.match(/(\d{1,2})\s+de\s+(\w+)/i);
  if (matchTexto) {
    const dia = parseInt(matchTexto[1], 10);
    const mesIdx = meses.findIndex(m => m === matchTexto[2].toLowerCase());
    if (mesIdx !== -1) {
      const d = new Date(new Date().getFullYear(), mesIdx, dia);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  return null;
}

/** Intenta extraer cualquier fecha del mensaje (relativa o explícita) */
function extraerFecha(msg) {
  return extraerFechaRelativa(msg) || extraerFechaExplicita(msg);
}

// ─────────────────────────────────────────────────────────────────
//  EXTRACCIÓN DE HORA
// ─────────────────────────────────────────────────────────────────

/**
 * Extrae la hora de un mensaje como string "HH:mm" (formato 24h).
 * Soporta: "10", "10am", "10:30", "10:30am", "22:00"
 * @returns {string|null} ej: "10:00", "14:30"
 */
function extraerHora(msg) {
  const match = msg.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  let hora = parseInt(match[1], 10);
  const minutos = match[2] ? parseInt(match[2], 10) : 0;
  const periodo = match[3]?.toLowerCase();

  if (hora < 0 || hora > 23) return null;

  if (periodo === 'pm' && hora < 12) hora += 12;
  if (periodo === 'am' && hora === 12) hora = 0;

  return `${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Extrae un número de opción de un mensaje (ej: el usuario elige "1", "2", "3")
 * @returns {number|null}
 */
function extraerNumeroOpcion(msg) {
  const match = msg.trim().match(/^(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = {
  quiereAgendar,
  esConfirmacion,
  esNegacion,
  quiereCancelar,
  quiereVerCitas,
  quiereInfo,
  extraerFecha,
  extraerFechaRelativa,
  extraerFechaExplicita,
  extraerHora,
  extraerNumeroOpcion,
};
