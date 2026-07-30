// src/bot/facebookAdapter.js
// ══════════════════════════════════════════════════════════════════
//  NEXUS-ENGINE — Adaptador para Facebook Messenger e Instagram Direct
// ══════════════════════════════════════════════════════════════════

/**
 * Envía un mensaje de texto a un usuario en Facebook Messenger o Instagram Direct
 * utilizando la Graph API oficial de Meta.
 * 
 * @param {string} recipientId - PSID de Facebook o IGSID de Instagram
 * @param {string} text - Texto del mensaje a enviar
 */
async function sendFacebookMessage(recipientId, text) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) {
    console.warn('⚠️ [Meta API] FB_PAGE_ACCESS_TOKEN no está configurado en .env');
    return false;
  }

  if (!recipientId || !text) return false;

  const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text: text },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [Meta API Error]', data.error ? data.error.message : data);
      return false;
    }

    console.log(`💙 [Meta Messenger] Mensaje enviado a ${recipientId}`);
    return true;
  } catch (err) {
    console.error('❌ [Meta API Fetch Error]', err.message);
    return false;
  }
}

module.exports = {
  sendFacebookMessage,
};
