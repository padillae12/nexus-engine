// src/db/pool.js
// Pool de conexiones MySQL reutilizable para todo el proyecto.
// Se importa como: const pool = require('./pool');
// Y se usa como:   const [rows] = await pool.execute(sql, params);

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
  timezone:           '+00:00', // Almacena todo en UTC, muestra en local si necesitas
});

// Prueba de conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log('✅ Nexus-Engine conectado a MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1); // No tiene sentido correr el bot sin DB
  });

module.exports = pool;
