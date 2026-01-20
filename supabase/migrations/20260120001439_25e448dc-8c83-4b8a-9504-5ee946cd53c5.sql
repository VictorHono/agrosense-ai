-- Table des cultures locales camerounaises
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_local TEXT,
  category TEXT NOT NULL DEFAULT 'vegetable',
  description TEXT,
  growing_season TEXT[],
  regions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des maladies des plantes
CREATE TABLE public.diseases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_local TEXT,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  description TEXT,
  symptoms TEXT[],
  causes TEXT[],
  severity TEXT DEFAULT 'medium',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des traitements
CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_id UUID REFERENCES public.diseases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'biological',
  description TEXT,
  dosage TEXT,
  application_method TEXT,
  availability TEXT,
  price_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des prix du marché
CREATE TABLE public.market_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  market_name TEXT NOT NULL,
  region TEXT NOT NULL,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  currency TEXT NOT NULL DEFAULT 'XAF',
  quality_grade TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des conseils agricoles
CREATE TABLE public.farming_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  region TEXT,
  season TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des alertes agricoles
CREATE TABLE public.agricultural_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  region TEXT,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'historique des conversations du chatbot
CREATE TABLE public.chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farming_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data (no authentication required)
CREATE POLICY "Public read access for crops" ON public.crops FOR SELECT USING (true);
CREATE POLICY "Public read access for diseases" ON public.diseases FOR SELECT USING (true);
CREATE POLICY "Public read access for treatments" ON public.treatments FOR SELECT USING (true);
CREATE POLICY "Public read access for market_prices" ON public.market_prices FOR SELECT USING (true);
CREATE POLICY "Public read access for farming_tips" ON public.farming_tips FOR SELECT USING (true);
CREATE POLICY "Public read access for active alerts" ON public.agricultural_alerts FOR SELECT USING (is_active = true);

-- Chat history is session-based (no auth required for MVP)
CREATE POLICY "Public insert for chat_history" ON public.chat_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read for chat_history by session" ON public.chat_history FOR SELECT USING (true);

-- Insert initial crop data for Cameroon
INSERT INTO public.crops (name, name_local, category, description, regions, growing_season) VALUES
('Maïs', 'Mbassa / Bele', 'cereal', 'Céréale principale cultivée dans toutes les régions du Cameroun', ARRAY['Centre', 'Ouest', 'Nord-Ouest', 'Sud-Ouest', 'Adamaoua'], ARRAY['mars-juillet', 'août-décembre']),
('Cacao', 'Kakao', 'cash_crop', 'Culture de rente majeure du Cameroun, 5ème producteur mondial', ARRAY['Centre', 'Sud', 'Est', 'Sud-Ouest', 'Littoral'], ARRAY['octobre-décembre']),
('Café', 'Kafe', 'cash_crop', 'Arabica dans les hauts plateaux, Robusta dans les zones forestières', ARRAY['Ouest', 'Nord-Ouest', 'Sud-Ouest', 'Est'], ARRAY['octobre-février']),
('Manioc', 'Mbong / Cassava', 'tuber', 'Tubercule de base, cultivé toute l''année', ARRAY['Centre', 'Sud', 'Est', 'Littoral', 'Sud-Ouest'], ARRAY['toute l''année']),
('Banane Plantain', 'Planti', 'fruit', 'Fruit et légume de base de l''alimentation camerounaise', ARRAY['Centre', 'Sud', 'Littoral', 'Sud-Ouest', 'Est'], ARRAY['toute l''année']),
('Tomate', 'Tomat', 'vegetable', 'Légume très cultivé pour le marché local', ARRAY['Ouest', 'Nord-Ouest', 'Adamaoua', 'Centre'], ARRAY['saison sèche']),
('Arachide', 'Groundnut / Njangsa', 'legume', 'Légumineuse importante pour l''huile et la consommation', ARRAY['Nord', 'Extrême-Nord', 'Adamaoua', 'Centre'], ARRAY['avril-août']),
('Haricot', 'Koki / Beans', 'legume', 'Source de protéines végétales importante', ARRAY['Ouest', 'Nord-Ouest', 'Adamaoua'], ARRAY['mars-juin', 'septembre-novembre']),
('Igname', 'Yam', 'tuber', 'Tubercule noble, important dans la culture locale', ARRAY['Centre', 'Ouest', 'Nord-Ouest'], ARRAY['mars-novembre']),
('Macabo', 'Taro / Cocoyam', 'tuber', 'Tubercule traditionnel des zones forestières', ARRAY['Centre', 'Sud', 'Est', 'Littoral'], ARRAY['mars-octobre']);

-- Insert common diseases for major crops
INSERT INTO public.diseases (name, name_local, crop_id, description, symptoms, causes, severity) VALUES
('Pourriture brune des cabosses', 'Black pod', (SELECT id FROM public.crops WHERE name = 'Cacao'), 'Maladie fongique majeure du cacaoyer causant des pertes importantes', ARRAY['Taches brunes sur les cabosses', 'Pourriture progressive', 'Odeur de fermentation'], ARRAY['Champignon Phytophthora', 'Humidité excessive', 'Mauvaise aération'], 'high'),
('Swollen shoot', 'Virus du gonflement', (SELECT id FROM public.crops WHERE name = 'Cacao'), 'Maladie virale transmise par les cochenilles', ARRAY['Gonflement des rameaux', 'Déformation des feuilles', 'Déclin progressif'], ARRAY['Virus CSSV', 'Transmission par cochenilles'], 'critical'),
('Rouille du maïs', 'Corn rust', (SELECT id FROM public.crops WHERE name = 'Maïs'), 'Maladie fongique affectant les feuilles', ARRAY['Pustules orange sur les feuilles', 'Jaunissement', 'Dessèchement prématuré'], ARRAY['Champignon Puccinia', 'Humidité élevée', 'Températures modérées'], 'medium'),
('Striure du maïs', 'Maize streak virus', (SELECT id FROM public.crops WHERE name = 'Maïs'), 'Maladie virale transmise par la cicadelle', ARRAY['Stries jaunes sur les feuilles', 'Rabougrissement', 'Épis mal formés'], ARRAY['Virus MSV', 'Cicadelle vectrice'], 'high'),
('Mosaïque du manioc', 'Cassava mosaic', (SELECT id FROM public.crops WHERE name = 'Manioc'), 'Maladie virale très répandue', ARRAY['Mosaïque jaune-vert sur feuilles', 'Déformation foliaire', 'Réduction du rendement'], ARRAY['Virus CMD', 'Mouches blanches', 'Boutures infectées'], 'high'),
('Pourriture des racines du manioc', 'Root rot', (SELECT id FROM public.crops WHERE name = 'Manioc'), 'Maladie fongique des racines', ARRAY['Pourriture molle des tubercules', 'Odeur désagréable', 'Flétrissement'], ARRAY['Champignons du sol', 'Excès d''eau', 'Sol mal drainé'], 'high'),
('Cercosporiose', 'Black Sigatoka', (SELECT id FROM public.crops WHERE name = 'Banane Plantain'), 'Maladie fongique des feuilles très destructrice', ARRAY['Taches noires sur les feuilles', 'Nécrose foliaire', 'Maturation précoce des régimes'], ARRAY['Champignon Mycosphaerella', 'Humidité', 'Mauvaise circulation d''air'], 'high'),
('Mildiou de la tomate', 'Tomato late blight', (SELECT id FROM public.crops WHERE name = 'Tomate'), 'Maladie fongique dévastatrice', ARRAY['Taches huileuses sur feuilles', 'Pourriture des fruits', 'Dessèchement rapide'], ARRAY['Phytophthora infestans', 'Pluies', 'Températures fraîches'], 'critical');

-- Insert treatments for diseases
INSERT INTO public.treatments (disease_id, name, type, description, dosage, application_method, availability, price_range) VALUES
((SELECT id FROM public.diseases WHERE name = 'Pourriture brune des cabosses'), 'Bouillie bordelaise', 'chemical', 'Fongicide à base de cuivre efficace en préventif', '200g/20L d''eau', 'Pulvérisation sur cabosses', 'Disponible dans les agro-shops', '3000-5000 XAF'),
((SELECT id FROM public.diseases WHERE name = 'Pourriture brune des cabosses'), 'Récolte sanitaire', 'biological', 'Élimination et enfouissement des cabosses infectées', 'Toutes les 2 semaines', 'Ramassage manuel', 'Gratuit', '0 XAF'),
((SELECT id FROM public.diseases WHERE name = 'Rouille du maïs'), 'Mancozèbe 80%', 'chemical', 'Fongicide de contact efficace', '40g/20L d''eau', 'Pulvérisation foliaire', 'Disponible localement', '2500-4000 XAF'),
((SELECT id FROM public.diseases WHERE name = 'Mosaïque du manioc'), 'Boutures saines', 'biological', 'Utilisation de boutures certifiées indemnes', 'Replantation totale', 'Remplacement des plants', 'IRAD, centres agricoles', '100-200 XAF/bouture'),
((SELECT id FROM public.diseases WHERE name = 'Cercosporiose'), 'Huile de neem', 'biological', 'Traitement naturel préventif', '50ml/10L d''eau', 'Pulvérisation hebdomadaire', 'Marchés locaux', '2000-3500 XAF'),
((SELECT id FROM public.diseases WHERE name = 'Mildiou de la tomate'), 'Ridomil Gold', 'chemical', 'Fongicide systémique très efficace', '50g/20L d''eau', 'Pulvérisation tous les 7-14 jours', 'Agro-shops', '8000-12000 XAF'),
((SELECT id FROM public.diseases WHERE name = 'Mildiou de la tomate'), 'Cendres de bois', 'biological', 'Traitement traditionnel alcalinisant', '500g/10L d''eau', 'Pulvérisation sur feuilles', 'Disponible partout', 'Gratuit');

-- Insert market prices
INSERT INTO public.market_prices (crop_id, market_name, region, price_min, price_max, unit, quality_grade) VALUES
((SELECT id FROM public.crops WHERE name = 'Tomate'), 'Marché Mokolo', 'Centre', 300, 500, 'kg', 'A'),
((SELECT id FROM public.crops WHERE name = 'Tomate'), 'Marché Mokolo', 'Centre', 200, 350, 'kg', 'B'),
((SELECT id FROM public.crops WHERE name = 'Cacao'), 'Marché cacao Douala', 'Littoral', 1200, 1500, 'kg', 'A'),
((SELECT id FROM public.crops WHERE name = 'Cacao'), 'Marché cacao Douala', 'Littoral', 900, 1100, 'kg', 'B'),
((SELECT id FROM public.crops WHERE name = 'Maïs'), 'Marché Bafoussam', 'Ouest', 250, 350, 'kg', 'A'),
((SELECT id FROM public.crops WHERE name = 'Manioc'), 'Marché Mbalmayo', 'Centre', 150, 250, 'kg', 'A'),
((SELECT id FROM public.crops WHERE name = 'Banane Plantain'), 'Marché Sandaga', 'Littoral', 200, 400, 'régime', 'A'),
((SELECT id FROM public.crops WHERE name = 'Arachide'), 'Marché Garoua', 'Nord', 500, 700, 'kg', 'A');

-- Insert farming tips
INSERT INTO public.farming_tips (crop_id, category, title, content, region, season, language, priority) VALUES
((SELECT id FROM public.crops WHERE name = 'Cacao'), 'disease_prevention', 'Prévention de la pourriture brune', 'Taillez régulièrement vos cacaoyers pour améliorer l''aération. Récoltez les cabosses mûres rapidement et éliminez les cabosses malades.', 'Centre', 'saison des pluies', 'fr', 10),
((SELECT id FROM public.crops WHERE name = 'Tomate'), 'planting', 'Période de semis optimale', 'Semez vos tomates en début de saison sèche (novembre-décembre) pour une récolte en février-mars avec les meilleurs prix.', 'Ouest', 'saison sèche', 'fr', 8),
((SELECT id FROM public.crops WHERE name = 'Maïs'), 'fertilization', 'Fertilisation du maïs', 'Appliquez du compost au moment du labour et de l''urée au stade 6 feuilles pour un bon rendement.', NULL, 'toute saison', 'fr', 7),
(NULL, 'general', 'Rotation des cultures', 'Alternez les légumineuses (haricot, arachide) avec les céréales (maïs) pour enrichir naturellement votre sol en azote.', NULL, NULL, 'fr', 9);

-- Insert sample alerts
INSERT INTO public.agricultural_alerts (title, message, type, region, crop_id, severity, is_active, expires_at) VALUES
('Alerte pluies abondantes', 'Des pluies intenses sont prévues cette semaine. Protégez vos récoltes et évitez les traitements phytosanitaires.', 'weather', 'Centre', NULL, 'high', true, now() + interval '7 days'),
('Campagne cacao 2025', 'La campagne cacaoyère démarre. Assurez-vous que vos cabosses sont bien séchées pour obtenir le meilleur prix.', 'info', NULL, (SELECT id FROM public.crops WHERE name = 'Cacao'), 'medium', true, now() + interval '60 days');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_diseases_updated_at BEFORE UPDATE ON public.diseases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farming_tips_updated_at BEFORE UPDATE ON public.farming_tips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();