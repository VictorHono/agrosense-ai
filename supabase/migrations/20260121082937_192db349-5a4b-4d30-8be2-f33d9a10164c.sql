-- ========================================
-- ENHANCED MULTILINGUAL SYSTEM SCHEMA
-- Supports: AI validation, TTS, metadata, missing keys log
-- ========================================

-- 1. Add new columns to app_translations for metadata & validation
ALTER TABLE public.app_translations
ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_validated boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS pronunciation text,
ADD COLUMN IF NOT EXISTS dialect_variant text,
ADD COLUMN IF NOT EXISTS usage_example text,
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS notes text;

-- 2. Add metadata columns to app_languages
ALTER TABLE public.app_languages
ADD COLUMN IF NOT EXISTS dialect_info text,
ADD COLUMN IF NOT EXISTS script_type text DEFAULT 'latin',
ADD COLUMN IF NOT EXISTS text_direction text DEFAULT 'ltr',
ADD COLUMN IF NOT EXISTS tts_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tts_voice_id text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS iso_639_3 text;

-- 3. Create translation_missing_keys table for logging untranslated keys
CREATE TABLE IF NOT EXISTS public.translation_missing_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key text NOT NULL,
  language_code text NOT NULL REFERENCES public.app_languages(code) ON DELETE CASCADE,
  fallback_used text,
  page_context text,
  user_agent text,
  occurrence_count integer DEFAULT 1,
  first_seen_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  UNIQUE(translation_key, language_code)
);

-- Enable RLS on translation_missing_keys
ALTER TABLE public.translation_missing_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for translation_missing_keys
CREATE POLICY "Admins can manage missing keys"
  ON public.translation_missing_keys
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can insert missing keys"
  ON public.translation_missing_keys
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read missing keys stats"
  ON public.translation_missing_keys
  FOR SELECT
  USING (true);

-- 4. Create translation_audio table for TTS audio files
CREATE TABLE IF NOT EXISTS public.translation_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id uuid REFERENCES public.app_translations(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.app_languages(code) ON DELETE CASCADE,
  audio_url text NOT NULL,
  audio_format text DEFAULT 'mp3',
  duration_ms integer,
  voice_type text DEFAULT 'standard',
  is_generated boolean DEFAULT true,
  generated_at timestamp with time zone DEFAULT now(),
  file_size_bytes integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on translation_audio
ALTER TABLE public.translation_audio ENABLE ROW LEVEL SECURITY;

-- RLS policies for translation_audio
CREATE POLICY "Public read access for translation audio"
  ON public.translation_audio
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage translation audio"
  ON public.translation_audio
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 5. Create translation_dictionary for progressive lexicon enrichment
CREATE TABLE IF NOT EXISTS public.translation_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_word text NOT NULL,
  source_language text DEFAULT 'fr',
  target_word text NOT NULL,
  target_language text NOT NULL REFERENCES public.app_languages(code) ON DELETE CASCADE,
  word_type text,
  domain text DEFAULT 'general',
  pronunciation text,
  usage_example text,
  synonyms jsonb DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  contributor_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(source_word, source_language, target_language)
);

-- Enable RLS on translation_dictionary
ALTER TABLE public.translation_dictionary ENABLE ROW LEVEL SECURITY;

-- RLS policies for translation_dictionary
CREATE POLICY "Public read access for dictionary"
  ON public.translation_dictionary
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can suggest words"
  ON public.translation_dictionary
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage dictionary"
  ON public.translation_dictionary
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete dictionary entries"
  ON public.translation_dictionary
  FOR DELETE
  USING (is_admin(auth.uid()));

-- 6. Create translation_import_logs for tracking imports
CREATE TABLE IF NOT EXISTS public.translation_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL REFERENCES public.app_languages(code) ON DELETE CASCADE,
  import_type text NOT NULL,
  file_name text,
  total_entries integer DEFAULT 0,
  successful_entries integer DEFAULT 0,
  failed_entries integer DEFAULT 0,
  error_details jsonb DEFAULT '[]'::jsonb,
  imported_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on translation_import_logs
ALTER TABLE public.translation_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for translation_import_logs
CREATE POLICY "Admins can manage import logs"
  ON public.translation_import_logs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_translations_validation ON public.app_translations(is_ai_generated, is_validated);
CREATE INDEX IF NOT EXISTS idx_missing_keys_language ON public.translation_missing_keys(language_code, is_resolved);
CREATE INDEX IF NOT EXISTS idx_dictionary_lookup ON public.translation_dictionary(source_word, target_language);
CREATE INDEX IF NOT EXISTS idx_dictionary_domain ON public.translation_dictionary(domain, target_language);

-- 8. Create storage bucket for TTS audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('translation-audio', 'translation-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for translation audio bucket
CREATE POLICY "Public can read translation audio files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'translation-audio');

CREATE POLICY "Admins can upload translation audio files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'translation-audio' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete translation audio files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'translation-audio' AND is_admin(auth.uid()));

-- 9. Function to log missing translation keys
CREATE OR REPLACE FUNCTION public.log_missing_translation(
  p_key text,
  p_language text,
  p_fallback text DEFAULT NULL,
  p_context text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO translation_missing_keys (translation_key, language_code, fallback_used, page_context)
  VALUES (p_key, p_language, p_fallback, p_context)
  ON CONFLICT (translation_key, language_code)
  DO UPDATE SET
    occurrence_count = translation_missing_keys.occurrence_count + 1,
    last_seen_at = now();
END;
$$;

-- 10. Function to get translation with fallback chain
CREATE OR REPLACE FUNCTION public.get_translation_with_fallback(
  p_key text,
  p_language text
)
RETURNS TABLE(
  translation_value text,
  source_language text,
  is_fallback boolean,
  has_audio boolean
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_translation record;
  v_has_audio boolean;
BEGIN
  SELECT t.translation_value, t.id INTO v_translation
  FROM app_translations t
  WHERE t.translation_key = p_key AND t.language_code = p_language AND t.is_validated = true;
  
  IF FOUND THEN
    SELECT EXISTS(SELECT 1 FROM translation_audio WHERE translation_id = v_translation.id) INTO v_has_audio;
    RETURN QUERY SELECT v_translation.translation_value, p_language, false, v_has_audio;
    RETURN;
  END IF;
  
  SELECT t.translation_value, t.id INTO v_translation
  FROM app_translations t
  WHERE t.translation_key = p_key AND t.language_code = 'fr';
  
  IF FOUND THEN
    SELECT EXISTS(SELECT 1 FROM translation_audio WHERE translation_id = v_translation.id) INTO v_has_audio;
    RETURN QUERY SELECT v_translation.translation_value, 'fr'::text, true, v_has_audio;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT p_key, 'none'::text, true, false;
END;
$$;

-- 11. Update Ghomala language metadata
UPDATE public.app_languages
SET 
  dialect_info = 'Langue Bamileke parlee dans la region de Ouest Cameroun, notamment a Bandjoun, Baham, Batie',
  script_type = 'latin',
  region = 'ouest',
  iso_639_3 = 'bbj'
WHERE code = 'ghm';