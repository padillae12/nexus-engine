// src/api/routes.js
// ══════════════════════════════════════════════════════════════════
//  API REST — Nexus-Flow
//
//  Endpoints consumidos por la Nexus-App (React Native + Expo).
//  Todos los datos pasan por queries.js (real) o queries.mock.js
//  dependiendo de USE_MOCK_DB en .env.
// ══════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const db      = require('../db/queries');
const pool    = require('../db/pool');

// ─────────────────────────────────────────────────────────────────
//  HEALTH
// ─────────────────────────────────────────────────────────────────

// GET /api/health — Healthcheck básico de la API
router.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'API respondiendo correctamente',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/db-health — Verifica conexión real a MariaDB
router.get('/db-health', async (req, res) => {
  try {
    await pool.execute('SELECT 1 AS connected');
    res.json({
      status:    'ok',
      message:   'Conexión a MariaDB exitosa ✅',
      host:      process.env.DB_HOST,
      database:  process.env.DB_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status:    'error',
      message:   'No se pudo conectar a la DB ❌',
      error:     err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ─────────────────────────────────────────────────────────────────
//  AUTH — Modo Admin
// ─────────────────────────────────────────────────────────────────

// POST /api/auth/verify-pin
// Body: { pin: "123456" }
// Compara el PIN ingresado contra el valor en config_negocio.
// Soporta tanto texto plano como hash bcrypt.
router.post('/auth/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ ok: false, message: 'PIN requerido' });

    // Intentar con ADMIN_PIN primero, luego RECEPTION_PIN
    const pinStr = String(pin);
    let ok = false;

    for (const clave of ['ADMIN_PIN', 'RECEPTION_PIN']) {
      const valorGuardado = await db.getConfig(clave);
      if (!valorGuardado) continue;

      // Si es hash bcrypt, comparar con bcrypt; si no, comparar directo
      const esBcrypt = valorGuardado.startsWith('$2b$') || valorGuardado.startsWith('$2a$');
      const coincide = esBcrypt
        ? await bcrypt.compare(pinStr, valorGuardado)
        : pinStr === valorGuardado;

      if (coincide) { ok = true; break; }
    }

    res.json({ ok });
  } catch (err) {
    console.error('[verify-pin]', err.message);
    res.status(500).json({ ok: false, message: 'Error interno' });
  }
});


// ─────────────────────────────────────────────────────────────────
//  CITAS
// ─────────────────────────────────────────────────────────────────

// GET /api/citas/hoy
// Retorna todas las citas del día actual, ordenadas por hora.
router.get('/citas/hoy', async (req, res) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const citas = await db.getCitasPorFecha(hoy);
    res.json(citas);
  } catch (err) {
    console.error('[GET /citas/hoy]', err.message);
    res.status(500).json({ message: 'Error al obtener citas de hoy' });
  }
});

// GET /api/citas?fecha=YYYY-MM-DD&estado=confirmada&empleadoId=1
// Retorna citas con filtros opcionales.
router.get('/citas', async (req, res) => {
  try {
    const { fecha, estado, empleadoId } = req.query;
    const citas = await db.getCitasFiltradas({ fecha, estado, empleadoId });
    res.json(citas);
  } catch (err) {
    console.error('[GET /citas]', err.message);
    res.status(500).json({ message: 'Error al obtener citas' });
  }
});

// PATCH /api/citas/:id/estado
// Body: { estado: 'completada' | 'cancelada' | 'pendiente' }
// Cambia el estado de una cita desde la app.
router.patch('/citas/:id/estado', async (req, res) => {
  try {
    const citaId = Number(req.params.id);
    const { estado } = req.body;

    const estadosValidos = ['confirmada', 'completada', 'cancelada', 'pendiente'];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({ message: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
    }

    const ok = await db.updateEstadoCita(citaId, estado);
    if (!ok) return res.status(404).json({ message: 'Cita no encontrada' });

    res.json({ ok: true, citaId, estado });
  } catch (err) {
    console.error('[PATCH /citas/:id/estado]', err.message);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

// ─────────────────────────────────────────────────────────────────
//  CLIENTES
// ─────────────────────────────────────────────────────────────────

// GET /api/clientes
// Retorna la lista de todos los clientes registrados por el bot.
router.get('/clientes', async (req, res) => {
  try {
    const clientes = await db.getClientesLista();
    res.json(clientes);
  } catch (err) {
    console.error('[GET /clientes]', err.message);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
});

// ─────────────────────────────────────────────────────────────────
//  DASHBOARD (Modo Admin)
// ─────────────────────────────────────────────────────────────────

// GET /api/dashboard/stats
// Retorna estadísticas del día para el panel del dueño.
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error('[GET /dashboard/stats]', err.message);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

// ─────────────────────────────────────────────────────────────────
//  BLOQUEOS
// ─────────────────────────────────────────────────────────────────

// POST /api/bloqueos
// Body: { motivo, fechaInicio, fechaFin, empleadoId? }
// Crea un bloqueo rápido (ej: emergencia, salida inesperada).
router.post('/bloqueos', async (req, res) => {
  try {
    const { motivo, fechaInicio, fechaFin, empleadoId } = req.body;
    if (!motivo || !fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'motivo, fechaInicio y fechaFin son requeridos' });
    }

    const id = await db.crearBloqueo({ motivo, fechaInicio, fechaFin, empleadoId: empleadoId || null });
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error('[POST /bloqueos]', err.message);
    res.status(500).json({ message: 'Error al crear bloqueo' });
  }
});

// ─────────────────────────────────────────────────────────────────
//  CONFIG NEGOCIO
// ─────────────────────────────────────────────────────────────────

// GET /api/config
// Retorna toda la configuración del negocio como objeto clave→valor.
// Omite el ADMIN_PIN por seguridad.
router.get('/config', async (req, res) => {
  try {
    const config = await db.getAllConfig();
    delete config.ADMIN_PIN; // nunca exponer el hash del PIN
    res.json(config);
  } catch (err) {
    console.error('[GET /config]', err.message);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
});

module.exports = router;
