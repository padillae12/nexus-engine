// scripts/fix_pins.js
// ══════════════════════════════════════════════════════════════════
//  Regenera los hashes bcrypt de ADMIN_PIN y RECEPTION_PIN
//  en la tabla config_negocio.
//
//  Uso: node scripts/fix_pins.js
// ══════════════════════════════════════════════════════════════════

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('../src/db/pool');

const SALT_ROUNDS = 10;

// ── Configura los PINs aquí ───────────────────────────────────────
const ADMIN_PIN      = '21250';
const RECEPTION_PIN  = '2229';

async function fixPins() {
  console.log('🔐 Generando hashes bcrypt...');

  const adminHash      = await bcrypt.hash(ADMIN_PIN, SALT_ROUNDS);
  const receptionHash  = await bcrypt.hash(RECEPTION_PIN, SALT_ROUNDS);

  console.log(`  ADMIN_PIN (${ADMIN_PIN})      → ${adminHash.length} chars ✅`);
  console.log(`  RECEPTION_PIN (${RECEPTION_PIN}) → ${receptionHash.length} chars ✅`);

  console.log('\n💾 Actualizando config_negocio en MariaDB...');

  await pool.execute(
    "UPDATE config_negocio SET valor = ? WHERE clave = 'ADMIN_PIN'",
    [adminHash]
  );
  await pool.execute(
    "UPDATE config_negocio SET valor = ? WHERE clave = 'RECEPTION_PIN'",
    [receptionHash]
  );

  // Verificar
  const [rows] = await pool.execute(
    "SELECT clave, LENGTH(valor) AS len FROM config_negocio WHERE clave IN ('ADMIN_PIN','RECEPTION_PIN')"
  );

  console.log('\n✅ Resultado:');
  rows.forEach(r => console.log(`  ${r.clave}: ${r.len} chars (esperado: 60)`));

  await pool.end();
  console.log('\n🎉 Listo. Reinicia nexus-api con: pm2 restart nexus-api');
}

fixPins().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
