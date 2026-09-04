/**
 * Envío de mail transaccional por Resend.
 *
 * Resend manda; Brevo solo guarda contactos. La separación es a propósito: los
 * envíos de campaña juntan quejas de spam, y no queremos que eso arrastre la
 * reputación del mail que SÍ tiene que llegar —el aviso de consulta nueva—.
 *
 * Variables de entorno:
 *   RESEND_API_KEY  (obligatoria) API key de Resend.
 *   CONTACT_FROM    (obligatoria) Remitente, del subdominio verificado. Por
 *                   ejemplo: Arcadia Art Residence <hola@envios.arcadiaartresidence.com.ar>
 */

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * Devuelve false —sin tirar— ante cualquier problema, y lo deja logueado.
 * Quien llama decide si eso es grave: para el aviso al cliente lo es, para el
 * mail de bienvenida no.
 */
export async function sendEmail({ to, bcc, replyTo, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;

  if (!apiKey) {
    console.error('[resend] Falta RESEND_API_KEY: no se envió', JSON.stringify(subject));
    return false;
  }

  // Sin remitente propio Resend cae a una dirección de prueba que solo entrega
  // al dueño de la cuenta, así que el mail a un lead real se pierde en silencio.
  // Preferimos fallar de forma visible.
  if (!from) {
    console.error('[resend] Falta CONTACT_FROM: no se envió', JSON.stringify(subject));
    return false;
  }

  const payload = { from, to, subject, html };

  if (bcc && bcc.length) payload.bcc = bcc;
  if (replyTo) payload.reply_to = replyTo;
  if (text) payload.text = text;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[resend] Respondió', response.status, await response.text().catch(() => ''));
      return false;
    }

    return true;
  } catch (error) {
    console.error('[resend] Error de red:', error);
    return false;
  }
}
