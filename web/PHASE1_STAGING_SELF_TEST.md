# Phase 1 Staging Self-Test Guide

## Purpose

Use this guide to validate the Phase 1 implementation on the deployed environment.

- Environment URL: [http://72.62.36.94/](http://72.62.36.94/)
- Current login screen at this URL includes the role-based test credentials hint.

## Test Accounts

Use password `password123` for all accounts:

- `owner@saasphere.io` (platform owner)
- `admin@acme.com` (admin)
- `super@acme.com` (supervisor)
- `agent@acme.com` (agent)

---

## 1) Deployment Verification (Quick Check)

1. Open [http://72.62.36.94/](http://72.62.36.94/).
2. Confirm the login hint shows all four role-based emails above.
3. Attempt login with `owner@saasphere.io` / `password123`.

Expected:
- Login succeeds.
- Redirect to `/app/dashboard`.

If login fails:
- Hard refresh (`Ctrl + F5`).
- Recheck email/password.
- Continue to API checks in section 7.

---

## 2) Role & Permission Validation (RBAC)

Run the same checks for each role.

### Owner (`owner@saasphere.io`)
- Can open tenants list and create tenant.
- Can access tenant tabs: users, roles/permissions, feature flags, white-label, security, API keys, audit logs.
- Can use destructive/management actions.

### Supervisor (`super@acme.com`)
- Can view most tenant information.
- Some management actions should be disabled/hidden (depending on permission key).

### Agent (`agent@acme.com`)
- Restricted actions compared to owner/supervisor.
- Management actions should be disabled/hidden.

Expected:
- UI actions and access change by role.

---

## 3) Tenant Management

1. Go to `/app/tenants`.
2. Test search + filters (plan/status) + pagination.
3. Open one tenant row.
4. Create a new tenant from `/app/tenants/new`.

Suggested test payload:
- Name: `QA Tenant`
- Domain: `qa-tenant.example.com`
- Language: `en`
- Timezone: `UTC`
- Plan: `starter`
- Admin email: `qa-admin@example.com`

Expected:
- Creation success notification.
- Tenant appears in list.
- Tenant can be opened in detail pages.

---

## 4) Tenant Workspace Tabs

Open a tenant and test each tab:

- Overview
- Users (invite modal opens, actions visible by role)
- Roles & Permissions (matrix save behavior)
- Feature Flags (toggle/search/bulk)
- White-Label (branding fields + live preview)
- Security (session/MFA/OAuth controls + checklist)
- API Keys (generate/reveal/copy/revoke UI)
- Audit Logs (filters + detail drawer + export action)

Expected:
- All tabs render.
- No crashes.
- Permission-gated actions behave correctly.

---

## 5) Localization, RTL, Theme

From top bar:

1. Toggle language EN/AR.
2. Toggle RTL/LTR direction.
3. Toggle light/dark theme.

Expected:
- UI text changes language.
- Layout direction flips on RTL.
- Theme switches correctly.

---

## 6) Channels Placeholder/Feature Gate

1. Open `/app/channels`.
2. Check locked/unlocked state behavior.
3. Open a specific channel route (for example `/app/channels/whatsapp`).

Expected:
- Phase-2 placeholder appears.
- Lock state follows enabled features/plan behavior.

---

## 7) API-Level Verification (Direct)

Use terminal or API tool (Postman/Insomnia).

### 7.1 Login API

`POST /api/v1/auth/login`

```json
{
  "email": "owner@saasphere.io",
  "password": "password123"
}
```

Expected:
- `200 OK`
- Returns `accessToken`, `refreshToken`, `user`.

### 7.2 Auth Me API

`GET /api/v1/auth/me` with `Authorization: Bearer <accessToken>`

Expected:
- `200 OK`
- Returns current authenticated user.

### 7.3 Tenants API

`GET /api/v1/tenants` with bearer token

Expected:
- `200 OK`
- Returns tenant data + pagination object.

### 7.4 Refresh Rotation

`POST /api/v1/auth/refresh` with valid `refreshToken`

Expected:
- Returns new `accessToken` and rotated `refreshToken`.

---

## 8) Database Validation

Run these SQL statements in PostgreSQL query tool:

```sql
SELECT current_database();

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT email, role
FROM users
ORDER BY email;
```

Expected:
- Database in use: `ai_chatbot`
- Tables include:
  - `users`
  - `tenants`
  - `user_tenants`
  - `refresh_sessions`
  - `audit_logs`
  - `api_keys`
- User rows include seeded role accounts.

---

## 9) Troubleshooting

- If UI looks unchanged:
  - Hard refresh (`Ctrl + F5`)
  - Clear site cache
  - Re-open in private window
- If API returns 401:
  - Re-login and use a fresh token
  - Confirm password is `password123`
- If tables are not visible:
  - Ensure query tool is connected to database `ai_chatbot` (not another DB)
  - Expand `Schemas -> public -> Tables` and refresh

---

## Completion Checklist

- [ ] Login works for all test accounts
- [ ] RBAC behavior differs by role
- [ ] Tenant create/list/detail flows work
- [ ] Tenant tabs load and interact correctly
- [ ] i18n + RTL + theme toggles work
- [ ] Channels placeholder and lock behavior are visible
- [ ] Auth/Tenant APIs respond with expected payloads
- [ ] PostgreSQL tables and seeded users are visible

