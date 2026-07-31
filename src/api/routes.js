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

// GET /api/servicios/admin — Obtiene todos los servicios (activos e inactivos)
router.get('/servicios/admin', async (req, res) => {
  try {
    const servicios = await db.getServiciosAdmin();
    res.json(servicios);
  } catch (err) {
    console.error('[GET /servicios/admin]', err.message);
    res.status(500).json({ message: 'Error al obtener lista de servicios' });
  }
});

// POST /api/servicios — Crear o editar un servicio
router.post('/servicios', async (req, res) => {
  try {
    const { id, nombre, precio, duracionMin, descripcion, activo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre del servicio es requerido' });
    }
    const serviceId = await db.guardarServicio({ id, nombre, precio, duracionMin, descripcion, activo });
    res.status(201).json({ ok: true, id: serviceId });
  } catch (err) {
    console.error('[POST /servicios]', err.message);
    res.status(500).json({ message: 'Error al guardar el servicio' });
  }
});

// DELETE /api/servicios/:id — Desactivar/Eliminar un servicio
router.delete('/servicios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteServicio(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /servicios/:id]', err.message);
    res.status(500).json({ message: 'Error al eliminar el servicio' });
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

    const { normalizarTelefono } = require('../utils/phone');

    // Normalizar teléfono (soporta números de México, EE.UU. +1 e internacionales)
    const tel = normalizarTelefono(telefonoCliente);

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

    // Si la cita fue marcada como COMPLETADA, enviar automáticamente el Ticket / Comprobante por WhatsApp
    if (estado === 'completada' && global.whatsappClient) {
      const [citasDB] = await pool.execute(
        `SELECT c.fecha_inicio, COALESCE(c.precio, s.precio, 0) AS precio, c.notas,
                cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono, 
                s.nombre AS servicio_nombre, u.nombre AS empleado_nombre
         FROM citas c
         JOIN clientes cl ON c.cliente_id = cl.id
         JOIN servicios s ON c.servicio_id = s.id
         LEFT JOIN usuarios u ON c.empleado_id = u.id
         WHERE c.id = ?`,
        [citaId]
      ).catch(() => [[]]);

      if (citasDB.length > 0) {
        const c = citasDB[0];
        const { notificarTicketCompletadoCliente } = require('../bot/reminders');
        notificarTicketCompletadoCliente(global.whatsappClient, {
          clienteNombre: c.cliente_nombre,
          clienteTelefono: c.cliente_telefono,
          servicioNombre: c.servicio_nombre,
          precio: c.precio,
          notas: c.notas,
          empleadoNombre: c.empleado_nombre,
          fechaInicio: c.fecha_inicio,
        }).catch(() => {});
      }
    }

    // Si la cita fue CANCELADA, notificar por WhatsApp al doctor/empleado asignado
    if (estado === 'cancelada' && global.whatsappClient) {
      const citaFull = await db.getCitaFullInfo(citaId).catch(() => null);
      if (citaFull) {
        const { notificarCancelacionCitaEmpleado } = require('../bot/reminders');
        notificarCancelacionCitaEmpleado(global.whatsappClient, citaFull).catch((e) => console.warn('[WA] Error notificando cancelación a empleado:', e.message));
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
    const { id, nombre, email, password, telefono, rol, activo, servicioIds, horaInicioComida, horaFinComida } = req.body;
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del empleado es requerido' });
    }
    const empId = await db.guardarEmpleado({ id, nombre, email, password, telefono, rol, activo, horaInicioComida, horaFinComida });
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

// ─────────────────────────────────────────────────────────────────
//  HISTORIAL CLIENTE, REENVIAR WHATSAPP & REPORTES PDF
// ─────────────────────────────────────────────────────────────────

// PATCH /api/citas/:id/servicio-precio — Modifica el servicio, precio y/o notas de una cita
router.patch('/citas/:id/servicio-precio', async (req, res) => {
  try {
    const { servicioId, precio, notas } = req.body;
    await db.updateCitaServicioPrecio(req.params.id, { servicioId, precio, notas });
    res.json({ ok: true, message: 'Servicio, precio y notas actualizados correctamente' });
  } catch (err) {
    console.error('[PATCH /citas/:id/servicio-precio]', err.message);
    res.status(500).json({ message: 'Error al actualizar servicio, precio o notas' });
  }
});

// GET /api/clientes/:id/citas — Historial completo de citas de un cliente
router.get('/clientes/:id/citas', async (req, res) => {
  try {
    const citas = await db.getCitasCliente(req.params.id);
    res.json(citas);
  } catch (err) {
    console.error('[GET /clientes/:id/citas]', err.message);
    res.status(500).json({ message: 'Error al obtener historial del cliente' });
  }
});

// POST /api/citas/:id/reenviar-whatsapp — Reenvía confirmación por WhatsApp
router.post('/citas/:id/reenviar-whatsapp', async (req, res) => {
  try {
    const citaInfo = await db.getCitaFullInfo(req.params.id);
    if (!citaInfo) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    if (!global.whatsappClient) {
      return res.status(503).json({ message: 'WhatsApp no está conectado en el servidor' });
    }
    const { notificarConfirmacionCitaCliente } = require('../bot/reminders');
    await notificarConfirmacionCitaCliente(global.whatsappClient, {
      clienteNombre: citaInfo.cliente_nombre,
      clienteTelefono: citaInfo.cliente_telefono,
      servicioNombre: citaInfo.servicio_nombre,
      fechaInicio: citaInfo.fecha_inicio,
      empleadoId: citaInfo.empleado_id,
    });
    res.json({ ok: true, message: 'Confirmación reenviada con éxito' });
  } catch (err) {
    console.error('[POST /citas/:id/reenviar-whatsapp]', err.message);
    res.status(500).json({ message: 'Error al reenviar mensaje de WhatsApp' });
  }
});

const { LOGO_BASE64 } = require('../utils/logo');

// GET /api/reportes/ingresos/html — Genera plantilla PDF/Imprimible membretada
router.get('/reportes/ingresos/html', async (req, res) => {
  try {
    const mesStr = req.query.mes || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const citas = await db.getReporteIngresosMensual(mesStr);
    const config = await db.getAllConfig().catch(() => ({}));
    
    const nombreNegocio = config.BUSINESS_NAME || 'Dental Loquero';
    const direccion = config.BUSINESS_ADDRESS || config.UBICACION || 'Orozco y Berra 2229, Col. Constitución';
    const telefono = config.BUSINESS_PHONE || '686 271 8911';
    const logoUrl = config.BUSINESS_LOGO_URL || LOGO_BASE64;

    const totalIngresos = citas.reduce((sum, c) => sum + Number(c.precio || 0), 0);
    const totalCitas = citas.length;

    const [y, m] = mesStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, 1);
    const nombreMes = dateObj.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="Logo" style="max-height: 70px; max-width: 220px; object-fit: contain;" />`
      : `<div style="font-size: 20px; font-weight: 800; color: #4F46E5; letter-spacing: 1px;">${nombreNegocio.toUpperCase()}</div>`;

    const filasHtml = citas.map((c, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB;">${c.fecha}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">${c.cliente}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB;">${c.telefono || '—'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB;">
          ${c.servicio}
          ${c.notas ? `<br><span style="color:#6B7280; font-size:10px; font-style:italic;">Notas: ${c.notas}</span>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB;">${c.empleado}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700; color: #059669;">$${Number(c.precio).toLocaleString('es-MX')}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Contable — ${nombreNegocio}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1F2937; margin: 0; padding: 40px; background-color: #FFFFFF; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
    .business-info { text-align: right; font-size: 12px; color: #4B5563; }
    .business-name { font-size: 16px; font-weight: bold; color: #111827; }
    .report-title { font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 6px 0; }
    .report-subtitle { font-size: 13px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-grid { display: flex; gap: 16px; margin-bottom: 30px; }
    .summary-card { flex: 1; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-label { font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; margin-bottom: 4px; }
    .summary-value { font-size: 22px; font-weight: 800; color: #4F46E5; }
    .summary-value-green { font-size: 22px; font-weight: 800; color: #059669; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px; }
    th { background: #4F46E5; color: #FFFFFF; text-align: left; padding: 10px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-box { width: 200px; text-align: center; border-top: 1px solid #9CA3AF; padding-top: 6px; font-size: 11px; color: #4B5563; }
    .watermark { font-size: 10px; color: #9CA3AF; text-align: right; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #4F46E5; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">
      🖨️ Imprimir / Guardar en PDF
    </button>
  </div>

  <!-- MEMBRETE CON LOGO Y NEGOCIO -->
  <div class="header">
    <div>
      ${logoHtml}
      <div style="margin-top: 10px;">
        <h1 class="report-title">REPORTE CONTABLE DE INGRESOS</h1>
        <div class="report-subtitle">PERÍODO: ${nombreMes}</div>
      </div>
    </div>
    <div class="business-info">
      <div class="business-name">${nombreNegocio}</div>
      <div>${direccion}</div>
      <div>Tel / WhatsApp: ${telefono}</div>
      <div style="margin-top: 4px; color: #9CA3AF;">Emisión: ${new Date().toLocaleDateString('es-MX')}</div>
    </div>
  </div>

  <!-- CARDS DE RESUMEN EJECUTIVO -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Citas Completadas</div>
      <div class="summary-value">${totalCitas}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Ingresos Totales (MXN)</div>
      <div class="summary-value-green">$${totalIngresos.toLocaleString('es-MX')}</div>
    </div>
  </div>

  <!-- TABLA DETALLADA -->
  <table>
    <thead>
      <tr>
        <th>FECHA Y HORA</th>
        <th>CLIENTE</th>
        <th>TELÉFONO</th>
        <th>SERVICIO</th>
        <th>ESPECIALISTA</th>
        <th style="text-align: right;">MONTO</th>
      </tr>
    </thead>
    <tbody>
      ${filasHtml || '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #9CA3AF;">Sin registros de citas completadas en este mes</td></tr>'}
    </tbody>
  </table>

  <!-- FIRMA Y SELLO CONTABLE -->
  <div class="footer">
    <div class="signature-box">
      <strong>Firma del Encargado / Contador</strong><br>
      Sello de Conformidad
    </div>
    <div class="watermark">
      Documento contable generado automáticamente por <strong>Nexus-Engine</strong><br>
      Sistema de Gestión Operativa
    </div>
  </div>

</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    console.error('[GET /reportes/ingresos/html]', err.message);
    res.status(500).send('Error al generar el reporte contable');
  }
});
router.get('/reportes/ingresos/excel', async (req, res) => {
  try {
    const mesStr = req.query.mes || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const citas = await db.getReporteIngresosMensual(mesStr);
    const config = await db.getAllConfig().catch(() => ({}));
    const nombreNegocio = config.BUSINESS_NAME || 'Dental Loquero';

    const [y, m] = mesStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, 1);
    const nombreMes = dateObj.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();

    // UTF-8 BOM (\uFEFF) para apertura directa y perfecta en Microsoft Excel
    let csv = '\uFEFF';
    csv += `REPORTE CONTABLE DE INGRESOS - ${nombreNegocio.toUpperCase()}\n`;
    csv += `PERIODO: ${nombreMes}\n\n`;
    csv += `FECHA Y HORA,CLIENTE,TELEFONO,SERVICIO,NOTAS,ESPECIALISTA,MONTO (MXN)\n`;

    let totalIngresos = 0;
    citas.forEach(c => {
      const precioNum = Number(c.precio || 0);
      totalIngresos += precioNum;
      const clienteEsc = `"${(c.cliente || '').replace(/"/g, '""')}"`;
      const servicioEsc = `"${(c.servicio || '').replace(/"/g, '""')}"`;
      const notasEsc = `"${(c.notas || '').replace(/"/g, '""')}"`;
      const empleadoEsc = `"${(c.empleado || '').replace(/"/g, '""')}"`;
      csv += `"${c.fecha}",${clienteEsc},"${c.telefono || ''}",${servicioEsc},${notasEsc},${empleadoEsc},${precioNum}\n`;
    });

    csv += `\n`;
    csv += `TOTAL CITAS COMPLETADAS,${citas.length}\n`;
    csv += `TOTAL INGRESOS,$${totalIngresos.toLocaleString('es-MX')} MXN\n`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Ingresos_${nombreNegocio.replace(/\s+/g, '_')}_${mesStr}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('[GET /reportes/ingresos/excel]', err.message);
    res.status(500).send('Error al generar el reporte en Excel');
  }
});

module.exports = router;
