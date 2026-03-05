
-- Profiles table for storing user birth data and AI-generated cosmic profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Birth data (input)
  birth_date DATE,
  birth_time TIME,
  birth_place TEXT,
  birth_latitude DOUBLE PRECISION,
  birth_longitude DOUBLE PRECISION,
  
  -- AI-generated astro profile
  sun_sign TEXT,
  moon_sign TEXT,
  rising_sign TEXT,
  astro_summary TEXT,
  
  -- AI-generated Human Design
  human_design_type TEXT,
  human_design_strategy TEXT,
  human_design_authority TEXT,
  human_design_profile TEXT,
  human_design_summary TEXT,
  
  -- AI-generated Gene Keys
  gene_keys_life_purpose TEXT,
  gene_keys_evolution TEXT,
  gene_keys_radiance TEXT,
  gene_keys_summary TEXT,
  
  -- Overall compatibility vector
  compatibility_tags TEXT[] DEFAULT '{}',
  
  -- Social energy scale 1-10 (introvert to extrovert)
  social_energy INTEGER DEFAULT 5,
  
  -- Interests
  interests TEXT[] DEFAULT '{}',
  
  -- Onboarding status
  onboarding_complete BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read any profile (for matching/discovery)
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
