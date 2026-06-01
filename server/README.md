# OAuth Proxy

Simple server that exchanges Google OAuth authorization `code` for tokens using a server-side `client_secret`.

Deploy to Vercel, Netlify Functions, or any small Node host. Set environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_ORIGIN` (optional, defaults to allow all)

Endpoints:
- `POST /exchange` JSON body: `{ code, code_verifier?, redirect_uri, client_id? }` returns Google's token JSON response.

Security:
- Keep `GOOGLE_CLIENT_SECRET` private (do not commit `.env`).

Vercel deployment:
- Create a Vercel project using this `server/` folder as the root.
- Set Environment Variables in Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_ORIGIN`.
- The proxy endpoint will be available at `/exchange` on your Vercel deployment.
