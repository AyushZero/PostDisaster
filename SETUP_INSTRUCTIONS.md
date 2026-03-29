# Post Disaster Alert System - Setup Instructions

## Quick Start

### 1. Create Supabase Project

1. Go to https://supabase.com and sign up with GitHub
2. Click "New Project"
3. Name it `post-disaster-alert`, set a password, choose a region near India
4. Wait for project creation

### 2. Set Up Database

1. In Supabase dashboard, go to "SQL Editor"
2. Click "New query"
3. Copy the contents of `supabase/schema.sql` and paste it
4. Click "Run"

### 3. Get API Keys

1. Go to "Project Settings" > "API"
2. Copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - anon public key (starts with `eyJ...`)

### 4. Configure Environment

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## How to Use

### Public Dashboard (http://localhost:3000/dashboard)
- No login required
- Search location or select state
- View active disasters, alerts, and emergency contacts
- See map with affected areas and resources

### Admin Panel (http://localhost:3000/admin/login)

**Test Credentials:**
- Email: `admin@disaster.gov.in`
- Password: `admin123`

Or click "Use Test Admin Credentials" button.

**Admin can:**
- Add/edit disasters
- Issue alerts
- Mark infrastructure (shelters, hospitals, closed roads)
- Manage emergency contacts

---

## Deploy to Vercel

1. Push to GitHub
2. Go to https://vercel.com
3. Import repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

---

## Emergency Numbers (Pre-populated)

| Service | Number |
|---------|--------|
| National Emergency | 112 |
| Ambulance | 108 |
| Police | 100 |
| Fire | 101 |
| Disaster Management | 1078 |

---

## Testing Real-time Updates

1. Open public dashboard in one browser
2. Open admin panel in another browser/incognito
3. As admin, issue a new alert
4. Alert appears immediately on public dashboard
