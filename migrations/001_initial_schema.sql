-- ══════════════════════════════════════════════════════════════════
--  NEXUS-FLOW — Schema inicial de la base de datos (MySQL)
--  Ejecutar: mysql -u root -p nexus_flow < migrations/001_initial_schema.sql
-- ══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS nexus_flow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nexus_flow;

-- ──────────────────────────────────────────────────────────────────
--  TABLA: usuarios
--  Almacena al dueño (admin), encargados y empleados del negocio.
--  El Componente B (Dashboard) usará esta tabla para el login.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)    NOT NULL,
  email       VARCHAR(150)    NOT NULL UNIQUE,
  password    VARCHAR(255)    NOT NULL,               -- hash bcrypt
  rol         ENUM('admin', 'encargado', 'empleado') NOT NULL DEFAULT 'empleado',
  activo      TINYINT(1)      NOT NULL DEFAULT 1,
  creado_en   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────────────────────────
--  TABLA: clientes
--  Registro automático de cada número que escribe al bot.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  telefono    VARCHAR(20)     NOT NULL UNIQUE,         -- ej: +526789012345
  nombre      VARCHAR(100)    NULL,                    -- se captura en el flujo
  creado_en   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_telefono (telefono)
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────────────────────────
--  TABLA: servicios
--  Catálogo de servicios que ofrece el negocio.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(100)    NOT NULL,
  descripcion   TEXT            NULL,
  duracion_min  SMALLINT        NOT NULL DEFAULT 60, -- duración en minutos
  activo        TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────────────────────────
--  TABLA: horarios_trabajo
--  Define los días y horas en que opera el negocio.
--  empleado_id = NULL → aplica al negocio completo (horario global).
--  empleado_id = X   → aplica específicamente a ese empleado.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios_trabajo (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  empleado_id   INT UNSIGNED    NULL,                  -- NULL = horario global
  dia_semana    TINYINT         NOT NULL,               -- 0=Domingo … 6=Sábado
  hora_inicio   TIME            NOT NULL,               -- ej: 09:00:00
  hora_fin      TIME            NOT NULL,               -- ej: 18:00:00
  PRIMARY KEY (id),
  FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────────────────────────
--  TABLA: bloqueos
--  Días festivos, tiempo de comida, vacaciones, etc.
--  Una entrada en esta tabla = ese rango NO está disponible.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bloqueos (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  empleado_id   INT UNSIGNED    NULL,                  -- NULL = bloqueo global
  motivo        VARCHAR(100)    NOT NULL,               -- ej: "Comida", "Festivo"
  fecha_inicio  DATETIME        NOT NULL,
  fecha_fin     DATETIME        NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────────────────────────
--  TABLA: citas
--  El registro central de todas las citas agendadas por el bot.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citas (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  cliente_id    INT UNSIGNED    NOT NULL,
  servicio_id   INT UNSIGNED    NOT NULL,
  empleado_id   INT UNSIGNED    NULL,                  -- quién atenderá
  fecha_inicio  DATETIME        NOT NULL,               -- fecha y hora exacta de la cita
  fecha_fin     DATETIME        NOT NULL,               -- calculado: fecha_inicio + duracion_min
  estado        ENUM('pendiente', 'confirmada', 'cancelada', 'completada')
                NOT NULL DEFAULT 'confirmada',
  notas         TEXT            NULL,
  creado_en     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id)   REFERENCES clientes(id),
  FOREIGN KEY (servicio_id)  REFERENCES servicios(id),
  FOREIGN KEY (empleado_id)  REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Evita que un empleado tenga dos citas al mismo tiempo:
  UNIQUE KEY uq_empleado_slot (empleado_id, fecha_inicio)
) ENGINE=InnoDB;

-- ══════════════════════════════════════════════════════════════════
--  DATOS DE EJEMPLO — ajusta a tu negocio real
-- ══════════════════════════════════════════════════════════════════

-- Usuario administrador inicial (password: 'nexus123' — cámbialo en producción)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
  ('Admin', 'admin@minegocio.com', '$2b$10$placeholder_hash_cambia_esto', 'admin');

-- Servicios de ejemplo (un consultorio dental)
INSERT INTO servicios (nombre, descripcion, duracion_min) VALUES
  ('Consulta general',  'Revisión y diagnóstico',         30),
  ('Limpieza dental',   'Limpieza y pulido profesional',  60),
  ('Extracción simple', 'Extracción de pieza dental',     45),
  ('Ortodoncia',        'Revisión de aparato',            20);

-- Horario de trabajo (Lunes a Viernes, 9am–6pm) — global (empleado_id = NULL)
INSERT INTO horarios_trabajo (empleado_id, dia_semana, hora_inicio, hora_fin) VALUES
  (NULL, 1, '09:00:00', '18:00:00'),   -- Lunes
  (NULL, 2, '09:00:00', '18:00:00'),   -- Martes
  (NULL, 3, '09:00:00', '18:00:00'),   -- Miércoles
  (NULL, 4, '09:00:00', '18:00:00'),   -- Jueves
  (NULL, 5, '09:00:00', '18:00:00');   -- Viernes

-- Bloqueo de ejemplo: comida de 2pm a 3pm todos los días (un bloqueo por fecha específica)
INSERT INTO bloqueos (empleado_id, motivo, fecha_inicio, fecha_fin) VALUES
  (NULL, 'Comida', '2026-04-04 14:00:00', '2026-04-04 15:00:00');
