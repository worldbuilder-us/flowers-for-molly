# Flowers For Molly

A generative art piece to serve as a memorial for Molly Bird.

## Story Moderation (Admin)

New submissions are saved as `pending` and are not visible publicly until approved.

Set these environment variables to enable the admin panel:

- `ADMIN_REVIEW_PASSWORD`: Password used by the client to sign in at `/admin/login`.
- `ADMIN_REVIEW_SECRET`: HMAC secret used to sign the admin session cookie.
  - If omitted, the app falls back to `ADMIN_REVIEW_PASSWORD` as the signing secret.
- `RESEND_API_KEY` (optional): Enables submission notification emails.
- `ADMIN_NOTIFICATION_EMAIL` (optional): Recipient for new pending story emails.
- `ADMIN_FROM_EMAIL` (optional): Verified sender address for notification emails.
- `APP_BASE_URL` (optional): Base URL used in email links (defaults to `http://localhost:3000`).

Moderation flow:

1. User submits story on `/submit` -> status is `pending`.
2. Client signs in on `/admin/login`.
3. Client opens `/admin`, proofreads story text, and chooses `Save + Approve` or `Reject`.
4. Public endpoints only return `approved` stories.
