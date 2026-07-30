// scripts/seed_sonrisas_perfectas.js
// Carga automática de la configuración real del cliente "Sonrisas Perfectas Odontología"

const pool = require('../src/db/pool');

async function runSeed() {
  console.log('⏳ Cargando configuración de Sonrisas Perfectas Odontología...');

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // 0. Asegurar que existan todas las columnas e infraestructuras requeridas en MariaDB
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config_negocio (
        clave       VARCHAR(60)   NOT NULL,
        valor       VARCHAR(255)  NOT NULL,
        descripcion VARCHAR(255)  NULL,
        PRIMARY KEY (clave)
      ) ENGINE=InnoDB
    `).catch(() => {});
    await pool.query('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20) NULL').catch(() => {});
    await pool.query('ALTER TABLE servicios ADD COLUMN precio DECIMAL(10,2) NULL').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN recordatorio_mins INT UNSIGNED NOT NULL DEFAULT 120').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN recordatorio_enviado TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN notificacion_empleado_enviada TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN precio DECIMAL(10,2) NULL').catch(() => {});
    await pool.query('ALTER TABLE citas ADD COLUMN notas TEXT NULL').catch(() => {});
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empleado_servicios (
        empleado_id INT UNSIGNED NOT NULL,
        servicio_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (empleado_id, servicio_id)
      ) ENGINE=InnoDB
    `).catch(() => {});

    // 1. Configuración del negocio (Datos del Onboarding)
    const configs = [
      ['BUSINESS_NAME', 'Sonrisas Perfectas Odontología'],
      ['BOT_NAME', 'OdontoBot'],
      ['BOT_WELCOME_MSG', '¡Hola! Bienvenido a Sonrisas Perfectas. ¿En qué podemos ayudarte hoy?'],
      ['BUSINESS_ADDRESS', 'Calle Salud #123, Consultorio 204, Colonia Centro, Hermosillo, Sonora.'],
      ['BUSINESS_LOGO_URL', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoCs5_XaWZbY-_jBo5WDZH7xg3Ohd2E_ZbTh4ZTo2cdw&s=10'],
      ['MIN_BOOKING_HOURS', '4'],
      ['MAX_BOOKING_DAYS', '30'],
      ['CANCEL_HOURS_LIMIT', '24'],
      ['ADMIN_PIN', '2026'],
      ['PLAN_TYPE', 'pro'],
      ['EMERGENCY_PHONE', '662 987 6543'],
      ['PAYMENT_METHODS', 'Efectivo, Tarjeta de crédito/débito y Transferencia'],
    ];

    for (const [clave, valor] of configs) {
      await pool.query(
        `INSERT INTO config_negocio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [clave, valor]
      );
    }

    // 2. Catálogo de Servicios
    await pool.query(`DELETE FROM servicios`);
    await pool.query(`
      INSERT INTO servicios (id, nombre, duracion_min, precio, descripcion, activo) VALUES
        (1, 'Valoración Inicial', 30, 300.00, 'Incluye radiografía inicial', 1),
        (2, 'Limpieza / Profilaxis', 45, 600.00, 'Ultrasonido y pulido', 1),
        (3, 'Ortodoncia (Ajuste)', 30, 500.00, 'Solo pacientes activos', 1),
        (4, 'Resina / Obturación', 45, 800.00, 'Por pieza dental', 1),
        (5, 'Extracción Simple', 60, 1200.00, 'Requiere valoración', 1),
        (6, 'Endodoncia (Conductos)', 90, 2500.00, 'Requiere radiografía previa', 1),
        (7, 'Implante Dental', 120, 15000.00, 'Valoración previa obligatoria', 1),
        (8, 'Blanqueamiento Dental', 60, 2000.00, 'Limpieza previa recomendada', 1)
    `);

    // 3. Horarios de Trabajo (Lunes a Viernes 9:00 AM - 7:00 PM)
    await pool.query(`DELETE FROM horarios_trabajo`);
    await pool.query(`
      INSERT INTO horarios_trabajo (dia_semana, hora_inicio, hora_fin) VALUES
        (1, '09:00:00', '19:00:00'), -- Lunes
        (2, '09:00:00', '19:00:00'), -- Martes
        (3, '09:00:00', '19:00:00'), -- Miércoles
        (4, '09:00:00', '19:00:00'), -- Jueves
        (5, '09:00:00', '19:00:00')  -- Viernes
    `);

    // 4. Doctores y Especialistas
    await pool.query(`DELETE FROM usuarios WHERE rol = 'empleado'`);
    await pool.query(`
      INSERT INTO usuarios (id, nombre, email, password, telefono, rol, activo) VALUES
        (10, 'Dra. Ana García', 'ana.garcia@sonrisasperfectas.com', '$2b$10$abcdefghijklmnopqrstuu', '+526865267994', 'empleado', 1),
        (11, 'Dr. Carlos Ruiz', 'carlos.ruiz@sonrisasperfectas.com', '$2b$10$abcdefghijklmnopqrstuu', '+526623300128', 'empleado', 1),
        (12, 'Dra. Elena López', 'elena.lopez@sonrisasperfectas.com', '$2b$10$abcdefghijklmnopqrstuu', '+526621717554', 'empleado', 1),
        (13, 'Dr. Javier Martínez', 'javier.martinez@sonrisasperfectas.com', '$2b$10$abcdefghijklmnopqrstuu', '+526862255233', 'empleado', 1),
        (14, 'Dra. Sofía Torres', 'sofia.torres@sonrisasperfectas.com', '$2b$10$abcdefghijklmnopqrstuu', '+526862624315', 'empleado', 1)
      ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), telefono = VALUES(telefono)
    `);

    // 5. Matriz de Especialidades (Empleado - Servicio)
    await pool.query(`DELETE FROM empleado_servicios`);
    await pool.query(`
      INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES
        (10, 1), (10, 3),        -- Dra. Ana García: Valoración Inicial, Ortodoncia (Ajuste)
        (11, 1), (11, 6),        -- Dr. Carlos Ruiz: Valoración Inicial, Endodoncia (Conductos)
        (12, 1), (12, 2),        -- Dra. Elena López: Valoración Inicial, Limpieza / Profilaxis
        (13, 1), (13, 7),        -- Dr. Javier Martínez: Valoración Inicial, Implante Dental
        (14, 1), (14, 2), (14, 4) -- Dra. Sofía Torres: Valoración Inicial, Limpieza / Profilaxis, Resina / Obturación
    `);

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ ¡Configuración de "Sonrisas Perfectas Odontología" cargada exitosamente en MariaDB!');
    process.exit(0);
  } catch (err) {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('❌ Error al cargar seed:', err.message);
    process.exit(1);
  }
}

runSeed();
