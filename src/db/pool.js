// src/db/pool.js
// Pool de conexiones MySQL reutilizable para todo el proyecto.

require('dotenv').config();

if (process.env.USE_MOCK_DB === 'true') {
  console.log('🟡 [MOCK] pool.js omitido — usando base de datos simulada.');
  module.exports = { execute: async () => { throw new Error('Mock activo'); } };
  return;
}

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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
  multipleStatements: true,
});

// Prueba de conexión y auto-inicialización del esquema maestro
pool.getConnection()
  .then(async conn => {
    console.log('✅ Nexus-Engine conectado a MariaDB');
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await conn.query(sql);
      }
    } catch (e) {
      console.warn('⚠️ Auto-inicialización de esquema:', e.message);
    } finally {
      conn.release();
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MariaDB:', err.message);
    process.exit(1);
  });

module.exports = pool;
