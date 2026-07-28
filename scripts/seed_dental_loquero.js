// scripts/seed_dental_loquero.js
// Carga automática de la configuración real del cliente "Dental Loquero"

const pool = require('../src/db/pool');

async function runSeed() {
  console.log('⏳ Cargando configuración de Dental Loquero...');

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Configuración del negocio
    const configs = [
      ['BOT_NAME', 'loqueron'],
      ['PLAN_TYPE', 'pro'],
      ['MIN_BOOKING_HOURS', '3'],
      ['MAX_BOOKING_DAYS', '30'],
      ['ADMIN_PIN', '21250'],
      ['BUSINESS_NAME', 'Dental Loquero'],
      ['BUSINESS_ADDRESS', 'Orozco y Berra 2229, 21250 Colonia Constitución'],
      ['OFFER_RESCHEDULE', 'true'],
      ['CANCEL_HOURS_LIMIT', '4'],
    ];

    for (const [clave, valor] of configs) {
      await pool.query(
        `INSERT INTO config_negocio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [clave, valor]
      );
    }

    // 2. Servicios
    await pool.query(`DELETE FROM servicios`);
    await pool.query(`
      INSERT INTO servicios (id, nombre, duracion_min, precio, activo) VALUES
        (1, 'Limpieza', 45, 500.00, 1),
        (2, 'Resina/obturación', 45, 800.00, 1),
        (3, 'Extracción Simple', 60, 1200.00, 1),
        (4, 'Ajuste Mensual de Ortodoncia', 30, 500.00, 1)
    `);

    // 3. Horarios de Trabajo
    await pool.query(`DELETE FROM horarios_trabajo`);
    await pool.query(`
      INSERT INTO horarios_trabajo (dia_semana, hora_inicio, hora_fin, activo) VALUES
        (0, '09:00:00', '14:00:00', 0), -- Domingo cerrado
        (1, '08:00:00', '18:00:00', 1), -- Lunes 8:00 AM - 6:00 PM
        (2, '08:00:00', '18:00:00', 1), -- Martes 8:00 AM - 6:00 PM
        (3, '08:00:00', '18:00:00', 1), -- Miércoles 8:00 AM - 6:00 PM
        (4, '08:00:00', '18:00:00', 1), -- Jueves 8:00 AM - 6:00 PM
        (5, '08:00:00', '18:00:00', 1), -- Viernes 8:00 AM - 6:00 PM
        (6, '10:00:00', '16:00:00', 1)  -- Sábado 10:00 AM - 4:00 PM
    `);

    // 4. Bloqueo de Comida (1:00 PM a 2:00 PM)
    await pool.query(`DELETE FROM bloqueos_recurrentes`);
    await pool.query(`
      INSERT INTO bloqueos_recurrentes (motivo, dia_semana, hora_inicio, hora_fin, activo) VALUES
        ('Hora de comida general', NULL, '13:00:00', '14:00:00', 1)
    `);

    // 5. Doctores
    await pool.query(`DELETE FROM usuarios WHERE rol = 'empleado'`);
    await pool.query(`
      INSERT INTO usuarios (id, nombre, email, password, telefono, rol, activo) VALUES
        (10, 'Dra. Teresa Cabanillas Ochoa', 'teresa@dentalloquero.com', '$2b$10$abcdefghijklmnopqrstuu', '+526862255233', 'empleado', 1),
        (11, 'Dr. Especialista Ortodoncia (Doctor 2)', 'dr2@dentalloquero.com', '$2b$10$abcdefghijklmnopqrstuu', '+526862624315', 'empleado', 1)
      ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), telefono = VALUES(telefono)
    `);

    // 6. Matriz de especialidades
    await pool.query(`DELETE FROM empleado_servicios`);
    await pool.query(`
      INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES
        (10, 1), -- Dra. Teresa -> Limpieza
        (10, 2), -- Dra. Teresa -> Resina/obturación
        (11, 3), -- Doctor 2 -> Extracción Simple
        (11, 4)  -- Doctor 2 -> Ajuste Mensual de Ortodoncia
    `);

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ ¡Configuración de Dental Loquero cargada exitosamente en MariaDB!');
    process.exit(0);
  } catch (err) {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('❌ Error al cargar seed:', err.message);
    process.exit(1);
  }
}

runSeed();
