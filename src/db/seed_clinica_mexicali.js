// src/db/seed_clinica_mexicali.js
// Script ejecutable para resetear la base de datos y poblar los datos oficiales de Clínica Dental Mexicali

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const config = require('../config');

async function seed() {
  console.log('🧹 Conectando a MariaDB para resetear y configurar Clínica Dental Mexicali...');

  const connection = await mysql.createConnection({
    host:               config.db.host,
    port:               config.db.port,
    user:               config.db.user,
    password:           config.db.password,
    database:           config.db.database,
    multipleStatements: true,
  });

  try {
    // 0. Asegurar columnas nuevas (nombre_en, descripcion_en, precio_usd, etc.)
    await connection.query('ALTER TABLE servicios ADD COLUMN nombre_en VARCHAR(150) NULL').catch(() => {});
    await connection.query('ALTER TABLE servicios ADD COLUMN descripcion_en TEXT NULL').catch(() => {});
    await connection.query('ALTER TABLE servicios ADD COLUMN precio_usd DECIMAL(10,2) NULL').catch(() => {});
    await connection.query('ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(150) NULL').catch(() => {});

    // 1. Limpiar tablas de prueba existentes (Respetando llaves foráneas)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE citas;');
    await connection.query('TRUNCATE TABLE clientes;');
    await connection.query('TRUNCATE TABLE empleado_servicios;');
    await connection.query('TRUNCATE TABLE servicios;');
    await connection.query('TRUNCATE TABLE usuarios;');
    await connection.query('TRUNCATE TABLE config_negocio;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('✅ Base de datos vaciada y reseteada al 100%.');

    // 2. Insertar Configuración Global del Negocio
    const configs = [
      ['BUSINESS_NAME', 'Clínica Dental Mexicali'],
      ['BOT_NAME', 'Recepción Dental'],
      ['BUSINESS_ADDRESS', 'Centro Cambiario del Sol. Planta baja.'],
      ['MAPS_URL', 'https://www.google.com/maps/place/CENTRO+CAMBIARIO+DEL+SOL+SA+DE+CV/@32.6654188,-115.4549021,17z/data=!3m1!4b1!4m6!3m5!1s0x80d77aa1d6e5dbc7:0x49ae9919fb798c57!8m2!3d32.6654188!4d-115.4523272!16s%2Fg%2F1v41_rdd'],
      ['ADMIN_PIN', '2026'],
      ['MAX_CITAS_POR_CLIENTE', '2'],
      ['INFO_BIENVENIDA', '¡Bienvenido a Clínica Dental Mexicali! Es un gusto atenderte. Estamos aquí para cuidar tu sonrisa con la mejor atención profesional.'],
      ['INFO_LLEGADA', 'Estamos ubicados en el Centro Cambiario del Sol. Contamos con estacionamiento exclusivo para pacientes frente al consultorio. Planta baja.'],
      ['INFO_REQUISITOS', 'Favor de traer una identificación oficial vigente y llegar 10 minutos antes de tu cita para registro.'],
      ['INFO_METODOS_PAGO', 'Efectivo, Tarjeta de crédito/débito y Transferencia bancaria.'],
    ];

    for (const [clave, valor] of configs) {
      await connection.query(
        'INSERT INTO config_negocio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        [clave, valor]
      );
    }
    console.log('✅ Configuración del negocio (Nombre, Maps, PIN 2026) guardada.');

    // 3. Crear Doctores y Especialistas
    const passHash = await bcrypt.hash('2026', 10);
    const doctores = [
      { nombre: 'Dr. Roberto Sánchez', tel: '6621717554', esp: 'Odontología General' },
      { nombre: 'Dra. Elena Gómez',   tel: '6861190948', esp: 'Ortodoncia' },
      { nombre: 'Dr. Javier Martínez', tel: '6862718911', esp: 'Implantología' },
      { nombre: 'Dra. Sofía Ramírez',  tel: '6623300128', esp: 'Odontología Estética' },
    ];

    const doctorIds = {};
    for (const doc of doctores) {
      const [res] = await connection.query(
        `INSERT INTO usuarios (nombre, password, telefono, rol, especialidad, activo) VALUES (?, ?, ?, 'doctor', ?, 1)`,
        [doc.nombre, passHash, doc.tel, doc.esp]
      );
      doctorIds[doc.esp] = res.insertId;
    }
    console.log('✅ 4 Doctores y Especialistas creados.');

    // 4. Crear Catálogo de Tratamientos Clínicos (Bilingüe Español / Inglés y MXN / USD)
    const servicios = [
      {
        nombre: 'Limpieza y Diagnóstico General',
        nombreEn: 'Deep Dental Cleaning & Exam',
        duracion: 45,
        precio: 600,
        precioUsd: 35,
        desc: 'Limpieza ultrasonido y valoración integral',
        descEn: 'Ultrasonic cleaning and comprehensive oral exam',
        precita: 'Ninguna',
        postcita: 'Evitar alimentos o bebidas frías por 2 horas',
        esp: 'Odontología General',
      },
      {
        nombre: 'Resina Fotocurable',
        nombreEn: 'Composite Dental Filling',
        duracion: 60,
        precio: 800,
        precioUsd: 45,
        desc: 'Restauración estética de diente',
        descEn: 'Tooth-colored aesthetic restoration',
        precita: 'Ninguna',
        postcita: 'No morder alimentos duros durante las primeras 4 horas',
        esp: 'Odontología General',
      },
      {
        nombre: 'Ortodoncia (Valoración / Alineadores)',
        nombreEn: 'Clear Aligners & Brackets Consult',
        duracion: 45,
        precio: 1200,
        precioUsd: 70,
        desc: 'Evaluación para brackets o alineadores invisibles',
        descEn: 'Consultation for clear aligners or traditional braces',
        precita: 'Traer radiografía panorámica si cuenta con ella',
        postcita: 'Usar retenedores e higiene meticulosa',
        esp: 'Ortodoncia',
      },
      {
        nombre: 'Implante Dental (Valoración / Cirugía)',
        nombreEn: 'Premium Dental Implant',
        duracion: 90,
        precio: 15000,
        precioUsd: 850,
        desc: 'Reemplazo quirúrgico con implante de titanio',
        descEn: 'Surgical titanium dental implant placement',
        precita: 'Ayuno de 4 horas y acudir acompañado',
        postcita: 'Tomar analgésico cada 8h, aplicar hielo y reposo 24h',
        esp: 'Implantología',
      },
      {
        nombre: 'Blanqueamiento Dental Láser',
        nombreEn: 'Laser Teeth Whitening',
        duracion: 60,
        precio: 3500,
        precioUsd: 200,
        desc: 'Aclaramiento dental en 1 sola sesión',
        descEn: 'In-office laser whitening in a single 60-min session',
        precita: 'Tener realizada limpieza dental previa',
        postcita: 'Dieta blanca estricta durante 72 horas (sin café ni refresco)',
        esp: 'Odontología Estética',
      },
      {
        nombre: 'Diseño de Sonrisa (Carillas)',
        nombreEn: 'Porcelain Veneers / Smile Design',
        duracion: 120,
        precio: 18000,
        precioUsd: 1000,
        desc: 'Transformación estética dental personalizada',
        descEn: 'Custom aesthetic smile transformation',
        precita: 'Cita previa de valoración y escaneo',
        postcita: 'Evitar morder objetos duros o alimentos pigmentantes',
        esp: 'Odontología Estética',
      },
    ];

    for (const srv of servicios) {
      const [resSrv] = await connection.query(
        `INSERT INTO servicios (nombre, nombre_en, duracion_min, precio, precio_usd, descripcion, descripcion_en, indicaciones_precita, indicaciones_postcita, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [srv.nombre, srv.nombreEn, srv.duracion, srv.precio, srv.precioUsd, srv.desc, srv.descEn, srv.precita, srv.postcita]
      );
      const servicioId = resSrv.insertId;

      // Asignar al doctor correspondiente por especialidad
      const docId = doctorIds[srv.esp];
      if (docId) {
        await connection.query(
          `INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES (?, ?)`,
          [docId, servicioId]
        );
      }
    }
    console.log('✅ Catálogo de tratamientos cargado y asignado a los doctores.');

    console.log('🎉 ¡RESETEO Y CONFIGURACIÓN DE CLÍNICA DENTAL MEXICALI COMPLETADO CON ÉXITO!');
  } catch (err) {
    console.error('❌ Error ejecutando el seed:', err);
  } finally {
    await connection.end();
  }
}

seed();
