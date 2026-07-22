// src/config.js
// Lee las variables de entorno del archivo .env
require('dotenv').config();

module.exports = {
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'nexus_flow',
  },
  business: {
    name: process.env.BUSINESS_NAME || 'Nuestro Negocio',
  },
  API_PORT:    Number(process.env.API_PORT) || 3001,
};
