const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function isHumanRequest(token) {
  if (!token) return false;

  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY,
    response: token,
  });

  const googleResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await googleResponse.json();
  return Boolean(data.success) && data.score >= 0.5;
}

async function saveToBrevo(email, source) {
  const listId = Number(process.env.BREVO_LIST_ID);

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      email,
      listIds: listId ? [listId] : undefined,
      updateEnabled: true,
      attributes: { SOURCE: source || 'website' },
    }),
  });

  if (response.ok || response.status === 204) return true;

  const data = await response.json().catch(() => ({}));
  return data.code === 'duplicate_parameter';
}

const NOTIFY_TO = process.env.LEAD_NOTIFY_TO || 'oscarcavalli@gmail.com';

const SOURCE_LABELS = {
  'vistazo-tour-360': 'Tour 360° y brochure — página "Un vistazo a Arcadia"',
};

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

async function notifyNewLead(email, source) {
  const sender = process.env.BREVO_SENDER_EMAIL;
  if (!sender) return false;

  const label = escapeHtml(SOURCE_LABELS[source] || String(source || 'website').slice(0, 80));
  const safeEmail = escapeHtml(email);
  const fecha = escapeHtml(formatDate(new Date()));

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'Arcadia Art Residence', email: sender },
      to: [{ email: NOTIFY_TO }],
      replyTo: { email },
      subject: `Nuevo acceso al tour 360° — ${email}`,
      htmlContent:
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1A1A1A">' +
        '<h2 style="font-size:18px;margin:0 0 16px">Alguien desbloqueó el tour 360°</h2>' +
        '<table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse">' +
        `<tr><td style="border:1px solid #ddd"><strong>Email</strong></td><td style="border:1px solid #ddd"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>` +
        `<tr><td style="border:1px solid #ddd"><strong>Origen</strong></td><td style="border:1px solid #ddd">${label}</td></tr>` +
        `<tr><td style="border:1px solid #ddd"><strong>Fecha</strong></td><td style="border:1px solid #ddd">${fecha}</td></tr>` +
        '</table>' +
        '<p style="color:#666;font-size:13px;margin-top:16px">El contacto también quedó guardado en la lista de Brevo.</p>' +
        '</div>',
    }),
  });

  return response.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { email, token, source } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    res.status(400).json({ success: false, error: 'Email inválido' });
    return;
  }

  try {
    const isHuman = await isHumanRequest(token);
    if (!isHuman) {
      res.status(403).json({ success: false, error: 'Verificación anti-bot fallida' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const saved = await saveToBrevo(cleanEmail, source);
    if (!saved) throw new Error('Brevo save failed');

    // El aviso es informativo: si falla, el visitante igual accede al tour.
    await notifyNewLead(cleanEmail, source).catch(() => false);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'No se pudo guardar el email' });
  }
}
