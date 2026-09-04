/**
 * Gate del tour 360°: recibe el email, lo guarda en Brevo y le avisa a Arcadia.
 *
 * La regla de oro acá es distinguir RECHAZO de AVERÍA:
 *
 *   Rechazo → el envío está mal (email inválido, reCAPTCHA que da bot). Se
 *             responde error y el front NO desbloquea. La persona puede
 *             corregir y reintentar.
 *
 *   Avería  → algo nuestro se rompió (Brevo caído, API key mal cargada, Google
 *             sin responder). Se responde 200 con `saved: false` y el front
 *             desbloquea igual. El visitante no tiene la culpa, y dejarlo
 *             afuera nos hace perder el lead entero además del mail.
 *
 * En toda avería el mail se loguea con el prefijo [lead-perdido], así queda
 * recuperable a mano desde los logs de Vercel aunque no haya llegado a Brevo.
 *
 * Los envíos salen por Resend; Brevo solo guarda contactos.
 */

import { verifyHuman } from './_lib/recaptcha.js';
import { sendEmail } from './_lib/resend.js';
import { upsertContact } from './_lib/brevo.js';
import { formatDate } from './_lib/format.js';
import { tourAccessEmail } from './_lib/emails.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_NOTIFY_TO = 'oscarcavalli@gmail.com';

const SOURCE_LABELS = {
  'vistazo-tour-360': 'Tour 360° y brochure — página "Un vistazo a Arcadia"',
};

function notifyRecipients() {
  const destinos = String(process.env.LEAD_NOTIFY_TO || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  return destinos.length ? destinos : [DEFAULT_NOTIFY_TO];
}

/** Deja el lead en los logs para poder rescatarlo a mano cuando el guardado falló. */
function logLostLead(email, source, motivo) {
  console.error(`[lead-perdido] ${email} — origen: ${source || 'website'} — motivo: ${motivo}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { email, token, source } = req.body || {};

  // Rechazo: el dato está mal y la persona lo puede corregir.
  if (!email || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    res.status(400).json({ success: false, error: 'Email inválido' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const veredicto = await verifyHuman(token);

  // Rechazo: Google dice que es un bot.
  if (veredicto === 'rejected') {
    res.status(403).json({ success: false, error: 'Verificación anti-bot fallida' });
    return;
  }

  // Avería: no pudimos verificar. Seguimos igual, pero queda anotado.
  if (veredicto === 'unavailable') {
    console.warn('[save-lead] reCAPTCHA no disponible, se deja pasar el envío.');
  }

  try {
    const saved = await upsertContact({
      email: cleanEmail,
      attributes: { SOURCE: source || 'website' },
    });

    if (!saved) logLostLead(cleanEmail, source, 'Brevo rechazó el alta');

    const aviso = tourAccessEmail({
      email: cleanEmail,
      origenLabel: SOURCE_LABELS[source] || String(source || 'website').slice(0, 80),
      fecha: formatDate(new Date()),
    });

    // El aviso es informativo: si falla, el visitante igual accede al tour.
    await sendEmail({
      to: notifyRecipients(),
      replyTo: cleanEmail,
      subject: aviso.subject,
      html: aviso.html,
      text: aviso.text,
    }).catch(() => false);

    res.status(200).json({ success: true, saved });
  } catch (error) {
    // Avería: se rompió algo nuestro. El visitante entra igual y el mail queda
    // en los logs para recuperarlo.
    logLostLead(cleanEmail, source, error && error.message ? error.message : 'error inesperado');
    res.status(200).json({ success: true, saved: false });
  }
}
