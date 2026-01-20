import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocationContext } from '@/contexts/GeolocationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface HarvestResult {
  is_good_quality: boolean;
  detected_crop: string;
  detected_crop_local?: string;
  grade: 'A' | 'B' | 'C';
  quality: {
    color: number;
    size: number;
    defects: number;
    uniformity: number;
    maturity: number;
    moisture?: number;
    cleanliness?: number;
  };
  issues_detected?: string[];
  recommendedUse: string[];
  estimatedPrice: {
    min: number;
    max: number;
    currency: string;
    unit: string;
    market: string;
  };
  // NEW: Yield estimation
  yield_estimation?: {
    estimated_yield_per_hectare: string;
    yield_potential: 'low' | 'medium' | 'high' | 'excellent';
    yield_factors: string[];
    optimization_tips: string[];
  };
  feedback: string;
  improvement_tips: string[];
  storage_tips: string[];
  // NEW: Selling strategy
  selling_strategy?: {
    best_time_to_sell: string;
    target_buyers: string[];
    negotiation_tips: string[];
  };
  from_database?: boolean;
}

interface UseHarvestAnalysisReturn {
  analyzing: boolean;
  result: HarvestResult | null;
  error: string | null;
  analyzeHarvest: (imageBase64: string) => Promise<HarvestResult | null>;
  reset: () => void;
}

// Multi-pass compression algorithm for mobile networks
async function compressImageForUpload(
  base64Image: string,
  targetSizeKB: number = 400
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Start with reasonable dimensions
      let width = img.width;
      let height = img.height;
      const maxDimension = 1024;
      
      // Scale down if too large
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      // Multi-pass compression
      const passes = [
        { scale: 1.0, quality: 0.8 },
        { scale: 0.85, quality: 0.7 },
        { scale: 0.7, quality: 0.6 },
        { scale: 0.5, quality: 0.5 },
        { scale: 0.4, quality: 0.4 },
      ];
      
      for (const pass of passes) {
        const w = Math.round(width * pass.scale);
        const h = Math.round(height * pass.scale);
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        const compressed = canvas.toDataURL('image/jpeg', pass.quality);
        const sizeKB = (compressed.length * 0.75) / 1024;
        
        console.log(`[Compression] Pass ${pass.scale}x @ ${pass.quality}: ${Math.round(sizeKB)}KB`);
        
        if (sizeKB <= targetSizeKB) {
          resolve(compressed);
          return;
        }
      }
      
      // Final fallback - aggressive compression
      canvas.width = Math.round(width * 0.3);
      canvas.height = Math.round(height * 0.3);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.3));
    };
    
    img.onerror = () => resolve(base64Image);
    img.src = base64Image;
  });
}

// Exponential backoff retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export function useHarvestAnalysis(): UseHarvestAnalysisReturn {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<HarvestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { position, locationInfo } = useGeolocationContext();
  const { language } = useLanguage();
  const { user } = useAuth();

  const logActivity = useCallback(async (metadata: Record<string, unknown>) => {
    if (!user) return;
    
    try {
      await supabase.from('user_activity').insert([{
        user_id: user.id,
        activity_type: 'harvest_analysis',
        metadata: metadata as Record<string, never>,
      }]);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }, [user]);

  const analyzeHarvest = useCallback(async (imageBase64: string): Promise<HarvestResult | null> => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
      // Check network status
      if (!navigator.onLine) {
        throw new Error(
          language === 'fr' 
            ? 'Pas de connexion internet. Veuillez réessayer.' 
            : 'No internet connection. Please try again.'
        );
      }
      
      // Compress image for mobile networks
      console.log('[HarvestAnalysis] Compressing image...');
      const compressedImage = await compressImageForUpload(imageBase64);
      console.log('[HarvestAnalysis] Image compressed successfully');
      
      // Build request with geolocation data
      const requestBody = {
        image: compressedImage,
        language,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        altitude: position?.altitude ?? null,
        regionName: locationInfo?.regionName ?? null,
        climateZone: locationInfo?.climateZone ?? null,
      };
      
      console.log('[HarvestAnalysis] Sending request with location:', {
        lat: requestBody.latitude,
        lon: requestBody.longitude,
        region: requestBody.regionName,
      });
      
      // Call edge function with retry logic
      const response = await withRetry(async () => {
        const { data, error: fnError } = await supabase.functions.invoke('analyze-harvest', {
          body: requestBody,
        });
        
        if (fnError) {
          throw fnError;
        }
        
        if (!data?.success || !data?.analysis) {
          throw new Error(data?.error || 'Unexpected response');
        }
        
        return data;
      });
      
      const analysisResult = response.analysis as HarvestResult;
      setResult(analysisResult);
      
      // Log activity
      await logActivity({
        crop: analysisResult.detected_crop,
        grade: analysisResult.grade,
        quality_score: Math.round(
          (analysisResult.quality.color + 
           analysisResult.quality.size + 
           analysisResult.quality.uniformity + 
           analysisResult.quality.maturity - 
           analysisResult.quality.defects) / 4
        ),
        price_min: analysisResult.estimatedPrice.min,
        price_max: analysisResult.estimatedPrice.max,
        market: analysisResult.estimatedPrice.market,
        yield_potential: analysisResult.yield_estimation?.yield_potential,
        region: locationInfo?.regionName,
      });
      
      return analysisResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[HarvestAnalysis] Error:', errorMessage);
      setError(errorMessage);
      
      toast.error(
        language === 'fr' 
          ? 'Erreur lors de l\'analyse. Veuillez réessayer.' 
          : 'Analysis error. Please try again.'
      );
      
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [position, locationInfo, language, logActivity]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setAnalyzing(false);
  }, []);

  return {
    analyzing,
    result,
    error,
    analyzeHarvest,
    reset,
  };
}
