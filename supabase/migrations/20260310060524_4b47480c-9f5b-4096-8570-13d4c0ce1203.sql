
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday_number integer,
ADD COLUMN IF NOT EXISTS personal_year_number integer,
ADD COLUMN IF NOT EXISTS numerology_summary text;
