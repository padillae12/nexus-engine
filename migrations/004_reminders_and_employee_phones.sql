-- 004_reminders_and_employee_phones.sql
-- Agrega columna telefono a usuarios (empleados/admin)
-- Agrega campos de recordatorios y notificaciones a la tabla citas

USE nexus_flow;

-- Columna telefono en usuarios (si no existe)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) NULL;

-- Columnas de recordatorio en citas (si no existen)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS recordatorio_mins INT UNSIGNED NOT NULL DEFAULT 120;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS recordatorio_enviado TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notificacion_empleado_enviada TINYINT(1) NOT NULL DEFAULT 0;
