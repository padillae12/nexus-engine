// src/db/pool.js
// Pool de conexiones MySQL reutilizable para todo el proyecto.
// Se importa como: const pool = require('./pool');
// Y se usa como:   const [rows] = await pool.execute(sql, params);
//
// ── Modo mock ───────────────────────────────────────────────────
// Si USE_MOCK_DB=true en .env, no se intenta conectar al VPS.
// Las queries reales son reemplazadas por queries.mock.js.

require('dotenv').config();

if (process.env.USE_MOCK_DB === 'true') {
  console.log('🟡 [MOCK] pool.js omitido — usando base de datos simulada.');
  module.exports = { execute: async () => { throw new Error('Mock activo'); } };
  return; // Node permite return en CommonJS a nivel de módulo
}

const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host:               config.db.host,
  port:               config.db.port,
  user:               config.db.user,
  password:           config.db.password,
  database:           config.db.database,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Prueba de conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log('✅ Nexus-Engine conectado a MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  });

module.exports = pool;
