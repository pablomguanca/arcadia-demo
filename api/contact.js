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
  inversores: 'la landing de inversores',
  compradores: 'la landing de compradores',
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

const CAMPAIGN_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

/** Resume la atribución que manda la landing en una sola línea del aviso. */
function campaignSummary(body) {
  return CAMPAIGN_FIELDS
    .map((clave) => {
      const valor = cleanText(body[clave], 120);
      return valor ? `${clave.replace('utm_', '')}: ${valor}` : null;
    })
    .filter(Boolean)
    .join(' · ');
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
  // /compradores pide el WhatsApp en el paso 1 y el email recién después, como
  // opcional: el teléfono llega bajo otro nombre y puede venir sin email.
  const telefono = cleanText(body.telefono || body.whatsapp, 40);
  const perfil = cleanText(body.perfil, 20);
  const respuestas = typeof body.respuestas === 'object' && body.respuestas ? body.respuestas : {};

  // Las landings de pauta mandan las respuestas anidadas en `respuestas`; los
  // formularios del sitio institucional mandan `interes` suelto desde la URL.
  const interes = cleanText(respuestas.interes || body.interes, 80);
  const plazo = cleanText(respuestas.plazo || body.plazo, 60);
  const experiencia = cleanText(respuestas.experiencia || body.experiencia, 20);
  const origen = cleanText(body.origen, 40) || 'contacto';
  const mensaje = cleanMultiline(body.mensaje, 4000);

  const estado = cleanText(body.estado, 20);
  const segmento = cleanText(body.segmento, 20);
  const tier = cleanText(body.tier, 20);
  const score = Number.isFinite(Number(body.score)) ? Number(body.score) : null;
  const consintio = body.consentimiento === true;
  const campana = campaignSummary(body);

  const invalidos = [];
  if (!nombre) invalidos.push('nombre');
  if (email && !EMAIL_PATTERN.test(email)) invalidos.push('email');
  if (telefono && !PHONE_PATTERN.test(telefono)) invalidos.push('telefono');
  // Antes el email era obligatorio siempre. Ahora alcanza con un canal de
  // contacto: sin esto, el lead parcial de /compradores —que todavía no dio
  // email— se perdería, que es justo lo que ese paso viene a evitar.
  if (!email && !telefono) invalidos.push('contacto');

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
    const origenBase = ORIGEN_LABELS[origen] || origen;
    const origenLabel = estado === 'parcial' ? `${origenBase} (dato parcial)` : origenBase;

    // Brevo indexa por email: sin email no hay a quién dar de alta. El lead sin
    // email igual llega por el aviso interno, que es el canal que no se pierde.
    if (email) {
      // Primero el alta: si después falla el aviso, el mail igual quedó guardado.
      // El upsert es idempotente, así que un reintento del visitante no duplica nada.
      try {
        await upsertContact({
          email,
          attributes: {
            NOMBRE: nombre,
            TELEFONO: telefono,
            PERFIL: perfilLabel,
            // La calificación viaja dentro de INTERES y no como atributos nuevos:
            // si Brevo rechaza un atributo que todavía no existe en la cuenta, el
            // upsert reintenta sin ninguno y se pierden también nombre y teléfono.
            INTERES: [
              interes,
              plazo && `Plazo: ${plazo}`,
              experiencia && `Ya invirtió: ${experiencia}`,
              respuestas.tipologia && `Tipología: ${cleanText(respuestas.tipologia, 40)}`,
              respuestas.cuando && `Cuándo: ${cleanText(respuestas.cuando, 40)}`,
              tier && `Tier: ${tier}`,
            ]
              .filter(Boolean)
              .join(' · ')
              .slice(0, 250),
            SOURCE: `formulario-${origen}`,
          },
        });
      } catch (error) {
        console.error('[contact] No se pudo guardar el lead en Brevo:', error);
      }
    }

    const filas = [
      { label: 'Nombre', value: nombre },
      email ? { label: 'Email', value: email } : null,
      telefono ? { label: 'Teléfono', value: telefono } : null,
      perfilLabel ? { label: 'Perfil', value: perfilLabel } : null,
      segmento ? { label: 'Segmento', value: segmento } : null,
      interes ? { label: 'Interés', value: interes } : null,
      plazo ? { label: 'Plazo', value: plazo } : null,
      experiencia ? { label: 'Ya invirtió', value: experiencia } : null,
      respuestas.tipologia ? { label: 'Tipología', value: cleanText(respuestas.tipologia, 60) } : null,
      respuestas.cuando ? { label: 'Cuándo compra', value: cleanText(respuestas.cuando, 60) } : null,
      respuestas.entrada ? { label: 'Entrada', value: cleanText(respuestas.entrada, 60) } : null,
      respuestas.pago ? { label: 'Forma de pago', value: cleanText(respuestas.pago, 60) } : null,
      tier ? { label: 'Tier', value: score === null ? tier : `${tier} (${score}/9)` } : null,
      consintio ? { label: 'Consentimiento', value: 'Sí' } : null,
      campana ? { label: 'Campaña', value: campana } : null,
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
      replyTo: email || undefined,
      subject: aviso.subject,
      html: aviso.html,
      text: aviso.text,
    });

    // Si el aviso no salió, la consulta NO llegó. Decirle "gracias, la recibimos"
    // sería mentirle: que vea el error y el fallback de WhatsApp.
    if (!avisado) throw new Error('No se pudo enviar el aviso interno');

    recordHit(ip);

    // La consulta ya le llegó al cliente: de acá en más nada puede romper la respuesta.
    // El lead parcial no recibe bienvenida: todavía está completando el formulario
    // y un mail en mitad del flujo lo distrae de terminarlo.
    if (!email || estado === 'parcial') {
      res.status(200).json({ success: true });
      return;
    }

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
