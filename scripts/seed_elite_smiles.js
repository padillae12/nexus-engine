// scripts/seed_elite_smiles.js
// ══════════════════════════════════════════════════════════════════
//  SEEDER OFICIAL — ELITE SMILES DENTAL CENTER (PLAN PRO / CLÍNICO)
// ══════════════════════════════════════════════════════════════════

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require('bcrypt');
}

async function seed() {
  console.log('💎 Sembrando base de datos para "Elite Smiles Dental Center" (Plan Pro)...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'nexus_user',
    password: process.env.DB_PASSWORD || 'PadAlex01',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'nexus_flow';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${dbName}\``);

  try {
    // 0. Cargar el esquema maestro si las tablas no existen aún
    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(sqlSchema).catch(() => {});
    }

    // 1. Limpiar datos existentes
    console.log('🧹 Limpiando tablas previas...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE citas');
    await connection.query('TRUNCATE TABLE bloqueos');
    await connection.query('TRUNCATE TABLE empleado_servicios');
    await connection.query('TRUNCATE TABLE horarios_trabajo');
    await connection.query('TRUNCATE TABLE servicios');
    await connection.query('TRUNCATE TABLE usuarios');
    await connection.query('TRUNCATE TABLE clientes');
    await connection.query('TRUNCATE TABLE config_negocio');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Insertar Configuración General del Plan Pro
    console.log('⚙️ Insertando configuración de Elite Smiles Dental Center...');
    const configs = [
      ['BUSINESS_NAME', 'Elite Smiles Dental Center'],
      ['BOT_NAME', 'SmileBot Concierge'],
      ['UBICACION', 'Av. Paseo de la Reforma 250, Piso 12, Col. Juárez, CDMX'],
      ['BUSINESS_ADDRESS', 'Av. Paseo de la Reforma 250, Piso 12, Col. Juárez, CDMX'],
      ['BUSINESS_LOGO_URL', 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=400&auto=format&fit=crop'],
      ['MIN_BOOKING_HOURS', '6'],
      ['MAX_BOOKING_DAYS', '30'],
      ['CANCEL_HOURS_LIMIT', '24'],
      ['MAX_ACTIVE_APPOINTMENTS', '2'],
      ['ADMIN_PIN', '4321'],
      ['PLAN_TYPE', 'pro'],
      ['EMERGENCY_PHONE', '+52 55 5555 9999'],
      ['WELCOME_MESSAGE', 'Bienvenido a Elite Smiles, donde su salud dental es nuestro lujo.'],
      ['LLEGADA_INDICACIONES', 'Estacionamiento con Valet Parking disponible. Piso 12, Consultorio VIP.'],
      ['REQUISITOS_PRIMERA_CITA', 'Traer identificación oficial, llegar 10 min antes para registro.'],
      ['METODOS_PAGO', 'Efectivo, Tarjeta, Transferencia, Seguros Médicos Internacionales.'],
    ];

    for (const [clave, valor] of configs) {
      await connection.query(
        'INSERT INTO config_negocio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [clave, valor]
      );
    }

    // 3. Insertar Doctores
    console.log('👨‍⚕️ Insertando equipo de doctores...');
    const passHash = await bcrypt.hash('123456', 10);

    const doctoresData = [
      ['Dra. Elena Velasco', 'elena.velasco@elitesmiles.com', '5511112222', 'doctor', 'Estética Dental y Diseño de Sonrisa'],
      ['Dr. Ricardo Montes', 'ricardo.montes@elitesmiles.com', '5533334444', 'doctor', 'Implantología y Rehabilitación Oral'],
    ];

    const doctorIds = {};
    for (const [nombre, email, tel, rol, esp] of doctoresData) {
      const [res] = await connection.query(
        'INSERT INTO usuarios (nombre, email, password, telefono, rol, especialidad, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [nombre, email, passHash, tel, rol, esp]
      );
      doctorIds[nombre] = res.insertId;
    }

    // 4. Insertar Tratamientos y Servicios
    console.log('🛎️ Insertando catálogo de servicios VIP...');
    const serviciosData = [
      ['Diseño de Sonrisa (Veneers)', 'Previa valoración digital', 15000.00, 1, 120, 'Traer radiografía panorámica reciente y acudir con higiene oral rigurosa.', 'Evitar alimentos pigmentantes (café, vino, salsa de tomate) durante 48 hrs y usar guarda nocturna.'],
      ['Implante Dental Premium', 'Incluye corona de zirconio', 25000.00, 1, 90, 'No ingerir alimentos 4 horas antes si requiere sedación ligera. Venir acompañado.', 'Tomar antibiótico/analgésico indicado cada 8h. Colocar hielo externo 15 min por hora. Reposo 24h.'],
      ['Blanqueamiento Láser', 'Resultados inmediatos', 4500.00, 1, 60, 'Realizar limpieza dental previa si han pasado más de 6 meses.', 'Dieta blanca estricta durante 72 hrs. Evitar bebidas muy frías o calientes.'],
      ['Ortodoncia Invisible', 'Escaneo 3D incluido', 8000.00, 1, 45, 'Venir con dientes limpios para escaneo intraoral 3D.', 'Usar alineadores mínimo 22 horas al día. Retirar únicamente para comer.'],
    ];

    const servicioIds = {};
    for (const [nombre, desc, precio, mostrarPrecio, duracion, precita, postcita] of serviciosData) {
      const [res] = await connection.query(
        'INSERT INTO servicios (nombre, descripcion, precio, mostrar_precio, duracion_min, indicaciones_precita, indicaciones_postcita, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [nombre, desc, precio, mostrarPrecio, duracion, precita, postcita]
      );
      servicioIds[nombre] = res.insertId;
    }

    // 5. Vincular Doctores con Tratamientos (empleado_servicios)
    console.log('🔗 Vinculando especialidades...');
    const mapeo = [
      // Dra. Elena Velasco -> Diseño de Sonrisa, Blanqueamiento Láser
      [doctorIds['Dra. Elena Velasco'], servicioIds['Diseño de Sonrisa (Veneers)']],
      [doctorIds['Dra. Elena Velasco'], servicioIds['Blanqueamiento Láser']],

      // Dr. Ricardo Montes -> Implante Dental Premium, Ortodoncia Invisible
      [doctorIds['Dr. Ricardo Montes'], servicioIds['Implante Dental Premium']],
      [doctorIds['Dr. Ricardo Montes'], servicioIds['Ortodoncia Invisible']],
    ];

    for (const [empId, servId] of mapeo) {
      await connection.query(
        'INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE servicio_id = VALUES(servicio_id)',
        [empId, servId]
      );
    }

    // 6. Horarios de Atención (Lunes a Sábado 08:00 a 20:00 - Comida 14:00 a 15:00)
    console.log('⏰ Asignando horarios comerciales (Lunes a Sábado 08:00 - 20:00)...');
    const diasLaborables = [1, 2, 3, 4, 5, 6]; // 1: Lunes, 6: Sábado

    // Horario general de la clínica
    for (const dia of diasLaborables) {
      await connection.query(
        `INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin, hora_inicio_comida, hora_fin_comida, activo)
         VALUES (NULL, ?, '08:00:00', '20:00:00', '14:00:00', '15:00:00', 1)`,
        [dia]
      );
    }

    // Horario individual por doctor
    for (const docId of Object.values(doctorIds)) {
      for (const dia of diasLaborables) {
        await connection.query(
          `INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin, hora_inicio_comida, hora_fin_comida, activo)
           VALUES (?, ?, '08:00:00', '20:00:00', '14:00:00', '15:00:00', 1)`,
          [docId, dia]
        );
      }
    }

    console.log('✨ ¡Base de datos de "Elite Smiles Dental Center" (Plan Pro) sembrada con éxito!');
  } catch (err) {
    console.error('❌ Error durante el seed:', err);
  } finally {
    await connection.end();
  }
}

seed();
