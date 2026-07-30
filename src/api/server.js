require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const apiRoutes = require('./routes');
const facebookRoutes = require('./facebookWebhook');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Montar rutas
app.use('/api', apiRoutes);
app.use('/api', facebookRoutes);

// Puerto
const PORT = process.env.API_PORT || 3001;

if (!global.apiServerInstance) {
  try {
    global.apiServerInstance = app.listen(PORT, () => {
      console.log(`🚀 API Nexus-Cockpit corriendo en el puerto ${PORT}`);
    });
    global.apiServerInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`ℹ️ API ya escuchando en puerto ${PORT}`);
      } else {
        console.error('❌ Error en API Server:', err.message);
      }
    });
  } catch (e) {
    // Si ya existe
  }
}

module.exports = app;
