// src/db/pool.mock.js
// ══════════════════════════════════════════════════════════════════
//  MOCK DE POOL — No se conecta a ninguna base de datos.
//  Solo existe para que los archivos que importan 'pool' no truenen.
// ══════════════════════════════════════════════════════════════════

console.log('🟡 [MOCK] Pool de base de datos en modo simulación (sin VPS).');

module.exports = {
  execute: async () => { throw new Error('[MOCK] pool.execute no debe llamarse directamente. Usa queries.mock.js'); },
};
