import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface AppLanguage {
  id: string;
  code: string;
  name: string;
  native_name: string;
  flag: string;
  is_active: boolean;
  is_default: boolean;
  translation_progress: number;
  // New metadata fields
  dialect_info?: string;
  script_type?: string;
  text_direction?: string;
  tts_enabled?: boolean;
  tts_voice_id?: string;
  region?: string;
  iso_639_3?: string;
}

export interface TranslationEntry {
  key: string;
  value: string;
  pronunciation?: string;
  audio_url?: string;
  is_ai_generated?: boolean;
  is_validated?: boolean;
}

interface TranslationMap {
  [key: string]: string;
}

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  availableLanguages: AppLanguage[];
  isLoading: boolean;
  refreshLanguages: () => Promise<void>;
  currentLanguageInfo: AppLanguage | null;
  getLanguageName: () => string;
  getNativeLanguageName: () => string;
}

// Complete fallback translations - French as default, English included
const fallbackTranslations: { [lang: string]: TranslationMap } = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.diagnose': 'Diagnostic',
    'nav.assistant': 'Assistant',
    'nav.harvest': 'Récolte',
    'nav.history': 'Historique',
    'nav.tips': 'Conseils',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Administration',
    
    // Home
    'home.welcome': 'Bienvenue sur AgroCamer',
    'home.subtitle': 'Votre assistant agricole intelligent',
    'home.diagnose.title': 'Diagnostiquer une plante',
    'home.diagnose.desc': 'Prenez une photo pour identifier les maladies',
    'home.assistant.title': 'Parler à l\'assistant',
    'home.assistant.desc': 'Posez vos questions en voix ou texte',
    'home.harvest.title': 'Analyser une récolte',
    'home.harvest.desc': 'Évaluez la qualité de vos produits',
    'home.tips.title': 'Conseils agricoles',
    'home.tips.desc': 'Guides et bonnes pratiques locales',
    'home.activity.title': 'Votre activité',
    'home.activity.login': 'Connectez-vous pour suivre votre activité',
    'home.activity.diagnostics': 'Diagnostics',
    'home.activity.analyses': 'Analyses',
    'home.activity.tips': 'Conseils lus',
    
    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.retry': 'Réessayer',
    'common.offline': 'Vous êtes hors ligne',
    'common.online': 'En ligne',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.change': 'Changer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.close': 'Fermer',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.reset': 'Réinitialiser',
    'common.new': 'Nouveau',
    'common.view': 'Voir',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.language': 'Langue',
    'settings.region': 'Région',
    'settings.notifications': 'Notifications',
    'settings.audio': 'Audio activé',
    'settings.data_saver': 'Mode économie données',
    'settings.preferences': 'Préférences',
    'settings.location': 'Localisation',
    'settings.location.configured': 'Configuré',
    'settings.location.not_configured': 'Non configuré',
    'settings.admin_space': 'Espace Administrateur',
    'settings.help': 'Aide & Support',
    'settings.faq': 'FAQ',
    'settings.tutorials': 'Tutoriels',
    'settings.contact': 'Contacter le support',
    'settings.logout': 'Déconnexion',
    'settings.version': 'Version',
    
    // Disease/Diagnosis
    'disease.title': 'Diagnostic des maladies',
    'disease.take_photo': 'Prendre une photo',
    'disease.upload': 'Importer une image',
    'disease.analyzing': 'Analyse en cours...',
    'disease.result': 'Résultat du diagnostic',
    'disease.severity': 'Gravité',
    'disease.causes': 'Causes probables',
    'disease.treatments': 'Traitements recommandés',
    'disease.treatments.bio': 'Traitements biologiques',
    'disease.treatments.chem': 'Traitements chimiques',
    'disease.prevention': 'Prévention',
    'disease.listen': 'Écouter les conseils',
    'disease.maintenance': 'Entretien recommandé',
    'disease.healthy': 'Plante en bonne santé',
    'disease.healthy.desc': 'Votre plante semble être en bonne santé',
    'disease.select_crop': 'Sélectionner une culture',
    'disease.auto_detect': 'Détection automatique',
    'disease.confidence': 'confiance',
    'disease.new_diagnosis': 'Nouveau diagnostic',
    'disease.symptoms': 'Symptômes',
    'disease.share': 'Partager le diagnostic',
    
    // Harvest
    'harvest.title': 'Analyse de récolte',
    'harvest.grade': 'Classe de qualité',
    'harvest.use': 'Usage recommandé',
    'harvest.price': 'Prix estimé',
    'harvest.analyze': 'Analyser la qualité',
    'harvest.ai_info': 'L\'IA analysera qualité, rendement et prix',
    'harvest.complete_analysis': 'Analyse complète de récolte',
    'harvest.quality_sorting': 'Tri qualitatif pour la vente (Grade A, B, C)',
    'harvest.price_estimation': 'Estimation du prix sur les marchés locaux',
    'harvest.yield_estimation': 'Estimation du rendement (pour semences)',
    'harvest.selling_strategy': 'Stratégie de vente optimale',
    'harvest.take_photo': 'Prendre une photo',
    'harvest.upload': 'Importer une image',
    'harvest.analyzing': 'Analyse en cours...',
    'harvest.quality_yield_price': 'Qualité, rendement et prix estimés',
    'harvest.issues': 'Problèmes détectés',
    'harvest.quality_criteria': 'Critères de qualité',
    'harvest.color': 'Couleur',
    'harvest.size': 'Taille',
    'harvest.uniformity': 'Uniformité',
    'harvest.maturity': 'Maturité',
    'harvest.moisture': 'Humidité',
    'harvest.cleanliness': 'Propreté',
    'harvest.defects': 'Défauts',
    'harvest.yield': 'Estimation du rendement',
    'harvest.estimated_yield': 'Rendement estimé',
    'harvest.potential': 'Potentiel',
    'harvest.yield_factors': 'Facteurs de rendement',
    'harvest.optimization': 'Optimisation',
    'harvest.selling': 'Stratégie de vente',
    'harvest.best_time': 'Meilleur moment pour vendre',
    'harvest.target_buyers': 'Acheteurs cibles',
    'harvest.negotiation_tips': 'Conseils de négociation',
    'harvest.improve_future': 'Améliorer les prochaines récoltes',
    'harvest.storage_tips': 'Conseils de stockage',
    'harvest.new_analysis': 'Nouvelle analyse',
    
    // Yield potential
    'yield.low': 'Faible',
    'yield.medium': 'Moyen',
    'yield.high': 'Élevé',
    'yield.excellent': 'Excellent',
    
    // Grades
    'grade.A': 'Excellente qualité - Export',
    'grade.B': 'Bonne qualité - Marché local',
    'grade.C': 'Qualité moyenne - Transformation',
    
    // Severity
    'severity.healthy': 'Excellente santé',
    'severity.low': 'Faible risque',
    'severity.medium': 'Risque modéré',
    'severity.high': 'Risque élevé',
    'severity.critical': 'Critique',
    
    // Assistant
    'assistant.title': 'Assistant Agricole',
    'assistant.placeholder': 'Posez votre question...',
    'assistant.speak': 'Appuyez pour parler',
    'assistant.listening': 'Je vous écoute...',
    'assistant.send': 'Envoyer',
    
    // Network
    'network.offline': 'Hors ligne',
    'network.online': 'En ligne',
    'network.attempt': 'Tentative',
    'network.no_connection': 'Pas de connexion internet. Veuillez réessayer.',
    
    // Compression
    'compression.waiting': 'En attente...',
    'compression.reading': 'Lecture de l\'image...',
    'compression.resizing': 'Redimensionnement...',
    'compression.compressing': 'Compression optimale...',
    'compression.ready': 'Image prête !',
    'compression.error': 'Erreur de compression',
    'compression.preparing': 'Préparation pour l\'analyse IA...',
    
    // History
    'history.title': 'Historique',
    'history.diagnoses': 'Diagnostics',
    'history.harvests': 'Récoltes',
    'history.empty': 'Aucune activité trouvée',
    'history.view_details': 'Voir les détails',
    'history.download_pdf': 'Télécharger PDF',
    'history.clear': 'Effacer l\'historique',
    
    // Tips
    'tips.title': 'Conseils agricoles',
    'tips.seasonal': 'Saisonniers',
    'tips.crops': 'Cultures',
    'tips.region': 'Par région',
    'tips.guides': 'Guides',
    'tips.read_time': 'min de lecture',
    
    // Weather
    'weather.loading': 'Chargement météo...',
    'weather.error': 'Erreur météo',
    'weather.humidity': 'Humidité',
    'weather.wind': 'Vent',
    'weather.rain': 'Pluie',
    'weather.advice': 'Conseil agricole',
    
    // Auth
    'auth.login': 'Connexion',
    'auth.signup': 'Inscription',
    'auth.logout': 'Déconnexion',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.forgot_password': 'Mot de passe oublié ?',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.diagnose': 'Diagnose',
    'nav.assistant': 'Assistant',
    'nav.harvest': 'Harvest',
    'nav.history': 'History',
    'nav.tips': 'Tips',
    'nav.settings': 'Settings',
    'nav.admin': 'Administration',
    
    // Home
    'home.welcome': 'Welcome to AgroCamer',
    'home.subtitle': 'Your intelligent agricultural assistant',
    'home.diagnose.title': 'Diagnose a plant',
    'home.diagnose.desc': 'Take a photo to identify diseases',
    'home.assistant.title': 'Talk to assistant',
    'home.assistant.desc': 'Ask your questions by voice or text',
    'home.harvest.title': 'Analyze a harvest',
    'home.harvest.desc': 'Evaluate the quality of your products',
    'home.tips.title': 'Farming tips',
    'home.tips.desc': 'Local guides and best practices',
    'home.activity.title': 'Your activity',
    'home.activity.login': 'Log in to track your activity',
    'home.activity.diagnostics': 'Diagnostics',
    'home.activity.analyses': 'Analyses',
    'home.activity.tips': 'Tips read',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.offline': 'You are offline',
    'common.online': 'Online',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.change': 'Change',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.reset': 'Reset',
    'common.new': 'New',
    'common.view': 'View',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.region': 'Region',
    'settings.notifications': 'Notifications',
    'settings.audio': 'Audio enabled',
    'settings.data_saver': 'Data saver mode',
    'settings.preferences': 'Preferences',
    'settings.location': 'Location',
    'settings.location.configured': 'Configured',
    'settings.location.not_configured': 'Not configured',
    'settings.admin_space': 'Admin Space',
    'settings.help': 'Help & Support',
    'settings.faq': 'FAQ',
    'settings.tutorials': 'Tutorials',
    'settings.contact': 'Contact support',
    'settings.logout': 'Logout',
    'settings.version': 'Version',
    
    // Disease/Diagnosis
    'disease.title': 'Disease Diagnosis',
    'disease.take_photo': 'Take a photo',
    'disease.upload': 'Upload image',
    'disease.analyzing': 'Analyzing...',
    'disease.result': 'Diagnosis Result',
    'disease.severity': 'Severity',
    'disease.causes': 'Probable causes',
    'disease.treatments': 'Recommended treatments',
    'disease.treatments.bio': 'Biological treatments',
    'disease.treatments.chem': 'Chemical treatments',
    'disease.prevention': 'Prevention',
    'disease.listen': 'Listen to advice',
    'disease.maintenance': 'Recommended maintenance',
    'disease.healthy': 'Healthy plant',
    'disease.healthy.desc': 'Your plant appears to be healthy',
    'disease.select_crop': 'Select a crop',
    'disease.auto_detect': 'Auto-detect',
    'disease.confidence': 'confidence',
    'disease.new_diagnosis': 'New diagnosis',
    'disease.symptoms': 'Symptoms',
    'disease.share': 'Share diagnosis',
    
    // Harvest
    'harvest.title': 'Harvest Analysis',
    'harvest.grade': 'Quality Grade',
    'harvest.use': 'Recommended Use',
    'harvest.price': 'Estimated Price',
    'harvest.analyze': 'Analyze quality',
    'harvest.ai_info': 'AI will analyze quality, yield and price',
    'harvest.complete_analysis': 'Complete harvest analysis',
    'harvest.quality_sorting': 'Quality sorting for sales (Grade A, B, C)',
    'harvest.price_estimation': 'Local market price estimation',
    'harvest.yield_estimation': 'Yield estimation (for seeds)',
    'harvest.selling_strategy': 'Optimal selling strategy',
    'harvest.take_photo': 'Take a photo',
    'harvest.upload': 'Upload image',
    'harvest.analyzing': 'Analyzing...',
    'harvest.quality_yield_price': 'Quality, yield and price estimation',
    'harvest.issues': 'Issues detected',
    'harvest.quality_criteria': 'Quality criteria',
    'harvest.color': 'Color',
    'harvest.size': 'Size',
    'harvest.uniformity': 'Uniformity',
    'harvest.maturity': 'Maturity',
    'harvest.moisture': 'Moisture',
    'harvest.cleanliness': 'Cleanliness',
    'harvest.defects': 'Defects',
    'harvest.yield': 'Yield Estimation',
    'harvest.estimated_yield': 'Estimated yield',
    'harvest.potential': 'Potential',
    'harvest.yield_factors': 'Yield factors',
    'harvest.optimization': 'Optimization',
    'harvest.selling': 'Selling Strategy',
    'harvest.best_time': 'Best time to sell',
    'harvest.target_buyers': 'Target buyers',
    'harvest.negotiation_tips': 'Negotiation tips',
    'harvest.improve_future': 'Improve future harvests',
    'harvest.storage_tips': 'Storage tips',
    'harvest.new_analysis': 'New analysis',
    
    // Yield potential
    'yield.low': 'Low',
    'yield.medium': 'Medium',
    'yield.high': 'High',
    'yield.excellent': 'Excellent',
    
    // Grades
    'grade.A': 'Excellent quality - Export',
    'grade.B': 'Good quality - Local market',
    'grade.C': 'Average quality - Processing',
    
    // Severity
    'severity.healthy': 'Excellent health',
    'severity.low': 'Low risk',
    'severity.medium': 'Moderate risk',
    'severity.high': 'High risk',
    'severity.critical': 'Critical',
    
    // Assistant
    'assistant.title': 'Agricultural Assistant',
    'assistant.placeholder': 'Ask your question...',
    'assistant.speak': 'Press to speak',
    'assistant.listening': 'Listening...',
    'assistant.send': 'Send',
    
    // Network
    'network.offline': 'Offline',
    'network.online': 'Online',
    'network.attempt': 'Attempt',
    'network.no_connection': 'No internet connection. Please try again.',
    
    // Compression
    'compression.waiting': 'Waiting...',
    'compression.reading': 'Reading image...',
    'compression.resizing': 'Resizing...',
    'compression.compressing': 'Optimal compression...',
    'compression.ready': 'Image ready!',
    'compression.error': 'Compression error',
    'compression.preparing': 'Preparing for AI analysis...',
    
    // History
    'history.title': 'History',
    'history.diagnoses': 'Diagnoses',
    'history.harvests': 'Harvests',
    'history.empty': 'No activity found',
    'history.view_details': 'View details',
    'history.download_pdf': 'Download PDF',
    'history.clear': 'Clear history',
    
    // Tips
    'tips.title': 'Farming Tips',
    'tips.seasonal': 'Seasonal',
    'tips.crops': 'Crops',
    'tips.region': 'By region',
    'tips.guides': 'Guides',
    'tips.read_time': 'min read',
    
    // Weather
    'weather.loading': 'Loading weather...',
    'weather.error': 'Weather error',
    'weather.humidity': 'Humidity',
    'weather.wind': 'Wind',
    'weather.rain': 'Rain',
    'weather.advice': 'Agricultural advice',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign up',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgot_password': 'Forgot password?',
  },
};

// Get language name for AI prompts
const languageNames: { [key: string]: { name: string; nativeName: string } } = {
  fr: { name: 'French', nativeName: 'Français' },
  en: { name: 'English', nativeName: 'English' },
  ghomala: { name: 'Ghomala', nativeName: 'Ghɔmálá\'' },
  ewondo: { name: 'Ewondo', nativeName: 'Ewondo' },
  fulfulde: { name: 'Fulfulde', nativeName: 'Fulfulde' },
  duala: { name: 'Duala', nativeName: 'Duálá' },
  basaa: { name: 'Basaa', nativeName: 'Basaa' },
  bamileke: { name: 'Bamileke', nativeName: 'Bamiléké' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('agrocamer-language');
    return saved || 'fr';
  });
  const [translations, setTranslations] = useState<TranslationMap>(fallbackTranslations['fr']);
  const [availableLanguages, setAvailableLanguages] = useState<AppLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available languages
  const loadLanguages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_languages')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setAvailableLanguages(data as AppLanguage[]);
      }
    } catch (error) {
      console.error('Error loading languages:', error);
      // Keep default languages as fallback
      setAvailableLanguages([
        { id: '1', code: 'fr', name: 'French', native_name: 'Français', flag: '🇫🇷', is_active: true, is_default: true, translation_progress: 100 },
        { id: '2', code: 'en', name: 'English', native_name: 'English', flag: '🇬🇧', is_active: true, is_default: false, translation_progress: 100 },
      ]);
    }
  }, []);

  // Load translations for current language
  const loadTranslations = useCallback(async (langCode: string) => {
    try {
      const { data, error } = await supabase
        .from('app_translations')
        .select('translation_key, translation_value')
        .eq('language_code', langCode);

      if (error) throw error;

      if (data && data.length > 0) {
        const translationMap: TranslationMap = {};
        data.forEach(item => {
          translationMap[item.translation_key] = item.translation_value;
        });
        // Merge with fallback to ensure all keys exist
        const fallback = fallbackTranslations[langCode] || fallbackTranslations['fr'];
        setTranslations({ ...fallback, ...translationMap });
      } else {
        // If no translations found for this language, use fallback
        setTranslations(fallbackTranslations[langCode] || fallbackTranslations['fr']);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      setTranslations(fallbackTranslations[langCode] || fallbackTranslations['fr']);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await loadLanguages();
      await loadTranslations(language);
    };
    init();
  }, []);

  // Reload translations when language changes
  useEffect(() => {
    loadTranslations(language);
    localStorage.setItem('agrocamer-language', language);
    document.documentElement.lang = language;
  }, [language, loadTranslations]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  const refreshLanguages = useCallback(async () => {
    setIsLoading(true);
    await loadLanguages();
    await loadTranslations(language);
  }, [language, loadLanguages, loadTranslations]);

  const t = useCallback((key: string, fallback?: string): string => {
    // Check current translations first
    const translation = translations[key];
    if (translation) return translation;
    
    // Try language-specific fallback
    const langFallback = fallbackTranslations[language]?.[key];
    if (langFallback) return langFallback;
    
    // Try French fallback
    const frFallback = fallbackTranslations['fr'][key];
    if (frFallback) return frFallback;
    
    // Return custom fallback or key
    if (fallback) return fallback;
    
    // Log missing translation in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing translation: ${key} for language: ${language}`);
    }
    
    return key;
  }, [translations, language]);

  // Get the full language name (for AI prompts)
  const getLanguageName = useCallback((): string => {
    const langInfo = availableLanguages.find(l => l.code === language);
    if (langInfo) return langInfo.name;
    return languageNames[language]?.name || 'French';
  }, [language, availableLanguages]);

  // Get the native language name
  const getNativeLanguageName = useCallback((): string => {
    const langInfo = availableLanguages.find(l => l.code === language);
    if (langInfo) return langInfo.native_name;
    return languageNames[language]?.nativeName || 'Français';
  }, [language, availableLanguages]);

  const currentLanguageInfo = availableLanguages.find(l => l.code === language) || null;

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      availableLanguages, 
      isLoading,
      refreshLanguages,
      currentLanguageInfo,
      getLanguageName,
      getNativeLanguageName
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
