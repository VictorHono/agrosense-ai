import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/types';

interface Translations {
  [key: string]: {
    fr: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.home': { fr: 'Accueil', en: 'Home' },
  'nav.diagnose': { fr: 'Diagnostic', en: 'Diagnose' },
  'nav.assistant': { fr: 'Assistant', en: 'Assistant' },
  'nav.harvest': { fr: 'Récolte', en: 'Harvest' },
  'nav.history': { fr: 'Historique', en: 'History' },
  'nav.tips': { fr: 'Conseils', en: 'Tips' },
  'nav.settings': { fr: 'Paramètres', en: 'Settings' },
  'nav.admin': { fr: 'Administration', en: 'Admin' },

  // Home
  'home.welcome': { fr: 'Bienvenue sur AgroCamer', en: 'Welcome to AgroCamer' },
  'home.subtitle': { fr: 'Votre assistant agricole intelligent', en: 'Your intelligent farming assistant' },
  'home.diagnose.title': { fr: 'Diagnostiquer une plante', en: 'Diagnose a plant' },
  'home.diagnose.desc': { fr: 'Prenez une photo pour identifier les maladies', en: 'Take a photo to identify diseases' },
  'home.assistant.title': { fr: 'Parler à l\'assistant', en: 'Talk to assistant' },
  'home.assistant.desc': { fr: 'Posez vos questions en voix ou texte', en: 'Ask questions by voice or text' },
  'home.harvest.title': { fr: 'Analyser une récolte', en: 'Analyze harvest' },
  'home.harvest.desc': { fr: 'Évaluez la qualité de vos produits', en: 'Evaluate your product quality' },
  'home.tips.title': { fr: 'Conseils agricoles', en: 'Farming tips' },
  'home.tips.desc': { fr: 'Guides et bonnes pratiques locales', en: 'Local guides and best practices' },

  // Disease Detection
  'disease.title': { fr: 'Diagnostic des maladies', en: 'Disease Diagnosis' },
  'disease.take_photo': { fr: 'Prendre une photo', en: 'Take a photo' },
  'disease.upload': { fr: 'Importer une image', en: 'Upload image' },
  'disease.analyzing': { fr: 'Analyse en cours...', en: 'Analyzing...' },
  'disease.result': { fr: 'Résultat du diagnostic', en: 'Diagnosis Result' },
  'disease.severity': { fr: 'Gravité', en: 'Severity' },
  'disease.causes': { fr: 'Causes probables', en: 'Probable causes' },
  'disease.treatments': { fr: 'Traitements recommandés', en: 'Recommended treatments' },
  'disease.prevention': { fr: 'Prévention', en: 'Prevention' },
  'disease.listen': { fr: 'Écouter les conseils', en: 'Listen to advice' },

  // Harvest Quality
  'harvest.title': { fr: 'Analyse de récolte', en: 'Harvest Analysis' },
  'harvest.grade': { fr: 'Classe de qualité', en: 'Quality grade' },
  'harvest.use': { fr: 'Usage recommandé', en: 'Recommended use' },
  'harvest.price': { fr: 'Prix estimé', en: 'Estimated price' },

  // Assistant
  'assistant.title': { fr: 'Assistant Agricole', en: 'Farming Assistant' },
  'assistant.placeholder': { fr: 'Posez votre question...', en: 'Ask your question...' },
  'assistant.speak': { fr: 'Appuyez pour parler', en: 'Press to speak' },
  'assistant.listening': { fr: 'Je vous écoute...', en: 'Listening...' },

  // Settings
  'settings.title': { fr: 'Paramètres', en: 'Settings' },
  'settings.language': { fr: 'Langue', en: 'Language' },
  'settings.region': { fr: 'Région', en: 'Region' },
  'settings.notifications': { fr: 'Notifications', en: 'Notifications' },
  'settings.audio': { fr: 'Audio activé', en: 'Audio enabled' },
  'settings.data_saver': { fr: 'Mode économie données', en: 'Data saver mode' },

  // Common
  'common.loading': { fr: 'Chargement...', en: 'Loading...' },
  'common.error': { fr: 'Une erreur est survenue', en: 'An error occurred' },
  'common.retry': { fr: 'Réessayer', en: 'Retry' },
  'common.offline': { fr: 'Vous êtes hors ligne', en: 'You are offline' },
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.back': { fr: 'Retour', en: 'Back' },
  'common.next': { fr: 'Suivant', en: 'Next' },

  // Severity levels
  'severity.low': { fr: 'Faible', en: 'Low' },
  'severity.medium': { fr: 'Modéré', en: 'Medium' },
  'severity.high': { fr: 'Élevé', en: 'High' },
  'severity.critical': { fr: 'Critique', en: 'Critical' },

  // Quality grades
  'grade.A': { fr: 'Excellente qualité - Export', en: 'Excellent quality - Export' },
  'grade.B': { fr: 'Bonne qualité - Marché local', en: 'Good quality - Local market' },
  'grade.C': { fr: 'Qualité moyenne - Transformation', en: 'Average quality - Processing' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('agrocamer-language');
    return (saved as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('agrocamer-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
