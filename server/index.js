require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: ALLOWED_ORIGIN }));

app.post('/exchange', async (req, res) => {
  try {
    const { code, code_verifier, redirect_uri, client_id } = req.body || {};
    if (!code) return res.status(400).json({ error: 'missing_code' });

    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', client_id || process.env.GOOGLE_CLIENT_ID || '');
    params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET || '');
    if (code_verifier) params.append('code_verifier', code_verifier);
    if (redirect_uri) params.append('redirect_uri', redirect_uri);
    params.append('grant_type', 'authorization_code');

    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.json(data);
  } catch (err) {
    console.error('Exchange error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`OAuth proxy listening on ${port}`));
