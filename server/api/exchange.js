const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { code, code_verifier, redirect_uri, client_id } = req.body || {};
    if (!code) {
      res.status(400).json({ error: 'missing_code' });
      return;
    }

    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', client_id || process.env.GOOGLE_CLIENT_ID || '');
    if (process.env.GOOGLE_CLIENT_SECRET) {
      params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET);
    }
    if (code_verifier) {
      params.append('code_verifier', code_verifier);
    }
    if (redirect_uri) {
      params.append('redirect_uri', redirect_uri);
    }
    params.append('grant_type', 'authorization_code');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('OAuth exchange error', error);
    res.status(500).json({ error: 'server_error' });
  }
};

module.exports = handler;
