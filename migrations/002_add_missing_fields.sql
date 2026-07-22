-- ══════════════════════════════════════════════════════════════════
--  NEXUS-FLOW — Migración 002: Campos faltantes del formulario onboarding
--  Ejecutar: mysql -u root -p nexus_flow < migrations/002_add_missing_fields.sql
--
--  Cambios:
--    1. servicios      → agrega campo `precio`
--    2. bloqueos       → agrega soporte a bloqueos recurrentes (hora de comida diaria, etc.)
--    3. config_negocio → tabla nueva para configuración dinámica del bot
-- ══════════════════════════════════════════════════════════════════

USE nexus_flow;

-- ──────────────────────────────────────────────────────────────────
--  1. servicios: agregar campo precio
--     Sección 2.2 del formulario: "¿Tiene precio fijo? ¿El bot lo menciona?"
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE servicios
  ADD COLUMN precio DECIMAL(10,2) NULL AFTER descripcion,
  ADD COLUMN mostrar_precio TINYINT(1) NOT NULL DEFAULT 0 AFTER precio;

-- COMMENT:
--   precio        → Precio del servicio en pesos MXN (NULL = no aplica / variable)
--   mostrar_precio → 1 = el bot menciona el precio al mostrar servicios

-- ──────────────────────────────────────────────────────────────────
--  2. bloqueos: soporte a bloqueos recurrentes (sección 3.3 del formulario)
--
--  Problema original: fecha_inicio/fecha_fin son DATETIME absolutos.
--  Para "comida de 2pm a 3pm todos los días de la semana" habría que
--  insertar un registro por cada día del año → inmanejable.
--
--  Solución: agregar flag `recurrente` + campos de hora diaria + días de la semana.
--
--  Cuando recurrente = 0 → comportamiento original (fecha absoluta).
--  Cuando recurrente = 1:
--    - fecha_inicio / fecha_fin = rango de validez de la recurrencia (ej: todo el año 2026)
--    - hora_inicio_diaria / hora_fin_diaria = la hora que bloquea cada día
--    - dias_semana = días en que aplica, ej: "1,2,3,4,5" (Lun–Vie), "1,2,3,4,5,6" (Lun–Sáb)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE bloqueos
  ADD COLUMN recurrente       TINYINT(1)  NOT NULL DEFAULT 0          AFTER fecha_fin,
  ADD COLUMN hora_inicio_hora TIME        NULL                         AFTER recurrente,
  ADD COLUMN hora_fin_hora    TIME        NULL                         AFTER hora_inicio_hora,
  ADD COLUMN dias_semana      VARCHAR(20) NULL                         AFTER hora_fin_hora;

-- COMMENT:
--   recurrente        → 0 = bloqueo puntual (comportamiento anterior)
--                       1 = bloqueo recurrente por hora del día
--   hora_inicio_hora  → Hora de inicio diaria (ej: '14:00:00')  [solo si recurrente=1]
--   hora_fin_hora     → Hora de fin diaria    (ej: '15:00:00')  [solo si recurrente=1]
--   dias_semana       → Días que aplica como CSV: "1,2,3,4,5"   [solo si recurrente=1]
--                       0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

-- ──────────────────────────────────────────────────────────────────
--  3. config_negocio: tabla nueva para parámetros configurables del bot
--     Cubre secciones 3.4, 3.5, 4.2, 6.1, 6.3 del formulario onboarding.
--
--  Patrón clave-valor → fácil de extender sin nuevas migraciones.
--  El bot y la API leen esta tabla al arrancar.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_negocio (
  clave       VARCHAR(60)   NOT NULL,
  valor       VARCHAR(255)  NOT NULL,
  descripcion VARCHAR(255)  NULL,
  PRIMARY KEY (clave)
) ENGINE=InnoDB;

-- Valores por defecto (ajustar en el onboarding de cada cliente)
INSERT INTO config_negocio (clave, valor, descripcion) VALUES
  -- Sección 3.4: tiempo mínimo de anticipación para agendar
  ('MIN_BOOKING_HOURS',      '2',     'Horas mínimas de anticipación para agendar una cita'),
  -- Sección 3.5: días máximos a futuro para agendar
  ('MAX_BOOKING_DAYS',       '30',    'Días máximos en el futuro que el bot puede ofrecer'),
  -- Sección 4.2: si el cliente puede elegir con qué empleado quiere su cita
  ('EMPLOYEE_SELECTION',     'false', '¿El cliente puede elegir a su empleado? (true/false)'),
  -- Sección 6.1: anticipación mínima para cancelar una cita
  ('CANCEL_HOURS_LIMIT',     '24',    'Horas mínimas de anticipación para cancelar una cita'),
  -- Sección 6.3: ¿el bot ofrece reagendar al cancelar?
  ('OFFER_RESCHEDULE',       'true',  '¿El bot ofrece reagendar al cancelar? (true/false)'),
  -- Sección 5.2: nombre del asistente virtual
  ('BOT_NAME',               'Nexus', 'Nombre del asistente virtual'),
  -- Sección 5.3: frase de bienvenida personalizada
  ('BOT_WELCOME_MSG',        '',      'Frase de bienvenida personalizada (vacío = default del bot)');

-- ──────────────────────────────────────────────────────────────────
--  EJEMPLO: bloqueo recurrente de comida Lun–Vie 2pm–3pm todo 2026
-- ──────────────────────────────────────────────────────────────────
-- INSERT INTO bloqueos
--   (empleado_id, motivo, fecha_inicio, fecha_fin, recurrente, hora_inicio_hora, hora_fin_hora, dias_semana)
-- VALUES
--   (NULL, 'Comida', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1, '14:00:00', '15:00:00', '1,2,3,4,5');

-- ──────────────────────────────────────────────────────────────────
--  EJEMPLO: actualizar precio de servicios existentes
-- ──────────────────────────────────────────────────────────────────
-- UPDATE servicios SET precio = 350.00, mostrar_precio = 1 WHERE nombre = 'Consulta general';
-- UPDATE servicios SET precio = 700.00, mostrar_precio = 1 WHERE nombre = 'Limpieza dental';
