-- ══════════════════════════════════════════════════════════════════
--  NEXUS-FLOW — Esquema Maestro de Base de Datos (MariaDB / MySQL)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS config_negocio (
  clave       VARCHAR(60)   NOT NULL,
  valor       VARCHAR(255)  NOT NULL,
  descripcion VARCHAR(255)  NULL,
  PRIMARY KEY (clave)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre              VARCHAR(100)    NOT NULL,
  email               VARCHAR(150)    NOT NULL UNIQUE,
  password            VARCHAR(255)    NOT NULL,
  telefono            VARCHAR(20)     NULL,
  rol                 ENUM('admin', 'encargado', 'empleado', 'doctor') NOT NULL DEFAULT 'empleado',
  especialidad        VARCHAR(100)    NULL,
  hora_inicio_comida  VARCHAR(10)     NULL,
  hora_fin_comida     VARCHAR(10)     NULL,
  activo              TINYINT(1)      NOT NULL DEFAULT 1,
  creado_en           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  telefono    VARCHAR(20)     NOT NULL UNIQUE,
  nombre      VARCHAR(100)    NULL,
  creado_en   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_telefono (telefono)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicios (
  id                    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre                VARCHAR(100)    NOT NULL,
  descripcion           TEXT            NULL,
  indicaciones_precita  TEXT            NULL,
  indicaciones_postcita TEXT            NULL,
  precio                DECIMAL(10,2)   NULL,
  mostrar_precio        TINYINT(1)      NOT NULL DEFAULT 1,
  duracion_min          SMALLINT        NOT NULL DEFAULT 60,
  activo                TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS horarios_trabajo (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  empleado_id         INT UNSIGNED    NULL,
  dia_semana          TINYINT         NOT NULL,
  hora_inicio         TIME            NOT NULL,
  hora_fin            TIME            NOT NULL,
  hora_inicio_comida  TIME            NULL,
  hora_fin_comida     TIME            NULL,
  activo              TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bloqueos (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  empleado_id       INT UNSIGNED  NULL,
  motivo            VARCHAR(100)  NOT NULL,
  fecha_inicio      DATETIME      NOT NULL,
  fecha_fin         DATETIME      NOT NULL,
  recurrente        TINYINT(1)    NOT NULL DEFAULT 0,
  hora_inicio_hora TIME          NULL,
  hora_fin_hora    TIME          NULL,
  dias_semana       VARCHAR(20)   NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS citas (
  id                            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  cliente_id                    INT UNSIGNED  NOT NULL,
  servicio_id                   INT UNSIGNED  NOT NULL,
  empleado_id                   INT UNSIGNED  NULL,
  fecha_inicio                  DATETIME      NOT NULL,
  fecha_fin                     DATETIME      NOT NULL,
  estado                        ENUM('pendiente', 'confirmada', 'cancelada', 'completada') NOT NULL DEFAULT 'confirmada',
  precio                        DECIMAL(10,2) NULL,
  paciente_nombre               VARCHAR(100)  NULL,
  notas                         TEXT          NULL,
  indicaciones_postcita         TEXT          NULL,
  recordatorio_mins             INT UNSIGNED  NOT NULL DEFAULT 120,
  recordatorio_enviado          TINYINT(1)    NOT NULL DEFAULT 0,
  notificacion_empleado_enviada TINYINT(1)    NOT NULL DEFAULT 0,
  creado_en                     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
  FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_fecha_inicio (fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS empleado_servicios (
  empleado_id INT UNSIGNED NOT NULL,
  servicio_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (empleado_id, servicio_id),
  FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
