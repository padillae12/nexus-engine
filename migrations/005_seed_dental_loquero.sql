-- migrations/005_seed_dental_loquero.sql
-- Datos reales del cliente "Dental Loquero" extraídos del formulario de onboarding Plan Pro

USE nexus_flow;

-- 1. Configuración del negocio
INSERT INTO config_negocio (clave, valor) VALUES
  ('BOT_NAME', 'loqueron'),
  ('PLAN_TYPE', 'pro'),
  ('MIN_BOOKING_HOURS', '3'),
  ('MAX_BOOKING_DAYS', '30'),
  ('ADMIN_PIN', '21250'),
  ('BUSINESS_NAME', 'Dental Loquero'),
  ('BUSINESS_ADDRESS', 'Orozco y Berra 2229, 21250 Colonia Constitución'),
  ('OFFER_RESCHEDULE', 'true'),
  ('CANCEL_HOURS_LIMIT', '4')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- 2. Limpiar y registrar el catálogo oficial de servicios
DELETE FROM servicios;
INSERT INTO servicios (id, nombre, duracion_min, precio, activo) VALUES
  (1, 'Limpieza', 45, 500.00, 1),
  (2, 'Resina/obturación', 45, 800.00, 1),
  (3, 'Extracción Simple', 60, 1200.00, 1),
  (4, 'Ajuste Mensual de Ortodoncia', 30, 500.00, 1);

-- 3. Configurar horarios de atención de la clínica
DELETE FROM horarios_trabajo;
INSERT INTO horarios_trabajo (dia_semana, hora_inicio, hora_fin, activo) VALUES
  (0, '09:00:00', '14:00:00', 0), -- Domingo: Cerrado
  (1, '08:00:00', '18:00:00', 1), -- Lunes
  (2, '08:00:00', '18:00:00', 1), -- Martes
  (3, '08:00:00', '18:00:00', 1), -- Miércoles
  (4, '08:00:00', '18:00:00', 1), -- Jueves
  (5, '08:00:00', '18:00:00', 1), -- Viernes
  (6, '10:00:00', '16:00:00', 1); -- Sábado

-- 4. Registrar horario de comida/descanso general (1:00 PM a 2:00 PM)
DELETE FROM bloqueos_recurrentes;
INSERT INTO bloqueos_recurrentes (motivo, dia_semana, hora_inicio, hora_fin, activo) VALUES
  ('Hora de comida general', NULL, '13:00:00', '14:00:00', 1);

-- 5. Registrar Doctores y Especialistas
-- Eliminamos usuarios anteriores excepto admin si existe
DELETE FROM usuarios WHERE rol = 'empleado';

INSERT INTO usuarios (id, nombre, email, password, telefono, rol, activo) VALUES
  (10, 'Dra. Teresa Cabanillas Ochoa', 'teresa@dentalloquero.com', '$2b$10$abcdefghijklmnopqrstuu', '+526862255233', 'empleado', 1),
  (11, 'Dr. Especialista Ortodoncia (Doctor 2)', 'dr2@dentalloquero.com', '$2b$10$abcdefghijklmnopqrstuu', '+526862624315', 'empleado', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  telefono = VALUES(telefono),
  activo = VALUES(activo);

-- 6. Asignación de especialidades / matriz de servicios
DELETE FROM empleado_servicios;
INSERT INTO empleado_servicios (empleado_id, servicio_id) VALUES
  -- Dra. Teresa Cabanillas Ochoa (Limpieza, Resina/obturación)
  (10, 1),
  (10, 2),
  -- Doctor 2 (Extracción Simple, Ajuste Mensual de Ortodoncia)
  (11, 3),
  (11, 4);
