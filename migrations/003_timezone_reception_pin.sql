-- ══════════════════════════════════════════════════════════════════
--  NEXUS-FLOW — Migración 003: Zona horaria y PIN de recepcionista
--  Ejecutar: mysql -u nexus_user -p'PadAlex01' nexus_flow < migrations/003_timezone_reception_pin.sql
--
--  Cambios:
--    1. config_negocio → agrega clave TIMEZONE (zona horaria del negocio)
--    2. config_negocio → agrega clave RECEPTION_PIN (PIN para recepcionistas)
-- ══════════════════════════════════════════════════════════════════

USE nexus_flow;

-- ──────────────────────────────────────────────────────────────────
--  1. TIMEZONE — Zona horaria del negocio
--
--  El bot usará esta zona para mostrar fechas y horas correctas.
--  Valores comunes México:
--    America/Hermosillo   → Sonora (UTC-7, sin cambio de horario)
--    America/Tijuana      → Baja California (UTC-7/-8)
--    America/Mazatlan     → Sinaloa, Nayarit (UTC-6/-7)
--    America/Mexico_City  → Centro del país (UTC-6/-5)
--    America/Monterrey    → Noreste (UTC-6/-5)
-- ──────────────────────────────────────────────────────────────────
INSERT IGNORE INTO config_negocio (clave, valor, descripcion) VALUES
  ('TIMEZONE', 'America/Hermosillo',
   'Zona horaria del negocio. Ver lista en: https://momentjs.com/timezone/');

-- ──────────────────────────────────────────────────────────────────
--  2. RECEPTION_PIN — PIN de acceso para recepcionistas
--
--  Almacenado como hash bcrypt igual que ADMIN_PIN.
--  Se configura durante el onboarding con el script de setup.
--  Valor vacío = no configurado aún.
-- ──────────────────────────────────────────────────────────────────
INSERT IGNORE INTO config_negocio (clave, valor, descripcion) VALUES
  ('RECEPTION_PIN', '',
   'Hash bcrypt del PIN de recepcionista para la Nexus-App (vacío = no configurado)');

-- ──────────────────────────────────────────────────────────────────
--  Verificar resultado
-- ──────────────────────────────────────────────────────────────────
SELECT clave, valor, descripcion
FROM config_negocio
WHERE clave IN ('TIMEZONE', 'RECEPTION_PIN', 'ADMIN_PIN')
ORDER BY clave;
