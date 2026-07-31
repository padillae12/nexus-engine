// src/config.js
// Lee las variables de entorno del archivo .env con fallbacks por defecto para la VPS
require('dotenv').config();

module.exports = {
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'nexus_user',
    password: process.env.DB_PASSWORD || 'PadAlex01',
    database: process.env.DB_NAME     || 'nexus_flow',
  },
  business: {
    name: process.env.BUSINESS_NAME || 'Clínica Dental "Vital Dent"',
  },
  API_PORT:    Number(process.env.API_PORT) || 3001,
};
