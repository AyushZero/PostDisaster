-- Post Disaster Alert System - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    assigned_state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disasters table
CREATE TABLE IF NOT EXISTS public.disasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('earthquake', 'flood')),
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    affected_states TEXT[] NOT NULL DEFAULT '{}',
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affected areas table
CREATE TABLE IF NOT EXISTS public.affected_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID NOT NULL REFERENCES public.disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    coordinates JSONB, -- GeoJSON Polygon
    severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Infrastructure points table
CREATE TABLE IF NOT EXISTS public.infrastructure_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID NOT NULL REFERENCES public.disasters(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('closed_road', 'evacuation_zone', 'supply_center', 'help_center', 'shelter', 'hospital', 'ngo')),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    contact_info TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES public.disasters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    affected_states TEXT[] NOT NULL DEFAULT '{}',
    issued_by UUID REFERENCES public.users(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('ambulance', 'police', 'fire', 'disaster_helpline', 'emergency')),
    name TEXT NOT NULL,
    number TEXT NOT NULL,
    region TEXT,
    description TEXT,
    is_national BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_disasters_status ON public.disasters(status);
CREATE INDEX IF NOT EXISTS idx_disasters_affected_states ON public.disasters USING GIN(affected_states);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON public.alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_affected_states ON public.alerts USING GIN(affected_states);
CREATE INDEX IF NOT EXISTS idx_infrastructure_disaster_id ON public.infrastructure_points(disaster_id);
CREATE INDEX IF NOT EXISTS idx_affected_areas_disaster_id ON public.affected_areas(disaster_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affected_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for disasters table
CREATE POLICY "Anyone can view disasters"
    ON public.disasters FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can create disasters"
    ON public.disasters FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update disasters"
    ON public.disasters FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can delete disasters"
    ON public.disasters FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for affected_areas table
CREATE POLICY "Anyone can view affected areas"
    ON public.affected_areas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage affected areas"
    ON public.affected_areas FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for infrastructure_points table
CREATE POLICY "Anyone can view infrastructure points"
    ON public.infrastructure_points FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage infrastructure points"
    ON public.infrastructure_points FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for alerts table
CREATE POLICY "Anyone can view active alerts"
    ON public.alerts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage alerts"
    ON public.alerts FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for emergency_contacts table
CREATE POLICY "Anyone can view emergency contacts"
    ON public.emergency_contacts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage emergency contacts"
    ON public.emergency_contacts FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.disasters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.infrastructure_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affected_areas;

-- Insert default emergency contacts (India)
INSERT INTO public.emergency_contacts (type, name, number, is_national) VALUES
    ('emergency', 'National Emergency Number', '112', true),
    ('ambulance', 'Ambulance', '108', true),
    ('police', 'Police', '100', true),
    ('fire', 'Fire Services', '101', true),
    ('disaster_helpline', 'National Disaster Management', '1078', true),
    ('emergency', 'Women Helpline', '1091', true),
    ('emergency', 'Child Helpline', '1098', true)
ON CONFLICT DO NOTHING;
