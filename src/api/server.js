require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const apiRoutes = require('./routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Montar rutas
app.use('/api', apiRoutes);

// Puerto
const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 API Nexus-Cockpit corriendo en el puerto ${PORT}`);
});
