// src/api/facebookWebhook.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Webhook Handler para Facebook Messenger & Instagram Direct
// ══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { handleMessage } = require('../bot/fsm');
const { sendFacebookMessage } = require('../bot/facebookAdapter');

/**
 * GET /api/webhooks/facebook
 * Punto de enlace de verificación (Handshake) enviado por Meta Developer Portal.
 */
router.get('/webhooks/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedVerifyToken = process.env.FB_VERIFY_TOKEN || 'nexus_secret_verify_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedVerifyToken) {
      console.log('✅ [Meta Webhook] Verificación de handshake exitosa.');
      return res.status(200).send(challenge);
    } else {
      console.warn('⚠️ [Meta Webhook] Token de verificación inválido:', token);
      return res.sendStatus(403);
    }
  }

  res.sendStatus(400);
});

/**
 * POST /api/webhooks/facebook
 * Recibe eventos en tiempo real de Facebook Messenger e Instagram Direct.
 */
router.post('/webhooks/facebook', async (req, res) => {
  const body = req.body;

  // Responder 200 OK inmediatamente a Meta para evitar retries
  res.status(200).send('EVENT_RECEIVED');

  if (body.object === 'page' || body.object === 'instagram') {
    if (Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const messagingEvents = entry.messaging || entry.standby || [];
        for (const event of messagingEvents) {
          if (event.message && event.message.text && !event.message.is_echo) {
            const senderId = event.sender?.id;
            const text = event.message.text.trim();

            if (senderId && text) {
              console.log(`💬 [Meta Webhook] Mensaje recibido de ${senderId}: "${text}"`);

              // Identificador único para la FSM: ej. "fb_123456789"
              const userKey = `fb_${senderId}`;

              try {
                // Procesar el mensaje en la Máquina de Estados (FSM)
                const respuesta = await handleMessage(userKey, text);

                if (respuesta) {
                  await sendFacebookMessage(senderId, respuesta);
                }
              } catch (err) {
                console.error(`❌ [Meta Webhook Error] al procesar mensaje de ${senderId}:`, err.message);
              }
            }
          }
        }
      }
    }
  }
});

module.exports = router;
