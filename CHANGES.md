# Post Disaster Alert System - Simplified for Emergency Use

## Infrastructure and CI/CD Expansion (March 2026)

### Added

1. Multi-environment Jenkins pipeline in [Jenkinsfile](./Jenkinsfile):
   - Docker image build and push
   - Terraform plan/apply for dev/staging/prod
   - Ansible provision/deploy/rollback flow
   - Health validation using `/api/health`
2. Terraform structure under `terraform/`:
   - Reusable modules (`network`, `compute`)
   - Environment stacks (`dev`, `staging`, `prod`)
3. Ansible structure under `ansible/`:
   - Inventories per environment
   - Playbooks: provision, deploy, rollback
   - Roles: common and app_deploy
4. Jenkins helper scripts under `scripts/jenkins/`:
   - `validate_stack.sh`
   - `tf_plan_apply.sh`
   - `ansible_deploy.sh`
5. API health route in `src/app/api/health/route.ts` for deterministic smoke checks.

### Updated

1. [README.md](./README.md) with Terraform + Ansible + Docker + Jenkins flow and validation commands.
2. [JENKINS_SETUP.md](./JENKINS_SETUP.md) with end-to-end multi-tool pipeline execution steps.

## What Changed

This application has been simplified for emergency/public use:

1. **Public Access** - No login required for citizens to view disaster information
2. **Test Admin Login** - Quick admin access for demos without email rate limits
3. **Clean Interface** - Removed marketing content, focused on essential information

---

## Quick Test

1. **Public Dashboard** - Open http://localhost:3000
   - Redirects to `/dashboard`
   - No login required
   - Search by location or state
   - View disasters, alerts, emergency numbers

2. **Admin Panel** - Open http://localhost:3000/admin/login
   - Click "Use Test Admin Credentials" button
   - Or manually enter:
     - Email: `admin@disaster.gov.in`
     - Password: `admin123`
   - Manage disasters, alerts, infrastructure

---

## How It Works

### Test Admin Login
- Credentials are checked in the browser (no API call)
- Session stored in `localStorage`
- No email rate limits
- Works offline

### Real Admin (Supabase)
- Still works for production use
- Requires Supabase account creation
- Email/password authentication
- Database-backed sessions

---

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Redirects to dashboard |
| `/dashboard` | Public | View disasters & alerts |
| `/admin/login` | Public | Admin login page |
| `/admin/*` | Admin only | Management panel |

---

## Files Modified

- `src/app/page.tsx` - Redirect to dashboard
- `src/app/dashboard/page.tsx` - New public dashboard
- `src/app/admin/login/page.tsx` - Test admin credentials
- `src/app/admin/layout.tsx` - Handle test admin session
- `src/lib/supabase-middleware.ts` - Allow public access
- Removed: `src/app/auth/*`, `src/app/user/*`

---

## Troubleshooting

### Admin login keeps loading or reloads page

**Check browser console (F12 > Console)** - You should see:
```
Test admin session stored, redirecting to /admin
Admin layout - checking session: found
Admin layout - session loaded: admin@disaster.gov.in
```

**If you don't see these logs:**
1. Clear browser cache and localStorage
2. Hard refresh (Ctrl+Shift+R)
3. Try incognito/private browsing mode

**If localStorage is disabled:**
- Enable localStorage in browser settings
- Or use Supabase authentication instead

### No data showing

- Run `supabase/schema.sql` in Supabase SQL Editor
- Check `.env.local` has correct Supabase credentials
- Verify Supabase project is active

### Map not loading

- Requires internet connection (uses OpenStreetMap)
- Check browser console for errors
- Verify no ad blockers are blocking map tiles
