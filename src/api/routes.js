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

// GET /api/citas — Retorna citas filtradas por fecha, estado o empleado
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

// GET /api/citas/hoy
// Retorna todas las citas del día actual, ordenadas por hora.
router.get('/citas/hoy', async (req, res) => {
  try {
    const citas = await db.getCitasPorFecha('hoy');
    res.json(citas);
  } catch (err) {
    console.error('[GET /citas/hoy]', err.message);
    res.status(500).json({ message: 'Error al obtener citas de hoy' });
  }
});

// GET /api/citas/manana
// Retorna todas las citas del día de mañana, ordenadas por hora.
router.get('/citas/manana', async (req, res) => {
  try {
    const citas = await db.getCitasPorFecha('manana');
    res.json(citas);
  } catch (err) {
    console.error('[GET /citas/manana]', err.message);
    res.status(500).json({ message: 'Error al obtener citas de mañana' });
  }
});

// GET /api/servicios
// Retorna el catálogo de servicios activos para los selectores de la app.
router.get('/servicios', async (req, res) => {
  try {
    const servicios = await db.getServicios();
    res.json(servicios);
  } catch (err) {
    console.error('[GET /servicios]', err.message);
    res.status(500).json({ message: 'Error al obtener servicios' });
  }
});

// GET /api/slots — Retorna los horarios disponibles reales para una fecha y servicio
router.get('/slots', async (req, res) => {
  try {
    const { fecha, servicioId, empleadoId } = req.query;
    if (!fecha || !servicioId) {
      return res.status(400).json({ message: 'Fecha y servicioId son requeridos' });
    }
    const servicio = await db.getServicioById(Number(servicioId));
    if (!servicio) return res.status(404).json({ message: 'Servicio no encontrado' });

    const { getSlotsDisponibles } = require('../utils/slots');
    const dateObj = new Date(`${fecha}T00:00:00`);
    const slots = await getSlotsDisponibles(
      dateObj,
      servicio.duracion_min,
      empleadoId ? Number(empleadoId) : null
    );

    res.json(slots);
  } catch (err) {
    console.error('[GET /slots]', err.message);
    res.status(500).json({ message: 'Error al calcular slots libres' });
  }
});

// POST /api/citas
// Permite agendar una nueva cita manualmente desde la Nexus-App.
router.post('/citas', async (req, res) => {
  try {
    const { nombreCliente, telefonoCliente, servicioId, empleadoId, fecha, hora } = req.body;

    if (!nombreCliente || !servicioId || !fecha || !hora) {
      return res.status(400).json({ message: 'Nombre del cliente, servicio, fecha y hora son obligatorios.' });
    }

    // Normalizar teléfono: limpiar JIDs (@lid, @c.us) y agregar código de país si es de 10 dígitos
    let telRaw = (telefonoCliente && telefonoCliente.trim()) ? telefonoCliente.trim() : '0000000000';
    if (telRaw.includes('@')) {
      // Es un JID de WhatsApp: extraer la parte numérica
      telRaw = telRaw.split('@')[0].replace(/[^0-9]/g, '');
    }
    // Si son 10 dígitos locales, agregar código de país México (52)
    const tel = (telRaw.replace(/[^0-9]/g, '').length === 10)
      ? '52' + telRaw.replace(/[^0-9]/g, '')
      : telRaw;

    const cliente = await db.findOrCreateCliente(tel, nombreCliente ? nombreCliente.trim() : null);

    const servicio = await db.getServicioById(Number(servicioId));
    if (!servicio) {
      return res.status(400).json({ message: 'El servicio seleccionado no existe' });
    }

    // Calcular fechaInicio y fechaFin
    const fechaInicioStr = `${fecha} ${hora}:00`;
    const inicioDate = new Date(`${fecha}T${hora}:00`);
    const finDate = new Date(inicioDate.getTime() + servicio.duracion_min * 60000);
    const finHora = String(finDate.getHours()).padStart(2, '0');
    const finMin = String(finDate.getMinutes()).padStart(2, '0');
    const fechaFinStr = `${fecha} ${finHora}:${finMin}:00`;

    const empId = empleadoId ? Number(empleadoId) : null;

    const citaId = await db.createCita({
      clienteId: cliente.id,
      servicioId: Number(servicioId),
      empleadoId: empId,
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr,
    });

    // Enviar confirmación por WhatsApp al Cliente y Notificación al Empleado
    if (global.whatsappClient) {
      const { notificarConfirmacionCitaCliente, notificarNuevaCitaEmpleado } = require('../bot/reminders');

      const telefonoParaNotificar = cliente.telefono || tel;

      notificarConfirmacionCitaCliente(global.whatsappClient, {
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoParaNotificar,
        servicioNombre: servicio.nombre,
        fechaInicio: fechaInicioStr,
        hora,
      }).catch((e) => console.warn('[WA] Error enviando confirmación al cliente:', e.message));

      // Notificar al empleado asignado o al admin del negocio
      notificarNuevaCitaEmpleado(global.whatsappClient, {
        empleadoId: empId,
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoParaNotificar,
        servicioNombre: servicio.nombre,
        fechaInicio: fechaInicioStr,
      }).catch((e) => console.warn('[WA] Error enviando notificación al empleado:', e.message));
    }

    res.json({ ok: true, citaId });
  } catch (err) {
    if (err.message === 'SLOT_OCUPADO') {
      return res.status(409).json({ message: 'Ese horario ya está ocupado por otra cita.' });
    }
    console.error('[POST /citas]', err.message);
    res.status(500).json({ message: err.message || 'Error al agendar cita' });
  }
});

// PATCH /api/citas/:id/estado
// Body: { estado: 'completada' | 'cancelada' | 'confirmada' | 'pendiente' }
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

    // Si la cita fue confirmada por el recepcionista, enviar notificación WhatsApp al cliente
    if (estado === 'confirmada' && global.whatsappClient) {
      const [citasDB] = await pool.execute(
        `SELECT c.fecha_inicio, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono, s.nombre AS servicio_nombre
         FROM citas c
         JOIN clientes cl ON c.cliente_id = cl.id
         JOIN servicios s ON c.servicio_id = s.id
         WHERE c.id = ?`,
        [citaId]
      ).catch(() => [[]]);

      if (citasDB.length > 0) {
        const c = citasDB[0];
        const { notificarConfirmacionCitaCliente } = require('../bot/reminders');
        notificarConfirmacionCitaCliente(global.whatsappClient, {
          clienteNombre: c.cliente_nombre,
          clienteTelefono: c.cliente_telefono,
          servicioNombre: c.servicio_nombre,
          fechaInicio: c.fecha_inicio,
        }).catch(() => {});
      }
    }

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

// GET /api/ingresos/diario
// Retorna historial de ingresos agrupado por día (últimos 60 días).
// Solo cuenta citas con estado = 'completada'.
router.get('/ingresos/diario', async (req, res) => {
  try {
    const datos = await db.getIngresosDiarios();
    res.json(datos);
  } catch (err) {
    console.error('[GET /ingresos/diario]', err.message);
    res.status(500).json({ message: 'Error al obtener ingresos diarios' });
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
//  EMPLEADOS
// ─────────────────────────────────────────────────────────────────

// GET /api/empleados — Lista todos los empleados
router.get('/empleados', async (req, res) => {
  try {
    const empleados = await db.getEmpleados();
    res.json(empleados);
  } catch (err) {
    console.error('[GET /empleados]', err.message);
    res.status(500).json({ message: 'Error al obtener empleados' });
  }
});

// POST /api/empleados — Crear o actualizar un empleado
router.post('/empleados', async (req, res) => {
  try {
    const { id, nombre, email, password, telefono, rol, activo, servicioIds } = req.body;
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del empleado es requerido' });
    }
    const empId = await db.guardarEmpleado({ id, nombre, email, password, telefono, rol, activo });
    if (Array.isArray(servicioIds)) {
      await db.setServiciosEmpleado(empId, servicioIds);
    }
    res.status(201).json({ ok: true, id: empId });
  } catch (err) {
    console.error('[POST /empleados]', err.message);
    res.status(500).json({ message: 'Error al guardar empleado' });
  }
});

// GET /api/empleados/:id/servicios — Obtiene los servicios habilitados para un empleado
router.get('/empleados/:id/servicios', async (req, res) => {
  try {
    const servicios = await db.getServiciosEmpleado(req.params.id);
    res.json(servicios);
  } catch (err) {
    console.error('[GET /empleados/:id/servicios]', err.message);
    res.status(500).json({ message: 'Error al obtener servicios del empleado' });
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
