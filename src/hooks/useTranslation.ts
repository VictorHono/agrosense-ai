import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranslationWithMeta {
  value: string;
  pronunciation?: string;
  audioUrl?: string;
  isFallback: boolean;
  sourceLanguage: string;
}

interface MissingKeyLog {
  key: string;
  language: string;
  fallback?: string;
  context?: string;
}

// Queue for batching missing key logs
let missingKeyQueue: MissingKeyLog[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const flushMissingKeys = async () => {
  if (missingKeyQueue.length === 0) return;
  
  const keysToFlush = [...missingKeyQueue];
  missingKeyQueue = [];
  
  try {
    // Use upsert to handle duplicates
    const entries = keysToFlush.map(k => ({
      translation_key: k.key,
      language_code: k.language,
      fallback_used: k.fallback,
      page_context: k.context
    }));
    
    for (const entry of entries) {
      await supabase.rpc('log_missing_translation', {
        p_key: entry.translation_key,
        p_language: entry.language_code,
        p_fallback: entry.fallback_used,
        p_context: entry.page_context
      });
    }
  } catch (error) {
    console.warn('Failed to log missing keys:', error);
  }
};

const queueMissingKey = (log: MissingKeyLog) => {
  // Avoid duplicates in queue
  if (!missingKeyQueue.find(k => k.key === log.key && k.language === log.language)) {
    missingKeyQueue.push(log);
  }
  
  // Debounce flush
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flushMissingKeys, 5000);
};

export function useTranslation() {
  const { language, t: baseT, availableLanguages } = useLanguage();
  const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map());
  const loggedKeysRef = useRef<Set<string>>(new Set());
  
  // Enhanced translation with metadata
  const tWithMeta = useCallback((key: string, fallback?: string): TranslationWithMeta => {
    const value = baseT(key, fallback);
    const isFallback = value === key || value === fallback;
    
    // Log missing key if not already logged
    if (isFallback && !loggedKeysRef.current.has(`${language}:${key}`)) {
      loggedKeysRef.current.add(`${language}:${key}`);
      queueMissingKey({
        key,
        language,
        fallback: fallback || value,
        context: typeof window !== 'undefined' ? window.location.pathname : undefined
      });
    }
    
    return {
      value,
      isFallback,
      sourceLanguage: isFallback ? 'fr' : language,
      audioUrl: audioCache.get(`${language}:${key}`)
    };
  }, [language, baseT, audioCache]);
  
  // Simple translation (maintains backwards compatibility)
  const t = useCallback((key: string, fallback?: string): string => {
    return tWithMeta(key, fallback).value;
  }, [tWithMeta]);
  
  // Load audio URL for a translation
  const loadAudio = useCallback(async (translationId: string, key: string) => {
    try {
      const { data } = await supabase
        .from('translation_audio')
        .select('audio_url')
        .eq('translation_id', translationId)
        .single();
      
      if (data?.audio_url) {
        setAudioCache(prev => new Map(prev).set(`${language}:${key}`, data.audio_url));
      }
    } catch (error) {
      console.warn('Failed to load audio:', error);
    }
  }, [language]);
  
  // Play audio for a translation
  const playAudio = useCallback(async (key: string): Promise<boolean> => {
    const cacheKey = `${language}:${key}`;
    const audioUrl = audioCache.get(cacheKey);
    
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        await audio.play();
        return true;
      } catch (error) {
        console.error('Failed to play audio:', error);
        return false;
      }
    }
    
    return false;
  }, [language, audioCache]);
  
  // Check if current language has TTS enabled
  const hasTTS = useCallback((): boolean => {
    const currentLang = availableLanguages.find(l => l.code === language);
    return currentLang?.tts_enabled || false;
  }, [language, availableLanguages]);
  
  // Flush any pending missing keys on unmount
  useEffect(() => {
    return () => {
      if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushMissingKeys();
      }
    };
  }, []);
  
  return {
    t,
    tWithMeta,
    language,
    loadAudio,
    playAudio,
    hasTTS,
    availableLanguages
  };
}

// Hook for fetching missing keys (admin use)
export function useMissingTranslations(languageCode?: string) {
  const [missingKeys, setMissingKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchMissingKeys = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('translation_missing_keys')
        .select('*')
        .eq('is_resolved', false)
        .order('occurrence_count', { ascending: false });
      
      if (languageCode) {
        query = query.eq('language_code', languageCode);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      setMissingKeys(data || []);
    } catch (error) {
      console.error('Failed to fetch missing keys:', error);
    } finally {
      setLoading(false);
    }
  }, [languageCode]);
  
  const resolveKey = useCallback(async (id: string) => {
    try {
      await supabase
        .from('translation_missing_keys')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id);
      
      setMissingKeys(prev => prev.filter(k => k.id !== id));
    } catch (error) {
      console.error('Failed to resolve key:', error);
    }
  }, []);
  
  useEffect(() => {
    fetchMissingKeys();
  }, [fetchMissingKeys]);
  
  return { missingKeys, loading, refetch: fetchMissingKeys, resolveKey };
}

// Hook for dictionary management
export function useTranslationDictionary(targetLanguage?: string) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchEntries = useCallback(async (domain?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('translation_dictionary')
        .select('*')
        .order('source_word');
      
      if (targetLanguage) {
        query = query.eq('target_language', targetLanguage);
      }
      
      if (domain) {
        query = query.eq('domain', domain);
      }
      
      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Failed to fetch dictionary:', error);
    } finally {
      setLoading(false);
    }
  }, [targetLanguage]);
  
  const addEntry = useCallback(async (entry: {
    source_word: string;
    target_word: string;
    target_language: string;
    word_type?: string;
    domain?: string;
    pronunciation?: string;
    usage_example?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('translation_dictionary')
        .insert([{
          ...entry,
          contributor_id: userData.user?.id
        }]);
      
      if (error) throw error;
      fetchEntries();
      return true;
    } catch (error) {
      console.error('Failed to add dictionary entry:', error);
      return false;
    }
  }, [fetchEntries]);
  
  const verifyEntry = useCallback(async (id: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      await supabase
        .from('translation_dictionary')
        .update({ 
          is_verified: true, 
          verified_by: userData.user?.id 
        })
        .eq('id', id);
      
      setEntries(prev => 
        prev.map(e => e.id === id ? { ...e, is_verified: true } : e)
      );
    } catch (error) {
      console.error('Failed to verify entry:', error);
    }
  }, []);
  
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);
  
  return { entries, loading, refetch: fetchEntries, addEntry, verifyEntry };
}
