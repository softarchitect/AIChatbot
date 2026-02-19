# Phase 1 Backend API (Next.js Route Handlers)

This project now includes a Phase 1 backend baseline under `app/api/v1/*`.

## Auth

- `POST /api/v1/auth/login`
  - Body: `{ "email": "...", "password": "..." }`
  - Returns access + refresh token
- `POST /api/v1/auth/refresh`
  - Body: `{ "refreshToken": "..." }`
  - Rotates refresh token on each successful call
  - Reuse detection revokes all sessions for the user
- `POST /api/v1/auth/logout`
  - Body: `{ "refreshToken": "..." }`
- `GET /api/v1/auth/me`
  - Header: `Authorization: Bearer <accessToken>`

## Tenants

- `GET /api/v1/tenants`
  - Headers: `Authorization: Bearer <accessToken>`
  - Query: `search`, `plan`, `status`, `page`, `perPage`
- `POST /api/v1/tenants`
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ name, domain, language, timezone, plan, adminEmail }`
- `GET /api/v1/tenants/:tenantId`
  - Headers: `Authorization: Bearer <accessToken>`, optional `x-tenant-id`
- `PATCH /api/v1/tenants/:tenantId`
  - Headers: `Authorization: Bearer <accessToken>`, optional `x-tenant-id`
- `DELETE /api/v1/tenants/:tenantId`
  - Headers: `Authorization: Bearer <accessToken>`, optional `x-tenant-id`

## Audit Logs

- `GET /api/v1/tenants/:tenantId/audit-logs`
  - Headers: `Authorization: Bearer <accessToken>`, optional `x-tenant-id`
  - Query: `actor`, `action`

## Tenant Onboarding API

- `POST /api/v1/onboarding/tenant`
  - Auth mode 1: `Authorization: Bearer <accessToken>` (must have tenant management permission)
  - Auth mode 2: `x-api-key: <apiKey>`
  - Body: `{ name, domain, adminEmail, language, timezone, plan }`

## Notes

- Persistence is PostgreSQL-backed via `pg` in `lib/server/state.ts`.
- Tables are auto-created on first API call and seeded from mock data when DB is empty.
- JWT secret is read from `JWT_SECRET` (falls back to dev default if not set).
- To switch frontend login to API mode, set:
  - `NEXT_PUBLIC_USE_API_AUTH=true`
- Smoke test (requires running server):
  - `npm run test:api-smoke`
