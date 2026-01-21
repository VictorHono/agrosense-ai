-- Table des langues disponibles dans l'application
CREATE TABLE public.app_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  native_name text NOT NULL,
  flag text DEFAULT '🌍',
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  translation_progress integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table des traductions
CREATE TABLE public.app_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL REFERENCES public.app_languages(code) ON DELETE CASCADE,
  translation_key text NOT NULL,
  translation_value text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(language_code, translation_key)
);

-- Enable RLS
ALTER TABLE public.app_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_translations ENABLE ROW LEVEL SECURITY;

-- Policies pour app_languages
CREATE POLICY "Public read access for active languages"
ON public.app_languages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage languages"
ON public.app_languages FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Policies pour app_translations
CREATE POLICY "Public read access for translations"
ON public.app_translations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage translations"
ON public.app_translations FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger pour updated_at
CREATE TRIGGER update_app_languages_updated_at
BEFORE UPDATE ON public.app_languages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_translations_updated_at
BEFORE UPDATE ON public.app_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les langues de base
INSERT INTO public.app_languages (code, name, native_name, flag, is_active, is_default, translation_progress) VALUES
('fr', 'French', 'Français', '🇫🇷', true, true, 100),
('en', 'English', 'English', '🇬🇧', true, false, 100),
('ghomala', 'Ghomala', 'Ghɔmálá''', '🇨🇲', true, false, 0),
('ewondo', 'Ewondo', 'Ewondo', '🇨🇲', true, false, 0),
('fulfulde', 'Fulfulde', 'Fulfulde', '🇨🇲', true, false, 0),
('duala', 'Duala', 'Duálá', '🇨🇲', true, false, 0),
('basaa', 'Basaa', 'Basaa', '🇨🇲', true, false, 0),
('bamileke', 'Bamileke', 'Bamiléké', '🇨🇲', true, false, 0);

-- Insérer les traductions françaises de base
INSERT INTO public.app_translations (language_code, translation_key, translation_value, category) VALUES
-- Navigation
('fr', 'nav.home', 'Accueil', 'navigation'),
('fr', 'nav.diagnose', 'Diagnostic', 'navigation'),
('fr', 'nav.assistant', 'Assistant', 'navigation'),
('fr', 'nav.harvest', 'Récolte', 'navigation'),
('fr', 'nav.history', 'Historique', 'navigation'),
('fr', 'nav.tips', 'Conseils', 'navigation'),
('fr', 'nav.settings', 'Paramètres', 'navigation'),
('fr', 'nav.admin', 'Administration', 'navigation'),
-- Home
('fr', 'home.welcome', 'Bienvenue sur AgroCamer', 'home'),
('fr', 'home.subtitle', 'Votre assistant agricole intelligent', 'home'),
('fr', 'home.diagnose.title', 'Diagnostiquer une plante', 'home'),
('fr', 'home.diagnose.desc', 'Prenez une photo pour identifier les maladies', 'home'),
('fr', 'home.assistant.title', 'Parler à l''assistant', 'home'),
('fr', 'home.assistant.desc', 'Posez vos questions en voix ou texte', 'home'),
('fr', 'home.harvest.title', 'Analyser une récolte', 'home'),
('fr', 'home.harvest.desc', 'Évaluez la qualité de vos produits', 'home'),
('fr', 'home.tips.title', 'Conseils agricoles', 'home'),
('fr', 'home.tips.desc', 'Guides et bonnes pratiques locales', 'home'),
-- Common
('fr', 'common.loading', 'Chargement...', 'common'),
('fr', 'common.error', 'Une erreur est survenue', 'common'),
('fr', 'common.retry', 'Réessayer', 'common'),
('fr', 'common.offline', 'Vous êtes hors ligne', 'common'),
('fr', 'common.save', 'Enregistrer', 'common'),
('fr', 'common.cancel', 'Annuler', 'common'),
('fr', 'common.back', 'Retour', 'common'),
('fr', 'common.next', 'Suivant', 'common'),
-- Settings
('fr', 'settings.title', 'Paramètres', 'settings'),
('fr', 'settings.language', 'Langue', 'settings'),
('fr', 'settings.region', 'Région', 'settings'),
('fr', 'settings.notifications', 'Notifications', 'settings'),
('fr', 'settings.audio', 'Audio activé', 'settings'),
('fr', 'settings.data_saver', 'Mode économie données', 'settings'),
-- Disease
('fr', 'disease.title', 'Diagnostic des maladies', 'disease'),
('fr', 'disease.take_photo', 'Prendre une photo', 'disease'),
('fr', 'disease.upload', 'Importer une image', 'disease'),
('fr', 'disease.analyzing', 'Analyse en cours...', 'disease'),
('fr', 'disease.result', 'Résultat du diagnostic', 'disease'),
('fr', 'disease.severity', 'Gravité', 'disease'),
('fr', 'disease.causes', 'Causes probables', 'disease'),
('fr', 'disease.treatments', 'Traitements recommandés', 'disease'),
('fr', 'disease.prevention', 'Prévention', 'disease'),
('fr', 'disease.listen', 'Écouter les conseils', 'disease'),
-- Harvest
('fr', 'harvest.title', 'Analyse de récolte', 'harvest'),
('fr', 'harvest.grade', 'Classe de qualité', 'harvest'),
('fr', 'harvest.use', 'Usage recommandé', 'harvest'),
('fr', 'harvest.price', 'Prix estimé', 'harvest'),
-- Assistant
('fr', 'assistant.title', 'Assistant Agricole', 'assistant'),
('fr', 'assistant.placeholder', 'Posez votre question...', 'assistant'),
('fr', 'assistant.speak', 'Appuyez pour parler', 'assistant'),
('fr', 'assistant.listening', 'Je vous écoute...', 'assistant'),
-- Severity
('fr', 'severity.low', 'Faible', 'severity'),
('fr', 'severity.medium', 'Modéré', 'severity'),
('fr', 'severity.high', 'Élevé', 'severity'),
('fr', 'severity.critical', 'Critique', 'severity'),
-- Grade
('fr', 'grade.A', 'Excellente qualité - Export', 'grade'),
('fr', 'grade.B', 'Bonne qualité - Marché local', 'grade'),
('fr', 'grade.C', 'Qualité moyenne - Transformation', 'grade');

-- Insérer les traductions anglaises
INSERT INTO public.app_translations (language_code, translation_key, translation_value, category) VALUES
-- Navigation
('en', 'nav.home', 'Home', 'navigation'),
('en', 'nav.diagnose', 'Diagnose', 'navigation'),
('en', 'nav.assistant', 'Assistant', 'navigation'),
('en', 'nav.harvest', 'Harvest', 'navigation'),
('en', 'nav.history', 'History', 'navigation'),
('en', 'nav.tips', 'Tips', 'navigation'),
('en', 'nav.settings', 'Settings', 'navigation'),
('en', 'nav.admin', 'Admin', 'navigation'),
-- Home
('en', 'home.welcome', 'Welcome to AgroCamer', 'home'),
('en', 'home.subtitle', 'Your intelligent farming assistant', 'home'),
('en', 'home.diagnose.title', 'Diagnose a plant', 'home'),
('en', 'home.diagnose.desc', 'Take a photo to identify diseases', 'home'),
('en', 'home.assistant.title', 'Talk to assistant', 'home'),
('en', 'home.assistant.desc', 'Ask questions by voice or text', 'home'),
('en', 'home.harvest.title', 'Analyze harvest', 'home'),
('en', 'home.harvest.desc', 'Evaluate your product quality', 'home'),
('en', 'home.tips.title', 'Farming tips', 'home'),
('en', 'home.tips.desc', 'Local guides and best practices', 'home'),
-- Common
('en', 'common.loading', 'Loading...', 'common'),
('en', 'common.error', 'An error occurred', 'common'),
('en', 'common.retry', 'Retry', 'common'),
('en', 'common.offline', 'You are offline', 'common'),
('en', 'common.save', 'Save', 'common'),
('en', 'common.cancel', 'Cancel', 'common'),
('en', 'common.back', 'Back', 'common'),
('en', 'common.next', 'Next', 'common'),
-- Settings
('en', 'settings.title', 'Settings', 'settings'),
('en', 'settings.language', 'Language', 'settings'),
('en', 'settings.region', 'Region', 'settings'),
('en', 'settings.notifications', 'Notifications', 'settings'),
('en', 'settings.audio', 'Audio enabled', 'settings'),
('en', 'settings.data_saver', 'Data saver mode', 'settings'),
-- Disease
('en', 'disease.title', 'Disease Diagnosis', 'disease'),
('en', 'disease.take_photo', 'Take a photo', 'disease'),
('en', 'disease.upload', 'Upload image', 'disease'),
('en', 'disease.analyzing', 'Analyzing...', 'disease'),
('en', 'disease.result', 'Diagnosis Result', 'disease'),
('en', 'disease.severity', 'Severity', 'disease'),
('en', 'disease.causes', 'Probable causes', 'disease'),
('en', 'disease.treatments', 'Recommended treatments', 'disease'),
('en', 'disease.prevention', 'Prevention', 'disease'),
('en', 'disease.listen', 'Listen to advice', 'disease'),
-- Harvest
('en', 'harvest.title', 'Harvest Analysis', 'harvest'),
('en', 'harvest.grade', 'Quality grade', 'harvest'),
('en', 'harvest.use', 'Recommended use', 'harvest'),
('en', 'harvest.price', 'Estimated price', 'harvest'),
-- Assistant
('en', 'assistant.title', 'Farming Assistant', 'assistant'),
('en', 'assistant.placeholder', 'Ask your question...', 'assistant'),
('en', 'assistant.speak', 'Press to speak', 'assistant'),
('en', 'assistant.listening', 'Listening...', 'assistant'),
-- Severity
('en', 'severity.low', 'Low', 'severity'),
('en', 'severity.medium', 'Medium', 'severity'),
('en', 'severity.high', 'High', 'severity'),
('en', 'severity.critical', 'Critical', 'severity'),
-- Grade
('en', 'grade.A', 'Excellent quality - Export', 'grade'),
('en', 'grade.B', 'Good quality - Local market', 'grade'),
('en', 'grade.C', 'Average quality - Processing', 'grade');

-- Quelques traductions en Ghomala (exemple)
INSERT INTO public.app_translations (language_code, translation_key, translation_value, category) VALUES
('ghomala', 'nav.home', 'Ndáp', 'navigation'),
('ghomala', 'nav.diagnose', 'Zhì mɔk', 'navigation'),
('ghomala', 'nav.assistant', 'Ŋkwɛtə́', 'navigation'),
('ghomala', 'nav.harvest', 'Sɔ̀ŋ', 'navigation'),
('ghomala', 'home.welcome', 'Mbú nə́ AgroCamer', 'home'),
('ghomala', 'home.subtitle', 'Ŋkwɛtə́ pú sɔ̀ŋ wə́', 'home'),
('ghomala', 'common.loading', 'Á cyə̀...', 'common'),
('ghomala', 'common.save', 'Sá', 'common'),
('ghomala', 'common.cancel', 'Lɔ̀k', 'common');