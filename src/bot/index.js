// src/bot/index.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Punto de entrada (whatsapp-web.js)
//
//  Estrategia de sesión:
//    · Ctrl+C / SIGTERM  → destroy() sin logout → sesión OK en disco
//                          → próximo arranque NO pide QR
//    · LOGOUT (desvinculación manual) → limpia sesión en disco + exit(1)
//                          → PM2 reinicia → muestra QR nuevo
//    · Desconexión de red  → exit(1) → PM2 reinicia → restaura sesión
// ══════════════════════════════════════════════════════════════════

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const fs                    = require('fs');
const path                  = require('path');
const { handleMessage }     = require('./fsm');

// ─────────────────────────────────────────────────────────────────
//  Ruta de la sesión guardada por LocalAuth
// ─────────────────────────────────────────────────────────────────
const AUTH_DIR = path.join(process.cwd(), '.wwebjs_auth');

function limpiarSesion() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log('🧹 Sesión anterior eliminada.');
    }
  } catch (e) {
    console.warn('⚠️  No se pudo limpiar la sesión:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────
//  CLIENTE DE WHATSAPP
// ─────────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  },
});

// ─────────────────────────────────────────────────────────────────
//  QR — solo cuando no hay sesión guardada
// ─────────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  console.log('\n📱 Escanea el código QR con WhatsApp para vincular el número:');
  qrcode.generate(qr, { small: true });
});

// ─────────────────────────────────────────────────────────────────
//  LISTO
// ─────────────────────────────────────────────────────────────────
client.on('ready', () => {
  console.log('✅ Nexus-Engine conectado a WhatsApp.');
  console.log('🤖 Bot activo y escuchando mensajes...\n');
});

// ─────────────────────────────────────────────────────────────────
//  MENSAJE ENTRANTE
// ─────────────────────────────────────────────────────────────────
client.on('message_create', async (msg) => {
  if (msg.from.endsWith('@g.us')) return; // Ignorar grupos

  // Si el mensaje viene de mí mismo y NO es un chat enviado a mí mismo, ignorar
  if (msg.fromMe && msg.to !== msg.from) return;

  const texto    = msg.body?.trim();
  const telefono = msg.fromMe ? msg.to : msg.from;
  if (!texto) return;

  console.log(`📩 [${new Date().toLocaleTimeString()}] ${telefono}: ${texto}`);

  try {
    const respuesta = await handleMessage(telefono, texto);
    if (respuesta) {
      await client.sendMessage(telefono, respuesta);
      console.log(`📤 Respuesta enviada a ${telefono}`);
    }
  } catch (error) {
    console.error(`❌ Error procesando mensaje de ${telefono}:`, error);
    await client.sendMessage(
      telefono,
      '😔 Ocurrió un error inesperado. Intenta de nuevo.\n\nEscribe *"reiniciar"* si el problema persiste.'
    ).catch(() => {});
  }
});

// ─────────────────────────────────────────────────────────────────
//  DESCONEXIÓN
// ─────────────────────────────────────────────────────────────────
client.on('disconnected', (reason) => {
  console.warn(`\n⚠️  WhatsApp desconectado. Razón: ${reason}`);

  if (reason === 'LOGOUT') {
    // Número desvinculado manualmente → limpiar sesión corrupta
    // PM2 reiniciará el proceso y mostrará QR nuevo
    console.log('🔄 Sesión cerrada por el usuario. Limpiando y reiniciando para mostrar QR nuevo...');
    limpiarSesion();
  } else {
    console.log('🔁 Desconexión inesperada. Reiniciando...');
  }

  process.exit(1); // PM2 lo reinicia automáticamente
});

// ─────────────────────────────────────────────────────────────────
//  CIERRE GRACEFUL — Ctrl+C o señal de PM2 stop
//  Cierra Puppeteer SIN hacer logout → sesión se conserva en disco
// ─────────────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n⏹  Señal ${signal} recibida. Cerrando sin hacer logout...`);
  try {
    await client.destroy();
  } catch {}
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─────────────────────────────────────────────────────────────────
//  ARRANQUE
// ─────────────────────────────────────────────────────────────────
console.log('🚀 Nexus-Engine iniciando...');
client.initialize();
