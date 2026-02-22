# Frontend Testing Guide (Phase 1)

This guide helps you validate the latest Phase 1 frontend features without backend deep dive.

## 1) Core frontend UAT scenarios

### A. Tenant self-registration + phone/country

1. Open `/auth/register-tenant`
2. Fill company/admin details, including phone country and number
3. Submit

Expected:
- Success message appears
- Verification link appears on screen

### B. Email verification enforcement

1. Try logging in at `/auth/login` using the just-registered admin account (before verifying)

Expected:
- Login is blocked
- Error says email is not verified
- `Resend Verification Link` button appears

2. Click `Resend Verification Link`

Expected:
- Inline message appears
- Clickable `Open verification link` appears

3. Open verification link, then login again

Expected:
- Login succeeds

### C. Agent-only experience

1. Login as an agent user

Expected:
- Redirect to `/app/agent/dashboard`
- Limited menu for agent scope
- Navigating to admin/platform pages redirects back to agent area

### D. Sub-admin permission checks

1. Login as platform owner (`owner@saasphere.io`)
2. Go to `/app/platform/sub-admins`
3. Create/update sub-admin and toggle permissions:
   - `view_platform_stats`
   - `manage_sub_admins`
   - `manage_subscription_plans`
   - `manage_trial_config`

4. Login as that sub-admin and test:
   - `/app/platform/subscription-plans`
   - `/app/platform/trial-config`
   - `/app/platform/sub-admins`

Expected:
- Page opens when permission exists
- If missing, page shows `Permission Required` with exact missing permission key

### E. OAuth check (optional)

If OAuth client IDs are configured:

1. Try Google/Microsoft sign-in with an unverified account

Expected:
- Login blocked until email is verified

## 2) Quick smoke checklist (Pass/Fail)

- [ ] Registration form accepts phone country + number
- [ ] Unverified account cannot login
- [ ] Resend verification link appears and is clickable
- [ ] Verified account can login
- [ ] Agent lands on personal dashboard and has limited menu
- [ ] Sub-admin access follows permission toggles

## 3) Troubleshooting

- If app still shows old/mock behavior:
  - Confirm `NEXT_PUBLIC_USE_API_AUTH=true`
  - Clear browser local storage and login again
- If login fails unexpectedly:
  - Verify `DATABASE_URL` points to correct DB
  - Ensure tables were created by app startup
- If OAuth is failing:
  - Keep OAuth IDs empty for non-OAuth tests
  - Or configure both public/server client IDs correctly

