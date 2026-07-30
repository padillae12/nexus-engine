-- Migration 006: Add employee break/lunch time columns
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS hora_inicio_comida VARCHAR(10) NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS hora_fin_comida VARCHAR(10) NULL;
