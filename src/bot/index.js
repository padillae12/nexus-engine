// src/bot/index.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Punto de entrada
//  Inicializa whatsapp-web.js, muestra el QR y conecta con la FSM.
// ══════════════════════════════════════════════════════════════════

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const { handleMessage }     = require('./fsm');

// ─────────────────────────────────────────────────────────────────
//  CLIENTE DE WHATSAPP
//  LocalAuth guarda la sesión en disco → no necesitas escanear el
//  QR cada vez que reinicias el bot.
// ─────────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth', // carpeta donde se guarda la sesión
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // importante en VPS con poca RAM
      '--disable-gpu',
    ],
  },
});

// ─────────────────────────────────────────────────────────────────
//  EVENTOS
// ─────────────────────────────────────────────────────────────────

/** Se dispara cuando WhatsApp pide autenticación → muestra QR en terminal */
client.on('qr', (qr) => {
  console.log('\n══════════════════════════════════════');
  console.log('  📱 ESCANEA ESTE QR CON WHATSAPP');
  console.log('══════════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
});

/** Se dispara cuando la autenticación fue exitosa */
client.on('authenticated', () => {
  console.log('🔐 WhatsApp autenticado correctamente.');
});

/** Se dispara cuando el cliente está listo para recibir mensajes */
client.on('ready', () => {
  console.log('✅ Nexus-Engine conectado y escuchando mensajes...\n');
});

/** Se dispara cuando hay un error de autenticación */
client.on('auth_failure', (msg) => {
  console.error('❌ Error de autenticación:', msg);
  process.exit(1);
});

/** Se dispara cuando el cliente se desconecta */
client.on('disconnected', (reason) => {
  console.warn('⚠️  WhatsApp desconectado:', reason);
  // PM2 reiniciará el proceso automáticamente en el VPS
});

// ─────────────────────────────────────────────────────────────────
//  PROCESAMIENTO DE MENSAJES ENTRANTES
// ─────────────────────────────────────────────────────────────────

client.on('message', async (message) => {
  // Ignorar mensajes de grupos, estados y del propio bot
  if (message.from.endsWith('@g.us'))  return; // grupo
  if (message.from.endsWith('@broadcast')) return; // broadcast
  if (message.isStatus)               return; // estado de WhatsApp
  if (!message.body || message.body.trim() === '') return; // vacío

  const telefono = message.from; // ej: "526789012345@c.us"
  const texto    = message.body.trim();

  console.log(`📩 [${new Date().toLocaleTimeString()}] ${telefono}: ${texto}`);

  try {
    // Pasar el mensaje a la FSM y obtener la respuesta
    const respuesta = await handleMessage(telefono, texto);

    if (respuesta) {
      await message.reply(respuesta);
      console.log(`📤 Respuesta enviada a ${telefono}`);
    }
  } catch (error) {
    console.error(`❌ Error procesando mensaje de ${telefono}:`, error);

    // Mensaje genérico de error al usuario para no romper la experiencia
    await message.reply(
      '😔 Ocurrió un error inesperado. Por favor intenta de nuevo en un momento.\n\n' +
      'Si el problema persiste, escribe *"reiniciar"*.'
    );
  }
});

// ─────────────────────────────────────────────────────────────────
//  ARRANQUE
// ─────────────────────────────────────────────────────────────────

console.log('🚀 Iniciando Nexus-Engine...');
client.initialize();
