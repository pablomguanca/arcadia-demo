export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { token } = req.body || {};

  if (!token) {
    res.status(400).json({ success: false, error: 'Missing token' });
    return;
  }

  try {
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
    const passed = Boolean(data.success) && data.score >= 0.5;

    res.status(200).json({ success: passed, score: data.score ?? 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
}
