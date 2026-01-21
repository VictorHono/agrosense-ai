-- Create table to store diagnosis learning data
CREATE TABLE public.diagnosis_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_name TEXT NOT NULL,
  crop_local_name TEXT,
  disease_name TEXT,
  disease_local_name TEXT,
  is_healthy BOOLEAN DEFAULT false,
  confidence NUMERIC(5,2),
  severity TEXT,
  symptoms JSONB DEFAULT '[]'::jsonb,
  causes JSONB DEFAULT '[]'::jsonb,
  treatments JSONB DEFAULT '[]'::jsonb,
  prevention JSONB DEFAULT '[]'::jsonb,
  
  -- Location context
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  altitude NUMERIC(7,2),
  region TEXT,
  climate_zone TEXT,
  nearest_city TEXT,
  
  -- Environmental context
  season TEXT,
  weather_conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  language TEXT DEFAULT 'fr',
  source TEXT DEFAULT 'user_diagnosis',
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verification_notes TEXT,
  use_count INTEGER DEFAULT 1,
  last_matched_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnosis_learning ENABLE ROW LEVEL SECURITY;

-- Public read access for AI queries
CREATE POLICY "Public read access for diagnosis_learning" 
ON public.diagnosis_learning 
FOR SELECT 
USING (true);

-- Edge functions can insert (using service role)
CREATE POLICY "Service role insert for diagnosis_learning" 
ON public.diagnosis_learning 
FOR INSERT 
WITH CHECK (true);

-- Admins can update/delete for verification
CREATE POLICY "Admins can update diagnosis_learning" 
ON public.diagnosis_learning 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete diagnosis_learning" 
ON public.diagnosis_learning 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create indexes for efficient searching
CREATE INDEX idx_diagnosis_learning_crop ON public.diagnosis_learning(crop_name);
CREATE INDEX idx_diagnosis_learning_disease ON public.diagnosis_learning(disease_name);
CREATE INDEX idx_diagnosis_learning_region ON public.diagnosis_learning(region);
CREATE INDEX idx_diagnosis_learning_verified ON public.diagnosis_learning(verified);
CREATE INDEX idx_diagnosis_learning_location ON public.diagnosis_learning(latitude, longitude);

-- Trigger for updated_at
CREATE TRIGGER update_diagnosis_learning_updated_at
BEFORE UPDATE ON public.diagnosis_learning
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.diagnosis_learning IS 'Stores diagnosis results for AI learning and adaptive recommendations based on local context';