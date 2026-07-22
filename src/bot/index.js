// src/bot/index.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Punto de entrada (whatsapp-web.js)
//
//  Usa la librería whatsapp-web.js (Puppeteer) para conectarse a
//  WhatsApp Web como si fuera un cliente real. Al escanear el
//  código QR, el número queda vinculado y el bot responde mensajes.
//
//  Flujo:
//    Cliente envía mensaje → evento 'message' → handleMessage(FSM)
//                                              → msg.reply(respuesta)
// ══════════════════════════════════════════════════════════════════

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const { handleMessage }     = require('./fsm');

// ─────────────────────────────────────────────────────────────────
//  CLIENTE DE WHATSAPP
//  LocalAuth guarda la sesión en .wwebjs_auth para no tener que
//  escanear el QR cada vez que se reinicia el proceso.
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
//  QR — solo aparece la primera vez (o si expira la sesión)
// ─────────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  console.log('📱 Escanea el código QR con WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// ─────────────────────────────────────────────────────────────────
//  LISTO — sesión restaurada o QR escaneado
// ─────────────────────────────────────────────────────────────────
client.on('ready', () => {
  console.log('✅ Nexus-Engine conectado a WhatsApp.');
  console.log('🤖 Bot activo y escuchando mensajes...');
});

// ─────────────────────────────────────────────────────────────────
//  MENSAJE ENTRANTE
//  Solo procesamos mensajes de texto que NO vengan del propio bot.
// ─────────────────────────────────────────────────────────────────
client.on('message', async (msg) => {
  // Ignorar mensajes propios o de grupos
  if (msg.fromMe) return;
  if (msg.from.endsWith('@g.us')) return; // grupos

  const texto    = msg.body?.trim();
  const telefono = msg.from; // Ej: "5216861234567@c.us"

  if (!texto) return;

  console.log(`📩 [${new Date().toLocaleTimeString()}] ${telefono}: ${texto}`);

  try {
    const respuesta = await handleMessage(telefono, texto);

    if (respuesta) {
      await msg.reply(respuesta);
      console.log(`📤 Respuesta enviada a ${telefono}`);
    }
  } catch (error) {
    console.error(`❌ Error procesando mensaje de ${telefono}:`, error);

    await msg.reply(
      '😔 Ocurrió un error inesperado. Por favor intenta de nuevo en un momento.\n\n' +
      'Si el problema persiste, escribe *"reiniciar"*.'
    ).catch(() => {});
  }
});

// ─────────────────────────────────────────────────────────────────
//  DESCONEXIÓN — registrar y salir para que PM2 lo reinicie
// ─────────────────────────────────────────────────────────────────
client.on('disconnected', (reason) => {
  console.warn('⚠️  WhatsApp desconectado:', reason);
  process.exit(1); // PM2 lo reiniciará automáticamente
});

// ─────────────────────────────────────────────────────────────────
//  ARRANQUE
// ─────────────────────────────────────────────────────────────────
client.initialize();
console.log('🚀 Nexus-Engine iniciando...');
