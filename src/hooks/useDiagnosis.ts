import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocationContext } from '@/contexts/GeolocationContext';
import { toast } from 'sonner';

// Types
export interface AnalysisResult {
  is_healthy: boolean;
  detected_crop: string;
  detected_crop_local?: string;
  disease_name?: string;
  local_name?: string;
  confidence: number;
  severity?: 'healthy' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  causes?: string[];
  symptoms?: string[];
  biological_treatments?: string[];
  chemical_treatments?: string[];
  prevention: string[];
  maintenance_tips?: string[];
  yield_improvement_tips?: string[];
  from_database?: boolean;
}

export interface Crop {
  id: string;
  name: string;
  name_local: string | null;
}

export type CompressionStep = 'idle' | 'reading' | 'resizing' | 'compressing' | 'ready' | 'error';
export type AnalysisStep = 'capture' | 'compressing' | 'analyzing' | 'result';

interface DiagnosisState {
  step: AnalysisStep;
  compressionStep: CompressionStep;
  compressionProgress: number;
  imageUrl: string | null;
  imageBase64: string | null;
  result: AnalysisResult | null;
  crops: Crop[];
  selectedCrop: string;
  loadingCrops: boolean;
  isOnline: boolean;
  retryCount: number;
  maxRetries: number;
}

// Constants
const TARGET_MAX_BYTES = 400 * 1024; // 400KB target
const INITIAL_MAX_DIM = 768;
const MIN_MAX_DIM = 384;
const INITIAL_QUALITY = 0.75;
const MIN_QUALITY = 0.30;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1500;

export function useDiagnosis(language: string) {
  const { position } = useGeolocationContext();
  
  const [state, setState] = useState<DiagnosisState>({
    step: 'capture',
    compressionStep: 'idle',
    compressionProgress: 0,
    imageUrl: null,
    imageBase64: null,
    result: null,
    crops: [],
    selectedCrop: 'auto',
    loadingCrops: true,
    isOnline: navigator.onLine,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setState(s => ({ ...s, isOnline: true }));
    const handleOffline = () => setState(s => ({ ...s, isOnline: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch crops
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const { data, error } = await supabase
          .from('crops')
          .select('id, name, name_local')
          .order('name');
        
        if (error) throw error;
        setState(s => ({ ...s, crops: data || [], loadingCrops: false }));
      } catch (error) {
        console.error('Error fetching crops:', error);
        setState(s => ({ ...s, loadingCrops: false }));
      }
    };
    fetchCrops();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    };
  }, []);

  // Blob to base64 utility
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
  }, []);

  // Smart compression with progress
  const compressImage = useCallback(async (file: File): Promise<string> => {
    setState(s => ({ ...s, compressionStep: 'reading', compressionProgress: 10 }));
    
    const encodeJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
          'image/jpeg',
          quality
        );
      });

    const drawToCanvas = async (dim: number): Promise<HTMLCanvasElement> => {
      setState(s => ({ ...s, compressionStep: 'resizing', compressionProgress: 30 }));
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, dim / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(bitmap, 0, 0, width, height);
        if (typeof (bitmap as any).close === 'function') (bitmap as any).close();
        return canvas;
      }

      // Fallback for older browsers
      const img = new Image();
      const url = URL.createObjectURL(file);
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });
      } finally {
        URL.revokeObjectURL(url);
      }

      const scale = Math.min(1, dim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    };

    console.log('[diagnose] Starting compression:', { type: file.type, size: file.size });

    let maxDim = INITIAL_MAX_DIM;
    let quality = INITIAL_QUALITY;
    let canvas = await drawToCanvas(maxDim);
    
    setState(s => ({ ...s, compressionStep: 'compressing', compressionProgress: 50 }));
    
    let blob = await encodeJpeg(canvas, quality);
    let attempts = 0;
    const maxAttempts = 12;

    // Progressive compression loop
    while (blob.size > TARGET_MAX_BYTES && attempts < maxAttempts) {
      attempts++;
      const progress = 50 + Math.min(40, attempts * 4);
      setState(s => ({ ...s, compressionProgress: progress }));

      if (quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.08);
        blob = await encodeJpeg(canvas, quality);
      } else if (maxDim > MIN_MAX_DIM) {
        maxDim = Math.floor(maxDim * 0.8);
        quality = INITIAL_QUALITY; // Reset quality for new dimensions
        canvas = await drawToCanvas(maxDim);
        blob = await encodeJpeg(canvas, quality);
      } else {
        break;
      }
      
      console.log('[diagnose] Compression attempt:', { attempt: attempts, maxDim, quality: quality.toFixed(2), size: blob.size });
    }

    if (blob.size > TARGET_MAX_BYTES * 1.5) {
      setState(s => ({ ...s, compressionStep: 'error', compressionProgress: 0 }));
      throw new Error(
        language === 'fr'
          ? 'Photo trop complexe. Reprenez plus près ou avec moins de détails.'
          : 'Photo too complex. Retake closer or with less detail.'
      );
    }

    setState(s => ({ ...s, compressionStep: 'ready', compressionProgress: 100 }));
    console.log('[diagnose] Final compression:', { maxDim, quality: quality.toFixed(2), size: blob.size });
    
    return blobToBase64(blob);
  }, [language, blobToBase64]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'fr' ? 'Sélectionnez une photo (pas une vidéo).' : 'Select a photo (not a video).');
      return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(language === 'fr' ? 'Photo trop lourde (max 15MB).' : 'Photo too large (max 15MB).');
      return false;
    }

    const url = URL.createObjectURL(file);
    setState(s => ({ 
      ...s, 
      imageUrl: url, 
      imageBase64: null, 
      step: 'compressing',
      compressionStep: 'idle',
      compressionProgress: 0,
      result: null,
      retryCount: 0,
    }));

    try {
      const compressedBase64 = await compressImage(file);
      setState(s => ({ ...s, imageBase64: compressedBase64, step: 'capture' }));
      return true;
    } catch (error) {
      console.error('Compression error:', error);
      toast.error(error instanceof Error ? error.message : 'Compression failed');
      setState(s => ({ 
        ...s, 
        imageUrl: null, 
        imageBase64: null, 
        step: 'capture',
        compressionStep: 'error',
      }));
      return false;
    }
  }, [compressImage, language]);

  // Analyze with retry logic
  const analyze = useCallback(async (retryAttempt = 0): Promise<boolean> => {
    const { imageBase64, selectedCrop, crops, isOnline } = state;
    
    if (!imageBase64) {
      toast.error(language === 'fr' ? 'Aucune image à analyser.' : 'No image to analyze.');
      return false;
    }

    if (!isOnline) {
      toast.error(language === 'fr' ? 'Pas de connexion Internet.' : 'No internet connection.');
      return false;
    }

    setState(s => ({ ...s, step: 'analyzing', retryCount: retryAttempt }));

    // Cancel any previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      // Prepare crop info
      let userSpecifiedCrop: string | undefined;
      if (selectedCrop !== 'auto') {
        const crop = crops.find(c => c.id === selectedCrop);
        userSpecifiedCrop = crop?.name;
      }

      // Prepare location data
      const locationData = position ? {
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude,
        accuracy: position.accuracy,
      } : {};

      const { data, error } = await supabase.functions.invoke('analyze-plant', {
        body: {
          image: imageBase64,
          language,
          userSpecifiedCrop,
          ...locationData,
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      if (data.success && data.analysis) {
        setState(s => ({ 
          ...s, 
          result: data.analysis, 
          step: 'result',
          retryCount: 0,
        }));
        return true;
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Analysis error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || 
                            errorMessage.includes('network') || 
                            errorMessage.includes('Failed to send');
      const isTemporary = errorMessage.includes('503') || 
                         errorMessage.includes('429') || 
                         errorMessage.includes('temporarily');

      // Retry logic for transient errors
      if ((isNetworkError || isTemporary) && retryAttempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryAttempt);
        console.log(`[diagnose] Retrying in ${delay}ms (attempt ${retryAttempt + 1}/${MAX_RETRIES})`);
        
        toast.info(
          language === 'fr' 
            ? `Nouvelle tentative dans ${Math.round(delay/1000)}s...` 
            : `Retrying in ${Math.round(delay/1000)}s...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return analyze(retryAttempt + 1);
      }

      toast.error(
        language === 'fr'
          ? 'Échec de l\'analyse. Vérifiez votre connexion et réessayez.'
          : 'Analysis failed. Check your connection and try again.'
      );
      setState(s => ({ ...s, step: 'capture', retryCount: 0 }));
      return false;
    }
  }, [state, language, location]);

  // Reset everything
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    
    setState(s => ({
      ...s,
      step: 'capture',
      compressionStep: 'idle',
      compressionProgress: 0,
      imageUrl: null,
      imageBase64: null,
      result: null,
      selectedCrop: 'auto',
      retryCount: 0,
    }));
  }, []);

  // Change selected crop
  const setSelectedCrop = useCallback((cropId: string) => {
    setState(s => ({ ...s, selectedCrop: cropId }));
  }, []);

  // Clear image only
  const clearImage = useCallback(() => {
    setState(s => ({
      ...s,
      imageUrl: null,
      imageBase64: null,
      compressionStep: 'idle',
      compressionProgress: 0,
    }));
  }, []);

  return {
    // State
    step: state.step,
    compressionStep: state.compressionStep,
    compressionProgress: state.compressionProgress,
    imageUrl: state.imageUrl,
    imageBase64: state.imageBase64,
    result: state.result,
    crops: state.crops,
    selectedCrop: state.selectedCrop,
    loadingCrops: state.loadingCrops,
    isOnline: state.isOnline,
    retryCount: state.retryCount,
    maxRetries: state.maxRetries,
    isReady: state.compressionStep === 'ready' && !!state.imageBase64,
    isCompressing: state.step === 'compressing' || ['reading', 'resizing', 'compressing'].includes(state.compressionStep),
    
    // Actions
    handleFileSelect,
    analyze,
    reset,
    setSelectedCrop,
    clearImage,
  };
}
