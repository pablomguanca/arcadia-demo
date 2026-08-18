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

    const saved = await saveToBrevo(email.trim().toLowerCase(), source);
    if (!saved) throw new Error('Brevo save failed');

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'No se pudo guardar el email' });
  }
}
