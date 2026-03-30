# Dashboard Loading Fix

The dashboard fails to load because RLS (Row Level Security) policies require authentication. The public dashboard uses unauthenticated access.

## Step 1: Update Supabase RLS Policies

Go to your Supabase SQL Editor and run this:

```sql
DROP POLICY IF EXISTS "Anyone can view disasters" ON public.disasters;
DROP POLICY IF EXISTS "Anyone can view affected areas" ON public.affected_areas;
DROP POLICY IF EXISTS "Anyone can view infrastructure points" ON public.infrastructure_points;
DROP POLICY IF EXISTS "Anyone can view active alerts" ON public.alerts;
DROP POLICY IF EXISTS "Anyone can view emergency contacts" ON public.emergency_contacts;

CREATE POLICY "Anyone can view disasters"
    ON public.disasters FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view affected areas"
    ON public.affected_areas FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view infrastructure points"
    ON public.infrastructure_points FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view active alerts"
    ON public.alerts FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view emergency contacts"
    ON public.emergency_contacts FOR SELECT
    USING (true);
```

## Step 2: Commit schema changes

```powershell
git add supabase/schema.sql
git commit -m "Fix RLS policies to allow unauthenticated dashboard access"
git push origin master
```

## Step 3: Trigger Jenkins build

Use these parameters:
- DEPLOY_SCOPE: dev
- APPLY_INFRA: false
- STRICT_LINT: false

## Result

Dashboard will load after Supabase policies are updated and new image is deployed.
