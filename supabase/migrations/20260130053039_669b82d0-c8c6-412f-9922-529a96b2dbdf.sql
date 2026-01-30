-- Create table for managing AI API keys
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('lovable', 'gemini', 'huggingface', 'openai', 'anthropic', 'custom')),
  api_key_encrypted TEXT NOT NULL,
  display_name TEXT NOT NULL,
  endpoint_url TEXT,
  model_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_vision_capable BOOLEAN NOT NULL DEFAULT false,
  priority_order INTEGER NOT NULL DEFAULT 100,
  last_status_code INTEGER,
  last_status_message TEXT,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.ai_api_keys IS 'Stores AI provider API keys for the fallback system';
COMMENT ON COLUMN public.ai_api_keys.is_vision_capable IS 'Whether this provider supports image analysis';
COMMENT ON COLUMN public.ai_api_keys.priority_order IS 'Lower number = higher priority in fallback chain';

-- Enable RLS
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can view API keys" ON public.ai_api_keys
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert API keys" ON public.ai_api_keys
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update API keys" ON public.ai_api_keys
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete API keys" ON public.ai_api_keys
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ai_api_keys_updated_at
  BEFORE UPDATE ON public.ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for priority ordering
CREATE INDEX idx_ai_api_keys_priority ON public.ai_api_keys (priority_order, is_active);
CREATE INDEX idx_ai_api_keys_provider_type ON public.ai_api_keys (provider_type);