
-- Ajouter de nouvelles cultures camerounaises
INSERT INTO public.crops (name, name_local, description, category, growing_season, regions) VALUES
('Avocat', 'Piya', 'Fruit riche en graisses saines, très cultivé dans les régions du Centre et de l''Ouest du Cameroun', 'fruit', ARRAY['Mars', 'Avril', 'Mai', 'Juin'], ARRAY['Centre', 'Ouest', 'Sud']),
('Papaye', 'Pawpaw', 'Fruit tropical riche en vitamines, cultivé dans toutes les régions du Cameroun', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Centre', 'Littoral', 'Sud', 'Est', 'Ouest']),
('Mangue', 'Mangoro', 'Fruit tropical sucré, abondant dans les régions du Nord et de l''Adamaoua', 'fruit', ARRAY['Février', 'Mars', 'Avril'], ARRAY['Nord', 'Adamaoua', 'Extrême-Nord', 'Centre']),
('Orange', 'Olendji', 'Agrume riche en vitamine C, cultivé dans les Hauts-Plateaux de l''Ouest', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Ouest', 'Nord-Ouest', 'Centre']),
('Citron', 'Lemon', 'Agrume acide utilisé en cuisine et médecine traditionnelle', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Ouest', 'Centre', 'Littoral']),
('Pamplemousse', 'Grapefruit', 'Gros agrume cultivé dans les régions du Centre et du Littoral', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Centre', 'Littoral', 'Ouest']),
('Banane douce', 'Banana', 'Fruit énergétique, base alimentaire dans le Sud et l''Est Cameroun', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Sud', 'Est', 'Centre', 'Littoral']),
('Ananas', 'Pineapple', 'Fruit tropical cultivé dans les régions du Littoral et du Sud', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Littoral', 'Sud', 'Centre']),
('Goyave', 'Guava', 'Petit fruit tropical riche en vitamine C, pousse à l''état sauvage et cultivé', 'fruit', ARRAY['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'], ARRAY['Centre', 'Littoral', 'Sud', 'Ouest']),
('Noix de cola', 'Kola', 'Noix stimulante utilisée dans les cérémonies traditionnelles', 'other', ARRAY['Avril', 'Mai', 'Juin'], ARRAY['Centre', 'Est', 'Sud', 'Littoral']),
('Safou', 'Prune africaine', 'Fruit oléagineux typiquement camerounais, très nutritif', 'fruit', ARRAY['Juillet', 'Août', 'Septembre'], ARRAY['Centre', 'Sud', 'Est', 'Littoral']),
('Ndolé', 'Vernonia', 'Légume-feuille emblématique de la cuisine camerounaise', 'vegetable', ARRAY['Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre'], ARRAY['Littoral', 'Centre', 'Sud', 'Ouest']),
('Igname', 'Yam', 'Tubercule riche en amidon, culture traditionnelle du Nord et de l''Ouest', 'tuber', ARRAY['Mars', 'Avril'], ARRAY['Nord', 'Ouest', 'Adamaoua', 'Centre']),
('Macabo', 'Cocoyam', 'Tubercule très consommé au Cameroun, riche en fibres', 'tuber', ARRAY['Mars', 'Avril', 'Mai'], ARRAY['Centre', 'Littoral', 'Sud', 'Ouest']),
('Piment', 'Pepper', 'Épice indispensable à la cuisine camerounaise', 'vegetable', ARRAY['Mars', 'Avril', 'Mai', 'Juin'], ARRAY['Ouest', 'Nord-Ouest', 'Centre', 'Littoral']),
('Gombo', 'Okra', 'Légume-fruit utilisé dans les sauces traditionnelles', 'vegetable', ARRAY['Mars', 'Avril', 'Mai', 'Juin'], ARRAY['Nord', 'Adamaoua', 'Centre', 'Ouest']),
('Pastèque', 'Watermelon', 'Fruit rafraîchissant cultivé dans le Nord et l''Extrême-Nord', 'fruit', ARRAY['Avril', 'Mai', 'Juin'], ARRAY['Nord', 'Extrême-Nord', 'Adamaoua'])
ON CONFLICT (name) DO NOTHING;

-- Maladies de l'avocat
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Anthracnose de l''avocat', 'Maladie noire', (SELECT id FROM crops WHERE name = 'Avocat'), 
 ARRAY['Taches noires sur les fruits', 'Pourriture du fruit', 'Chute prématurée des fruits', 'Lésions sur les feuilles'], 
 ARRAY['Champignon Colletotrichum gloeosporioides', 'Humidité élevée', 'Blessures sur les fruits'],
 'high', 'Maladie fongique majeure de l''avocat au Cameroun causant des pertes importantes'),
('Pourriture des racines Phytophthora', 'Maladie des racines', (SELECT id FROM crops WHERE name = 'Avocat'),
 ARRAY['Jaunissement des feuilles', 'Flétrissement de l''arbre', 'Racines brunes et pourries', 'Déclin progressif'],
 ARRAY['Champignon Phytophthora cinnamomi', 'Sol mal drainé', 'Excès d''eau'],
 'critical', 'Maladie racinaire grave pouvant tuer l''arbre'),
('Cercosporiose de l''avocat', 'Taches foliaires', (SELECT id FROM crops WHERE name = 'Avocat'),
 ARRAY['Taches brunes angulaires sur feuilles', 'Défoliation', 'Réduction de la production'],
 ARRAY['Champignon Cercospora purpurea', 'Conditions humides prolongées'],
 'medium', 'Maladie foliaire affectant la photosynthèse');

-- Maladies de la papaye
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Mosaïque de la papaye', 'Maladie du virus', (SELECT id FROM crops WHERE name = 'Papaye'),
 ARRAY['Mosaïque jaune-vert sur feuilles', 'Déformation des feuilles', 'Fruits déformés', 'Rabougrissement'],
 ARRAY['Papaya ringspot virus (PRSV)', 'Transmission par pucerons', 'Plantes infectées voisines'],
 'critical', 'Virus très répandu au Cameroun, pas de traitement curatif'),
('Anthracnose de la papaye', 'Pourriture des fruits', (SELECT id FROM crops WHERE name = 'Papaye'),
 ARRAY['Taches circulaires enfoncées sur fruits', 'Pourriture molle', 'Momification des fruits'],
 ARRAY['Champignon Colletotrichum gloeosporioides', 'Pluies fréquentes', 'Humidité élevée'],
 'high', 'Maladie fongique causant des pertes post-récolte importantes'),
('Oïdium de la papaye', 'Poudre blanche', (SELECT id FROM crops WHERE name = 'Papaye'),
 ARRAY['Poudre blanche sur feuilles', 'Jaunissement des feuilles', 'Chute des feuilles'],
 ARRAY['Champignon Oidium caricae', 'Temps sec et chaud', 'Faible humidité'],
 'medium', 'Maladie fongique affectant le feuillage');

-- Maladies de la mangue
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Anthracnose de la mangue', 'Maladie noire', (SELECT id FROM crops WHERE name = 'Mangue'),
 ARRAY['Taches noires sur fruits', 'Pourriture des fleurs', 'Dessèchement des rameaux', 'Chute des fruits'],
 ARRAY['Champignon Colletotrichum gloeosporioides', 'Pluies pendant floraison', 'Forte humidité'],
 'high', 'Principale maladie de la mangue au Cameroun'),
('Bactériose de la mangue', 'Chancre bactérien', (SELECT id FROM crops WHERE name = 'Mangue'),
 ARRAY['Taches noires angulaires', 'Écoulement de gomme', 'Chancres sur rameaux', 'Chute des fruits'],
 ARRAY['Bactérie Xanthomonas campestris', 'Blessures', 'Conditions humides'],
 'high', 'Maladie bactérienne grave à déclaration obligatoire'),
('Mouche des fruits', 'Ver de la mangue', (SELECT id FROM crops WHERE name = 'Mangue'),
 ARRAY['Piqûres sur fruits', 'Pourriture interne', 'Chute prématurée', 'Présence de larves'],
 ARRAY['Mouches Bactrocera et Ceratitis', 'Fruits mûrs non récoltés', 'Absence de piégeage'],
 'critical', 'Ravageur majeur causant jusqu''à 80% de pertes');

-- Maladies des agrumes
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Greening des agrumes', 'Maladie du dragon jaune', (SELECT id FROM crops WHERE name = 'Orange'),
 ARRAY['Jaunissement asymétrique des feuilles', 'Fruits déformés et amers', 'Déclin de l''arbre', 'Graines avortées'],
 ARRAY['Bactérie Candidatus Liberibacter', 'Psylle vecteur Diaphorina citri'],
 'critical', 'Maladie bactérienne incurable, menace majeure pour les agrumes'),
('Gommose des agrumes', 'Maladie de la gomme', (SELECT id FROM crops WHERE name = 'Orange'),
 ARRAY['Écoulement de gomme au collet', 'Écorce qui se décolle', 'Jaunissement du feuillage', 'Dépérissement'],
 ARRAY['Champignon Phytophthora spp.', 'Sol mal drainé', 'Blessures au collet'],
 'high', 'Maladie fongique du tronc et des racines'),
('Chancre citrique', 'Gale des agrumes', (SELECT id FROM crops WHERE name = 'Citron'),
 ARRAY['Lésions liégeuses sur feuilles', 'Cratères sur fruits', 'Chute des feuilles', 'Défoliation'],
 ARRAY['Bactérie Xanthomonas citri', 'Pluies battantes', 'Vents forts'],
 'high', 'Maladie bactérienne très contagieuse'),
('Cochenilles des agrumes', 'Poux des oranges', (SELECT id FROM crops WHERE name = 'Pamplemousse'),
 ARRAY['Amas cotonneux sur branches', 'Fumagine noire', 'Affaiblissement de l''arbre', 'Chute des fruits'],
 ARRAY['Insectes Planococcus et Icerya', 'Stress hydrique', 'Absence d''ennemis naturels'],
 'medium', 'Ravageurs suceurs affaiblissant les arbres');

-- Maladies de la banane douce
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Fusariose de la banane', 'Maladie de Panama', (SELECT id FROM crops WHERE name = 'Banane douce'),
 ARRAY['Jaunissement des feuilles basses', 'Fente du pseudo-tronc', 'Brunissement vasculaire', 'Mort du plant'],
 ARRAY['Champignon Fusarium oxysporum', 'Sol contaminé', 'Outils non désinfectés'],
 'critical', 'Maladie du sol incurable, menace mondiale pour les bananes'),
('Cercosporiose noire', 'Maladie des raies noires', (SELECT id FROM crops WHERE name = 'Banane douce'),
 ARRAY['Raies noires sur feuilles', 'Nécrose foliaire', 'Maturation précoce des fruits', 'Réduction du rendement'],
 ARRAY['Champignon Mycosphaerella fijiensis', 'Humidité élevée', 'Température chaude'],
 'high', 'Principale maladie foliaire de la banane en Afrique'),
('Charançon du bananier', 'Ver du bananier', (SELECT id FROM crops WHERE name = 'Banane douce'),
 ARRAY['Galeries dans le bulbe', 'Chute des plants', 'Pourriture du bulbe', 'Retard de croissance'],
 ARRAY['Insecte Cosmopolites sordidus', 'Rejets infestés', 'Débris de culture'],
 'high', 'Ravageur majeur du bananier au Cameroun');

-- Maladies de l'ananas
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Pourriture du cœur', 'Maladie du cœur', (SELECT id FROM crops WHERE name = 'Ananas'),
 ARRAY['Pourriture du cœur', 'Odeur fétide', 'Feuilles qui se détachent', 'Mort du plant'],
 ARRAY['Champignon Phytophthora', 'Excès d''eau', 'Sol mal drainé'],
 'high', 'Maladie fongique des sols lourds'),
('Cochenille de l''ananas', 'Pou de l''ananas', (SELECT id FROM crops WHERE name = 'Ananas'),
 ARRAY['Flétrissement', 'Rougissement des feuilles', 'Retard de croissance', 'Amas cotonneux sur racines'],
 ARRAY['Insecte Dysmicoccus brevipes', 'Fourmis associées', 'Plants infestés'],
 'medium', 'Ravageur transmettant le virus du wilt');

-- Maladies de l'igname
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Anthracnose de l''igname', 'Brûlure des feuilles', (SELECT id FROM crops WHERE name = 'Igname'),
 ARRAY['Taches brunes sur feuilles', 'Dessèchement des tiges', 'Nécrose des tubercules', 'Pourriture au stockage'],
 ARRAY['Champignon Colletotrichum gloeosporioides', 'Pluies fréquentes', 'Semences infectées'],
 'high', 'Principale maladie foliaire de l''igname'),
('Pourriture sèche de l''igname', 'Maladie du tubercule', (SELECT id FROM crops WHERE name = 'Igname'),
 ARRAY['Pourriture sèche des tubercules', 'Cavités dans la chair', 'Momification', 'Perte de poids'],
 ARRAY['Champignons Aspergillus et Penicillium', 'Blessures à la récolte', 'Mauvais stockage'],
 'high', 'Maladie de stockage causant de lourdes pertes');

-- Maladies du macabo
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Pourriture racinaire du macabo', 'Maladie des racines', (SELECT id FROM crops WHERE name = 'Macabo'),
 ARRAY['Jaunissement des feuilles', 'Flétrissement', 'Pourriture des cormes', 'Odeur désagréable'],
 ARRAY['Champignon Pythium', 'Sol gorgé d''eau', 'Mauvais drainage'],
 'high', 'Maladie fongique des sols humides'),
('Virus de la mosaïque du taro', 'Mosaïque du macabo', (SELECT id FROM crops WHERE name = 'Macabo'),
 ARRAY['Mosaïque sur feuilles', 'Déformation foliaire', 'Rabougrissement', 'Réduction du rendement'],
 ARRAY['DsMV virus', 'Pucerons vecteurs', 'Boutures infectées'],
 'medium', 'Maladie virale réduisant la production');

-- Maladies du piment
INSERT INTO public.diseases (name, name_local, crop_id, symptoms, causes, severity, description) VALUES
('Anthracnose du piment', 'Maladie des taches', (SELECT id FROM crops WHERE name = 'Piment'),
 ARRAY['Taches circulaires sur fruits', 'Pourriture des fruits', 'Chute des fruits', 'Lésions sur tiges'],
 ARRAY['Champignon Colletotrichum', 'Pluies fréquentes', 'Semences contaminées'],
 'high', 'Principale maladie du piment au Cameroun'),
('Flétrissement bactérien du piment', 'Maladie du flétrissement', (SELECT id FROM crops WHERE name = 'Piment'),
 ARRAY['Flétrissement brutal', 'Brunissement vasculaire', 'Mort rapide du plant'],
 ARRAY['Bactérie Ralstonia solanacearum', 'Sol contaminé', 'Rotation insuffisante'],
 'critical', 'Maladie bactérienne du sol sans traitement curatif');

-- Traitements pour les nouvelles maladies
INSERT INTO public.treatments (disease_id, type, name, description, application_method, dosage) VALUES
-- Avocat
((SELECT id FROM diseases WHERE name = 'Anthracnose de l''avocat'), 'biological', 'Bouillie bordelaise', 'Fongicide à base de cuivre efficace contre l''anthracnose', 'Pulvérisation foliaire et sur fruits', '10-20g/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Anthracnose de l''avocat'), 'chemical', 'Mancozèbe', 'Fongicide de contact à large spectre', 'Pulvérisation préventive tous les 10-14 jours', '2-3g/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Pourriture des racines Phytophthora'), 'biological', 'Amélioration du drainage', 'Surélever les planches et ajouter du compost pour améliorer le drainage', 'Travail du sol autour des arbres', 'Incorporer 5-10kg de compost par arbre'),
((SELECT id FROM diseases WHERE name = 'Pourriture des racines Phytophthora'), 'chemical', 'Aliette (Fosétyl-Al)', 'Fongicide systémique anti-Phytophthora', 'Application au sol ou injection', '2-3g/L en arrosage'),

-- Papaye
((SELECT id FROM diseases WHERE name = 'Mosaïque de la papaye'), 'biological', 'Arrachage des plants malades', 'Élimination des sources d''inoculum viral', 'Arrachage et brûlage immédiat', 'Tous les plants infectés'),
((SELECT id FROM diseases WHERE name = 'Mosaïque de la papaye'), 'biological', 'Lutte contre les pucerons', 'Pulvérisation de savon noir ou huile de neem', 'Pulvérisation foliaire hebdomadaire', '30ml savon noir/L eau'),
((SELECT id FROM diseases WHERE name = 'Anthracnose de la papaye'), 'chemical', 'Chlorothalonil', 'Fongicide de contact préventif', 'Pulvérisation sur fruits tous les 7-10 jours', '2g/L d''eau'),

-- Mangue
((SELECT id FROM diseases WHERE name = 'Anthracnose de la mangue'), 'biological', 'Bouillie bordelaise', 'Traitement cuprique préventif avant et après floraison', 'Pulvérisation avant les pluies', '10-15g/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Anthracnose de la mangue'), 'chemical', 'Carbendazime', 'Fongicide systémique curatif', 'Pulvérisation foliaire tous les 14 jours', '1g/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Mouche des fruits'), 'biological', 'Piégeage avec attractifs', 'Pièges à phéromones ou appâts protéiques', 'Suspension dans les arbres, renouveler toutes les 2 semaines', '4-6 pièges par hectare'),
((SELECT id FROM diseases WHERE name = 'Mouche des fruits'), 'chemical', 'Appât empoisonné (spinosad)', 'Insecticide biologique en appât localisé', 'Pulvérisation par taches sur feuillage', '0.5L/ha par semaine'),

-- Agrumes
((SELECT id FROM diseases WHERE name = 'Greening des agrumes'), 'biological', 'Arrachage des arbres malades', 'Élimination des sources de contamination', 'Arrachage et brûlage immédiat', 'Tous les arbres infectés'),
((SELECT id FROM diseases WHERE name = 'Gommose des agrumes'), 'biological', 'Badigeonnage au cuivre', 'Pâte de bouillie bordelaise appliquée après curetage', 'Application au pinceau sur les lésions', 'Pâte épaisse 100g/L'),
((SELECT id FROM diseases WHERE name = 'Gommose des agrumes'), 'chemical', 'Aliette', 'Fongicide systémique anti-Phytophthora', 'Application au sol tous les 3 mois', '3g/L en arrosage'),
((SELECT id FROM diseases WHERE name = 'Chancre citrique'), 'chemical', 'Oxychlorure de cuivre', 'Bactéricide préventif', 'Pulvérisation après chaque pluie', '3-5g/L d''eau'),

-- Banane
((SELECT id FROM diseases WHERE name = 'Fusariose de la banane'), 'biological', 'Variétés résistantes', 'Planter des variétés tolérantes comme FHIA', 'Remplacement progressif lors de la replantation', 'Rejets certifiés'),
((SELECT id FROM diseases WHERE name = 'Cercosporiose noire'), 'biological', 'Effeuillage sanitaire', 'Élimination hebdomadaire des feuilles atteintes', 'Coupe et destruction par brûlage', 'Toutes les feuilles avec plus de 15% de surface atteinte'),
((SELECT id FROM diseases WHERE name = 'Cercosporiose noire'), 'chemical', 'Propiconazole', 'Fongicide systémique efficace', 'Pulvérisation foliaire tous les 21-28 jours', '1ml/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Charançon du bananier'), 'biological', 'Pièges à phéromones', 'Capture des adultes pour réduire la population', 'Pièges autour des plants, relever toutes les 2 semaines', '4 pièges par hectare'),
((SELECT id FROM diseases WHERE name = 'Charançon du bananier'), 'biological', 'Parage des bulbes', 'Nettoyage des rejets avant plantation', 'Trempage dans eau chaude à 52°C pendant 20 minutes', 'Tous les rejets avant plantation'),

-- Igname et Macabo
((SELECT id FROM diseases WHERE name = 'Anthracnose de l''igname'), 'chemical', 'Mancozèbe', 'Fongicide préventif à large spectre', 'Pulvérisation foliaire tous les 10-14 jours', '2-3g/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Pourriture sèche de l''igname'), 'biological', 'Cendres de bois', 'Protection naturelle des tubercules au stockage', 'Saupoudrage sur les tubercules après séchage', '50g par kg de tubercules'),
((SELECT id FROM diseases WHERE name = 'Pourriture racinaire du macabo'), 'biological', 'Amélioration du drainage', 'Culture sur billons surélevés', 'Travail du sol à la plantation', 'Billons de 30-40cm de hauteur'),

-- Piment
((SELECT id FROM diseases WHERE name = 'Anthracnose du piment'), 'biological', 'Semences saines', 'Utiliser des semences certifiées ou traitées', 'Traitement des semences au thirame avant semis', '3g/kg de semences'),
((SELECT id FROM diseases WHERE name = 'Anthracnose du piment'), 'chemical', 'Chlorothalonil', 'Fongicide de contact préventif', 'Pulvérisation préventive tous les 7-10 jours', '2g/L d''eau'),
((SELECT id FROM diseases WHERE name = 'Flétrissement bactérien du piment'), 'biological', 'Rotation culturale', 'Éviter les solanacées pendant 3-4 ans sur la même parcelle', 'Planification des cultures pluriannuelle', 'Rotation avec céréales ou légumineuses');
