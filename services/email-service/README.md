# Email Service

Sends transactional emails (password reset, etc.) for LocalKnowledge. Uses nodemailer with SMTP, MailHog (local), or Ethereal (dev fallback).

**Port:** 5009

## Endpoints

- `GET /health` – Health check
- `GET /status` – Whether email is configured
- `POST /send-password-reset` – Send password reset email (body: `{ email, resetToken, baseUrl? }`)

## Environment

- `PORT` – Default 5009
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` – Production SMTP
- `MAILHOG_HOST`, `MAILHOG_PORT` – Local dev (default 127.0.0.1:1025)
- `CLIENT_URL` – Base URL for reset links (default http://localhost:3000)

## Auth Service integration

Set in auth-service `.env` to send password reset emails:

```
EMAIL_SERVICE_URL=http://localhost:5009
```

If not set, auth-service returns token in dev mode or a generic message.

## Run

```bash
cd services/email-service
npm install
PORT=5009 npm start
```

For local testing, run MailHog: `docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog` and view at http://localhost:8025.

## Test

```bash
npm run test:endpoints
# or from repo root:
npm run test:email
```
