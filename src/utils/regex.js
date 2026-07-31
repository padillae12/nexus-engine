// src/utils/regex.js
// Motor de detección de intenciones mediante expresiones regulares.
// Cada función recibe el texto del mensaje y retorna true/false o el dato extraído.

// ─────────────────────────────────────────────────────────────────
//  INTENCIONES GENERALES
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
//  INTENCIONES GENERALES (ESPAÑOL & ENGLISH)
// ─────────────────────────────────────────────────────────────────

/** El usuario quiere agendar una cita */
const quiereAgendar = (msg) =>
  /cita|agend|reserv|quiero\s+una|necesito|appointment|book|schedule|turno/i.test(msg);

/** El usuario confirma algo (sí, ok, yes, etc.) */
const esConfirmacion = (msg) =>
  /^(sí|si|s|yes|yep|yeah|ok|dale|confirmo|confirmar|claro|va|andale|adelante|correcto|exacto|está\s+bien|de\s+acuerdo|sure|confirm|1)[\s.!]*$/i.test(msg.trim());

/** El usuario niega o quiere cambiar algo */
const esNegacion = (msg) =>
  /^(no|nope|nel|nah|cambiar|otro|otra|diferente|equivocado|error|mal|change|2)[\s.!]*$/i.test(msg.trim());

/** El usuario quiere cancelar una cita */
const quiereCancelar = (msg) =>
  /cancel|elimin|borrar|quitar\s+cita|no\s+voy|delete|remove/i.test(msg);

/** El usuario quiere ver sus citas */
const quiereVerCitas = (msg) =>
  /mis\s+citas|tengo\s+cita|ver\s*citas|cuand[oa]\s+tengo|my\s+appointment|view\s+appointment/i.test(msg);

/** El usuario quiere ver información u horarios del negocio */
const quiereInfo = (msg) =>
  /info|informaci|horari|atenci|ubicaci|direcci|d[oó]nde|hours|address|location/i.test(msg);

// ─────────────────────────────────────────────────────────────────
//  EXTRACCIÓN DE FECHAS (ESPAÑOL & ENGLISH)
// ─────────────────────────────────────────────────────────────────

/** Retorna la fecha como objeto Date si el mensaje contiene una fecha relativa */
function extraerFechaRelativa(msg) {
  const hoy = new Date();
  const lower = msg.toLowerCase();

  if (/\b(hoy|today)\b/.test(lower)) return hoy;

  if (/\b(ma[ñn]ana|tomorrow)\b/.test(lower)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (/\b(pasado\s+ma[ñn]ana|day\s+after\s+tomorrow)\b/.test(lower)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return d;
  }

  // Detecta día de semana (Español e Inglés)
  const mapaDias = {
    'domingo': 0, 'sunday': 0, 'sun': 0,
    'lunes': 1, 'monday': 1, 'mon': 1,
    'martes': 2, 'tuesday': 2, 'tue': 2, 'tues': 2,
    'miércoles': 3, 'miercoles': 3, 'wednesday': 3, 'wed': 3,
    'jueves': 4, 'thursday': 4, 'thu': 4, 'thurs': 4,
    'viernes': 5, 'friday': 5, 'fri': 5,
    'sábado': 6, 'sabado': 6, 'saturday': 6, 'sat': 6,
  };

  for (const [nombreDia, diaObjetivo] of Object.entries(mapaDias)) {
    const patron = new RegExp(`\\b${nombreDia}\\b`, 'i');
    if (patron.test(lower)) {
      const d = new Date(hoy);
      const diff = (diaObjetivo - d.getDay() + 7) % 7 || 7; // siempre el próximo día de la semana
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  return null;
}

/** Extrae una fecha explícita del tipo "14/04", "14 de abril", "April 14" */
function extraerFechaExplicita(msg) {
  // Formato: DD/MM o DD/MM/AAAA o MM/DD
  const matchNumerico = msg.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (matchNumerico) {
    const p1 = parseInt(matchNumerico[1], 10);
    const p2 = parseInt(matchNumerico[2], 10);
    const year = matchNumerico[3]
      ? (matchNumerico[3].length === 2 ? 2000 + parseInt(matchNumerico[3]) : parseInt(matchNumerico[3]))
      : new Date().getFullYear();

    // Asumir DD/MM (si p1 <= 31 y p2 <= 12)
    let dia = p1;
    let mes = p2 - 1;
    if (p1 > 12 && p2 <= 12) {
      dia = p1; mes = p2 - 1;
    } else if (p1 <= 12 && p2 > 12) {
      dia = p2; mes = p1 - 1;
    }
    // Validar días máximos del mes
    const maxDias = new Date(year, mes + 1, 0).getDate();
    if (dia < 1 || dia > maxDias) return null;

    const d = new Date(year, mes, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato Español: "14 de abril"
  const mesesEs = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const matchEs = msg.match(/(\d{1,2})\s+de\s+(\w+)/i);
  if (matchEs) {
    const dia = parseInt(matchEs[1], 10);
    const mesIdx = mesesEs.findIndex(m => m === matchEs[2].toLowerCase());
    if (mesIdx !== -1) {
      const year = new Date().getFullYear();
      const maxDias = new Date(year, mesIdx + 1, 0).getDate();
      if (dia < 1 || dia > maxDias) return null;

      const d = new Date(year, mesIdx, dia);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Formato Inglés: "April 14" o "14th of April"
  const mesesEn = ['january','february','march','april','may','june',
                   'july','august','september','october','november','december'];
  const matchEn = msg.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i) || msg.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)/i);
  if (matchEn) {
    let monthName = matchEn[1].toLowerCase();
    let dayNum = parseInt(matchEn[2], 10);
    if (!isNaN(parseInt(matchEn[1], 10))) {
      dayNum = parseInt(matchEn[1], 10);
      monthName = matchEn[2].toLowerCase();
    }
    const mesIdx = mesesEn.findIndex(m => m.startsWith(monthName));
    if (mesIdx !== -1) {
      const year = new Date().getFullYear();
      const maxDias = new Date(year, mesIdx + 1, 0).getDate();
      if (dayNum < 1 || dayNum > maxDias) return null;

      const d = new Date(year, mesIdx, dayNum);
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
