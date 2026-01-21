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
}

// Fallback translations (French) for offline/loading state
const fallbackTranslations: TranslationMap = {
  'nav.home': 'Accueil',
  'nav.diagnose': 'Diagnostic',
  'nav.assistant': 'Assistant',
  'nav.harvest': 'Récolte',
  'nav.history': 'Historique',
  'nav.tips': 'Conseils',
  'nav.settings': 'Paramètres',
  'nav.admin': 'Administration',
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
  'common.loading': 'Chargement...',
  'common.error': 'Une erreur est survenue',
  'common.retry': 'Réessayer',
  'common.offline': 'Vous êtes hors ligne',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.back': 'Retour',
  'common.next': 'Suivant',
  'settings.title': 'Paramètres',
  'settings.language': 'Langue',
  'settings.region': 'Région',
  'settings.notifications': 'Notifications',
  'settings.audio': 'Audio activé',
  'settings.data_saver': 'Mode économie données',
  'disease.title': 'Diagnostic des maladies',
  'disease.take_photo': 'Prendre une photo',
  'disease.upload': 'Importer une image',
  'disease.analyzing': 'Analyse en cours...',
  'disease.result': 'Résultat du diagnostic',
  'disease.severity': 'Gravité',
  'disease.causes': 'Causes probables',
  'disease.treatments': 'Traitements recommandés',
  'disease.prevention': 'Prévention',
  'disease.listen': 'Écouter les conseils',
  'harvest.title': 'Analyse de récolte',
  'harvest.grade': 'Classe de qualité',
  'harvest.use': 'Usage recommandé',
  'harvest.price': 'Prix estimé',
  'assistant.title': 'Assistant Agricole',
  'assistant.placeholder': 'Posez votre question...',
  'assistant.speak': 'Appuyez pour parler',
  'assistant.listening': 'Je vous écoute...',
  'severity.low': 'Faible',
  'severity.medium': 'Modéré',
  'severity.high': 'Élevé',
  'severity.critical': 'Critique',
  'grade.A': 'Excellente qualité - Export',
  'grade.B': 'Bonne qualité - Marché local',
  'grade.C': 'Qualité moyenne - Transformation',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('agrocamer-language');
    return saved || 'fr';
  });
  const [translations, setTranslations] = useState<TranslationMap>(fallbackTranslations);
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
        setTranslations(translationMap);
      } else {
        // If no translations found for this language, use fallback
        setTranslations(fallbackTranslations);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      setTranslations(fallbackTranslations);
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
    const translation = translations[key];
    if (translation) return translation;
    
    // Try fallback translations
    const fallbackTrans = fallbackTranslations[key];
    if (fallbackTrans) return fallbackTrans;
    
    // Return custom fallback or key
    if (fallback) return fallback;
    
    console.warn(`Missing translation: ${key} for language: ${language}`);
    return key;
  }, [translations, language]);

  const currentLanguageInfo = availableLanguages.find(l => l.code === language) || null;

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      availableLanguages, 
      isLoading,
      refreshLanguages,
      currentLanguageInfo
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
