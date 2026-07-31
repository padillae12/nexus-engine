// scripts/seed_vital_dent.js
// ══════════════════════════════════════════════════════════════════
//  SEEDER OFICIAL — CLÍNICA DENTAL "VITAL DENT"
// ══════════════════════════════════════════════════════════════════

require('dotenv').config();
const mysql = require('mysql2/promise');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require('bcrypt');
}

async function seed() {
  console.log('🌱 Sembrando base de datos para Clínica Dental "Vital Dent"...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'nexus_user',
    password: process.env.DB_PASSWORD || 'PadAlex01',
    database: process.env.DB_NAME || 'nexus_flow',
    multipleStatements: true,
  });

  try {
    // 1. Limpiar datos existentes y asegurar columnas de usuarios
    console.log('🧹 Limpiando tablas previas...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Auto-migrar la estructura de usuarios si falta especialidad o el rol doctor
    await connection.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS especialidad VARCHAR(100) NULL`).catch(() => {});
    await connection.query(`ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin', 'encargado', 'empleado', 'doctor') NOT NULL DEFAULT 'empleado'`).catch(() => {});

    await connection.query('TRUNCATE TABLE citas');
    await connection.query('TRUNCATE TABLE bloqueos');
    await connection.query('TRUNCATE TABLE empleado_servicios');
    await connection.query('TRUNCATE TABLE horarios_trabajo');
    await connection.query('TRUNCATE TABLE servicios');
    await connection.query('TRUNCATE TABLE usuarios');
    await connection.query('TRUNCATE TABLE clientes');
    await connection.query('TRUNCATE TABLE config_negocio');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Insertar Configuración General
    console.log('⚙️ Insertando configuración de Vital Dent...');
    const configs = [
      ['BUSINESS_NAME', 'Clínica Dental "Vital Dent"'],
      ['BOT_NAME', 'VitalBot'],
      ['UBICACION', 'Avenida Reforma #456, Colonia Moderna, Hermosillo, Sonora.'],
      ['BUSINESS_ADDRESS', 'Avenida Reforma #456, Colonia Moderna, Hermosillo, Sonora.'],
      ['BUSINESS_LOGO_URL', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoCs5_XaWZbY-_jBo5WDZH7xg3Ohd2E_ZbTh4ZTo2cdw&s=10'],
      ['MIN_BOOKING_HOURS', '4'],
      ['MAX_BOOKING_DAYS', '30'],
      ['CANCEL_HOURS_LIMIT', '24'],
      ['MAX_ACTIVE_APPOINTMENTS', '2'],
      ['ADMIN_PIN', '2229'],
      ['PLAN_TYPE', 'pro'],
      ['EMERGENCY_PHONE', '662 987 6543'],
      ['WELCOME_MESSAGE', '¡Hola! Bienvenido a Vital Dent. ¿Cómo podemos mejorar tu sonrisa hoy?'],
      ['LLEGADA_INDICACIONES', 'Nos ubicamos en el tercer piso, oficina 305. Contamos con estacionamiento techado.'],
      ['REQUISITOS_PRIMERA_CITA', 'Traer identificación oficial y llegar 15 minutos antes de su cita.'],
      ['METODOS_PAGO', 'Efectivo, tarjetas de crédito/débito, transferencias y pagos diferidos.'],
    ];

    for (const [clave, valor] of configs) {
      await connection.query(
        'INSERT INTO config_negocio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [clave, valor]
      );
    }

    // 3. Insertar Usuarios / Doctores
    console.log('👨‍⚕️ Insertando equipo de doctores...');
    const passHash = await bcrypt.hash('123456', 10);

    const doctoresData = [
      ['Dra. María Fernanda Ríos', 'mf.rios@vitaldent.com', '6865267994', 'doctor', 'Ortodoncia'],
      ['Dr. Alejandro Vargas', 'a.vargas@vitaldent.com', '6623300128', 'doctor', 'Endodoncia'],
      ['Dra. Lucía Méndez', 'l.mendez@vitaldent.com', '6621717554', 'doctor', 'Periodoncia'],
      ['Dr. Ricardo Solís', 'r.solis@vitaldent.com', '6862255233', 'doctor', 'Implantología'],
      ['Dra. Andrea Castro', 'a.castro@vitaldent.com', '6862624315', 'doctor', 'Odontopediatría'],
    ];

    const doctorIds = {};
    for (const [nombre, email, tel, rol, esp] of doctoresData) {
      const [res] = await connection.query(
        'INSERT INTO usuarios (nombre, email, password, telefono, rol, especialidad, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [nombre, email, passHash, tel, rol, esp]
      );
      doctorIds[nombre] = res.insertId;
    }

    // 4. Insertar Servicios y Tratamientos
    console.log('🛎️ Insertando catálogo de servicios...');
    const serviciosData = [
      ['Valoración Inicial', 'Incluye diagnóstico visual', 350.00, 1, 30],
      ['Limpieza Profunda', 'Ultrasonido, pulido y flúor', 750.00, 1, 60],
      ['Ortodoncia (Revisión)', 'Ajuste de brackets', 600.00, 1, 30],
      ['Restauración (Resina)', 'Por pieza dental', 950.00, 1, 45],
      ['Extracción de Cordales', 'Requiere radiografía panorámica', 2500.00, 1, 90],
      ['Tratamiento de Conducto', 'Por pieza dental', 3000.00, 1, 90],
      ['Diseño de Sonrisa', 'Consulta estética inicial', 5000.00, 1, 180],
      ['Blanqueamiento Láser', 'Resultados inmediatos', 2500.00, 1, 60],
    ];

    const servicioIds = {};
    for (const [nombre, desc, precio, mostrarPrecio, duracion] of serviciosData) {
      const [res] = await connection.query(
        'INSERT INTO servicios (nombre, descripcion, precio, mostrar_precio, duracion_min, activo) VALUES (?, ?, ?, ?, ?, 1)',
        [nombre, desc, precio, mostrarPrecio, duracion]
      );
      servicioIds[nombre] = res.insertId;
    }

    // 5. Asignar Servicios a Doctores (empleado_servicios)
    console.log('🔗 Vinculando doctores con sus especialidades...');
    const mapeo = [
      // Dra. María Fernanda Ríos -> Ortodoncia (Revisión), Valoración Inicial
      [doctorIds['Dra. María Fernanda Ríos'], servicioIds['Ortodoncia (Revisión)']],
      [doctorIds['Dra. María Fernanda Ríos'], servicioIds['Valoración Inicial']],

      // Dr. Alejandro Vargas -> Tratamiento de Conducto, Valoración Inicial
      [doctorIds['Dr. Alejandro Vargas'], servicioIds['Tratamiento de Conducto']],
      [doctorIds['Dr. Alejandro Vargas'], servicioIds['Valoración Inicial']],

      // Dra. Lucía Méndez -> Limpieza Profunda, Valoración Inicial
      [doctorIds['Dra. Lucía Méndez'], servicioIds['Limpieza Profunda']],
      [doctorIds['Dra. Lucía Méndez'], servicioIds['Valoración Inicial']],

      // Dr. Ricardo Solís -> Valoración Inicial, Extracción de Cordales
      [doctorIds['Dr. Ricardo Solís'], servicioIds['Valoración Inicial']],
      [doctorIds['Dr. Ricardo Solís'], servicioIds['Extracción de Cordales']],

      // Dra. Andrea Castro -> Valoración Inicial, Restauración (Resina), Limpieza Profunda
      [doctorIds['Dra. Andrea Castro'], servicioIds['Valoración Inicial']],
      [doctorIds['Dra. Andrea Castro'], servicioIds['Restauración (Resina)']],
      [doctorIds['Dra. Andrea Castro'], servicioIds['Limpieza Profunda']],
    ];

    for (const [empId, servId] of mapeo) {
      await connection.query(
        'INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE servicio_id = VALUES(servicio_id)',
        [empId, servId]
      );
    }

    // 6. Horarios de Trabajo (Lunes a Viernes 09:00 a 19:00 - General y por Doctor)
    console.log('⏰ Asignando horarios comerciales (Lunes a Viernes 09:00 - 19:00)...');
    const diasLaborables = [1, 2, 3, 4, 5]; // 1: Lunes, 5: Viernes

    // Horario general de la clínica
    for (const dia of diasLaborables) {
      await connection.query(
        `INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin, hora_inicio_comida, hora_fin_comida, activo)
         VALUES (NULL, ?, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 1)`,
        [dia]
      );
    }

    // Horario específico por doctor
    for (const docId of Object.values(doctorIds)) {
      for (const dia of diasLaborables) {
        await connection.query(
          `INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin, hora_inicio_comida, hora_fin_comida, activo)
           VALUES (?, ?, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 1)`,
          [docId, dia]
        );
      }
    }

    console.log('✨ ¡Base de datos de Clínica Dental "Vital Dent" sembrada con éxito!');
  } catch (err) {
    console.error('❌ Error durante el seed:', err);
  } finally {
    await connection.end();
  }
}

seed();
