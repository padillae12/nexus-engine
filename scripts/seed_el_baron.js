// scripts/seed_el_baron.js
// ══════════════════════════════════════════════════════════════════
//  SEEDER OFICIAL — BARBERÍA "EL BARÓN" (PLAN BÁSICO / EXPRESS)
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
  console.log('💈 Sembrando base de datos para Barbería "El Barón" (Plan Básico)...');

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

    // 2. Insertar Configuración General del Plan Básico
    console.log('⚙️ Insertando configuración de Barbería "El Barón"...');
    const configs = [
      ['BUSINESS_NAME', 'Barbería "El Barón"'],
      ['BOT_NAME', 'El Barón Bot'],
      ['UBICACION', 'Blvd. Agua Caliente #123, Col. Aviación, Tijuana, BC'],
      ['BUSINESS_ADDRESS', 'Blvd. Agua Caliente #123, Col. Aviación, Tijuana, BC'],
      ['MIN_BOOKING_HOURS', '2'],
      ['MAX_BOOKING_DAYS', '30'],
      ['CANCEL_HOURS_LIMIT', '24'],
      ['MAX_ACTIVE_APPOINTMENTS', '2'],
      ['ADMIN_PIN', '1234'],
      ['PLAN_TYPE', 'basico'],
      ['WELCOME_MESSAGE', '¡Bienvenidos a El Barón! Expertos en estilo y cuidado masculino.'],
      ['LLEGADA_INDICACIONES', 'Estacionamiento privado disponible al frente.'],
      ['REQUISITOS_PRIMERA_CITA', 'Puntualidad estricta (tolerancia de 10 min), aceptamos efectivo y tarjetas.'],
      ['METODOS_PAGO', 'Efectivo y tarjetas de crédito/débito.'],
    ];

    for (const [clave, valor] of configs) {
      await connection.query(
        'INSERT INTO config_negocio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [clave, valor]
      );
    }

    // 3. Insertar Empleados
    console.log('✂️ Insertando personal barberos...');
    const passHash = await bcrypt.hash('123456', 10);

    const barberosData = [
      ['Carlos R.', 'carlos@elbaron.com', '6641234567', 'empleado', 'Barbero Profesional'],
      ['Miguel A.', 'miguel@elbaron.com', '6649876543', 'empleado', 'Master Barber'],
    ];

    const barberoIds = {};
    for (const [nombre, email, tel, rol, esp] of barberosData) {
      const [res] = await connection.query(
        'INSERT INTO usuarios (nombre, email, password, telefono, rol, especialidad, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [nombre, email, passHash, tel, rol, esp]
      );
      barberoIds[nombre] = res.insertId;
    }

    // 4. Insertar Servicios de Barbería
    console.log('💈 Insertando catálogo de servicios...');
    const serviciosData = [
      ['Corte de Cabello', 'Incluye lavado y peinado', 200.00, 1, 30],
      ['Barba Express', 'Toalla caliente y perfilado', 150.00, 1, 20],
      ['Combo Corte + Barba', 'Servicio completo VIP', 300.00, 1, 45],
    ];

    const servicioIds = {};
    for (const [nombre, desc, precio, mostrarPrecio, duracion] of serviciosData) {
      const [res] = await connection.query(
        'INSERT INTO servicios (nombre, descripcion, precio, mostrar_precio, duracion_min, activo) VALUES (?, ?, ?, ?, ?, 1)',
        [nombre, desc, precio, mostrarPrecio, duracion]
      );
      servicioIds[nombre] = res.insertId;
    }

    // 5. Vincular Barberos con Servicios (todos realizan todos los cortes)
    console.log('🔗 Vinculando barberos con servicios...');
    for (const empId of Object.values(barberoIds)) {
      for (const servId of Object.values(servicioIds)) {
        await connection.query(
          'INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE servicio_id = VALUES(servicio_id)',
          [empId, servId]
        );
      }
    }

    // 6. Horarios de Atención (Lunes a Sábado 09:00 - 19:00)
    console.log('⏰ Asignando horarios de atención (Lunes a Sábado 09:00 - 19:00)...');
    const diasLaborables = [1, 2, 3, 4, 5, 6]; // 1: Lunes, 6: Sábado

    // Horario general de la barbería
    for (const dia of diasLaborables) {
      await connection.query(
        `INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin, hora_inicio_comida, hora_fin_comida, activo)
         VALUES (NULL, ?, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 1)`,
        [dia]
      );
    }

    // Horarios por barbero
    for (const barberoId of Object.values(barberoIds)) {
      for (const dia of diasLaborables) {
        await connection.query(
          `INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin, hora_inicio_comida, hora_fin_comida, activo)
           VALUES (?, ?, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 1)`,
          [barberoId, dia]
        );
      }
    }

    console.log('✨ ¡Base de datos de Barbería "El Barón" (Plan Básico) sembrada con éxito!');
  } catch (err) {
    console.error('❌ Error durante el seed:', err);
  } finally {
    await connection.end();
  }
}

seed();
