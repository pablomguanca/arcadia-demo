/**
 * Recibe el formulario de contacto del sitio. Reemplaza a FormSubmit.
 *
 * Hace tres cosas, en este orden y con distinta criticidad:
 *   1. Guarda el lead en la lista de Brevo, con nombre, teléfono y perfil.
 *   2. Le avisa a Arcadia de la consulta nueva (lo único que NO se puede perder).
 *   3. Le manda al interesado un mail de bienvenida.
 *
 * El alta va primero porque es el paso más barato y es el que captura el dato
 * que de otro modo se pierde: si después falla el aviso, al menos el mail quedó
 * en la lista. El mail de bienvenida va en try/catch aislado, porque que rebote
 * no es motivo para decirle al visitante que su consulta no llegó.
 *
 * Los envíos salen por Resend; Brevo solo guarda contactos.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   RECAPTCHA_SECRET_KEY  (obligatoria) Secret de reCAPTCHA v3.
 *   RESEND_API_KEY        (obligatoria) API key de Resend.
 *   CONTACT_FROM          (obligatoria) Remitente del subdominio verificado.
 *   BREVO_API_KEY         (opcional)    Sin ella no se suscribe a nadie.
 *   BREVO_LIST_ID         (opcional)    Lista donde caen los leads.
 *   LEAD_NOTIFY_TO        (opcional)    Destino del aviso. Varios separados por coma.
 *   LEAD_NOTIFY_BCC       (opcional)    Copia oculta para la agencia.
 */

import { verifyHuman } from './_lib/recaptcha.js';
import { sendEmail } from './_lib/resend.js';
import { upsertContact } from './_lib/brevo.js';
import { cleanMultiline, cleanText, formatDate } from './_lib/format.js';
import { leadNotificationEmail, welcomeEmail } from './_lib/emails.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,}$/;

const DEFAULT_NOTIFY_TO = 'oscarcavalli@gmail.com';

const PERFIL_LABELS = {
  vivir: 'Quiero vivir',
  invertir: 'Quiero invertir',
};

const ORIGEN_LABELS = {
  home: 'la home',
  contacto: 'la página de contacto',
};

// Cortafuegos best-effort contra envíos repetidos. Vercel puede levantar varias
// instancias, así que esto no es un rate limit exacto: frena el spam obvio desde
// una misma IP dentro de una instancia caliente, y nada más.
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const hits = new Map();

function recentHits(ip) {
  const now = Date.now();
  return (hits.get(ip) || []).filter((stamp) => now - stamp < RATE_LIMIT.windowMs);
}

function rateLimited(ip) {
  if (!ip) return false;
  return recentHits(ip).length >= RATE_LIMIT.max;
}

function recordHit(ip) {
  if (!ip) return;

  hits.set(ip, [...recentHits(ip), Date.now()]);

  if (hits.size > 500) {
    for (const key of hits.keys()) {
      if (!recentHits(key).length) hits.delete(key);
    }
  }
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '');
  return value.split(',')[0].trim();
}

function notifyRecipients(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  // Honeypot: los bots completan el campo oculto. Devolvemos éxito para no darles pistas.
  if (cleanText(body.website, 200)) {
    res.status(200).json({ success: true });
    return;
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.status(429).json({ success: false, error: 'Demasiados envíos seguidos. Probá de nuevo en unos minutos.' });
    return;
  }

  const nombre = cleanText(body.nombre, 120);
  const email = cleanText(body.email, 160).toLowerCase();
  const telefono = cleanText(body.telefono, 40);
  const perfil = cleanText(body.perfil, 20);
  const interes = cleanText(body.interes, 80);
  const origen = cleanText(body.origen, 40) || 'contacto';
  const mensaje = cleanMultiline(body.mensaje, 4000);

  const invalidos = [];
  if (!nombre) invalidos.push('nombre');
  if (!email || !EMAIL_PATTERN.test(email)) invalidos.push('email');
  if (!telefono || !PHONE_PATTERN.test(telefono)) invalidos.push('telefono');

  if (invalidos.length) {
    res.status(400).json({ success: false, error: 'Faltan datos o son inválidos.', campos: invalidos });
    return;
  }

  try {
    const veredicto = await verifyHuman(body.token);

    // Rechazo: Google dice que es un bot, se corta acá.
    if (veredicto === 'rejected') {
      res.status(403).json({ success: false, error: 'Verificación anti-bot fallida' });
      return;
    }

    // Avería: no pudimos verificar. Dejamos pasar la consulta igual — perder una
    // consulta real por un problema nuestro es peor que colar algún bot, y todavía
    // quedan el honeypot y el rate limit como red.
    if (veredicto === 'unavailable') {
      console.warn('[contact] reCAPTCHA no disponible, se deja pasar la consulta.');
    }

    const perfilLabel = PERFIL_LABELS[perfil] || perfil;
    const origenLabel = ORIGEN_LABELS[origen] || origen;

    // Primero el alta: si después falla el aviso, el mail igual quedó guardado.
    // El upsert es idempotente, así que un reintento del visitante no duplica nada.
    try {
      await upsertContact({
        email,
        attributes: {
          NOMBRE: nombre,
          TELEFONO: telefono,
          PERFIL: perfilLabel,
          INTERES: interes,
          SOURCE: `formulario-${origen}`,
        },
      });
    } catch (error) {
      console.error('[contact] No se pudo guardar el lead en Brevo:', error);
    }

    const filas = [
      { label: 'Nombre', value: nombre },
      { label: 'Email', value: email },
      { label: 'Teléfono', value: telefono },
      perfilLabel ? { label: 'Perfil', value: perfilLabel } : null,
      interes ? { label: 'Interés', value: interes } : null,
      mensaje ? { label: 'Mensaje', value: mensaje } : null,
    ].filter(Boolean);

    const aviso = leadNotificationEmail({
      nombre,
      origenLabel,
      fecha: formatDate(new Date()),
      filas,
    });

    const destinos = notifyRecipients('LEAD_NOTIFY_TO');
    const avisado = await sendEmail({
      to: destinos.length ? destinos : [DEFAULT_NOTIFY_TO],
      bcc: notifyRecipients('LEAD_NOTIFY_BCC'),
      replyTo: email,
      subject: aviso.subject,
      html: aviso.html,
      text: aviso.text,
    });

    // Si el aviso no salió, la consulta NO llegó. Decirle "gracias, la recibimos"
    // sería mentirle: que vea el error y el fallback de WhatsApp.
    if (!avisado) throw new Error('No se pudo enviar el aviso interno');

    recordHit(ip);

    // La consulta ya le llegó al cliente: de acá en más nada puede romper la respuesta.
    try {
      const bienvenida = welcomeEmail({ nombre: nombre.split(' ')[0] });

      await sendEmail({
        to: [email],
        replyTo: destinos[0] || DEFAULT_NOTIFY_TO,
        subject: bienvenida.subject,
        html: bienvenida.html,
        text: bienvenida.text,
      });
    } catch (error) {
      console.error('[contact] No se pudo enviar el mail de bienvenida:', error);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[contact] Falló el envío de la consulta:', error);
    res.status(502).json({ success: false, error: 'No pudimos enviar tu consulta.' });
  }
}
