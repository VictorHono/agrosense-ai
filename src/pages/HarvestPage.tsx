import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, ChevronLeft, TrendingUp, Star, Package } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CROP_LABELS, type Crop, type HarvestResult } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AnalysisStep = 'capture' | 'analyzing' | 'result';

export default function HarvestPage() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<AnalysisStep>('capture');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [result, setResult] = useState<HarvestResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);

      // Convert to base64 for API
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!imageBase64 || !selectedCrop) return;
    
    setStep('analyzing');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-harvest', {
        body: {
          image: imageBase64,
          crop_type: CROP_LABELS[selectedCrop][language],
          language,
        },
      });

      if (error) throw error;

      if (data?.success && data?.analysis) {
        setResult(data.analysis);
        setStep('result');
      } else {
        throw new Error(data?.error || 'Résultat inattendu');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(
        language === 'fr' 
          ? 'Erreur lors de l\'analyse. Veuillez réessayer.' 
          : 'Analysis error. Please try again.'
      );
      setStep('capture');
    }
  };

  const resetAnalysis = () => {
    setStep('capture');
    setImageUrl(null);
    setImageBase64(null);
    setSelectedCrop(null);
    setResult(null);
  };

  const gradeColors = {
    A: 'bg-success text-success-foreground',
    B: 'bg-warning text-warning-foreground',
    C: 'bg-muted text-muted-foreground',
  };

  const gradeDescriptions = {
    A: { fr: 'Excellente qualité - Export', en: 'Excellent quality - Export' },
    B: { fr: 'Bonne qualité - Marché local', en: 'Good quality - Local market' },
    C: { fr: 'Qualité moyenne - Transformation', en: 'Average quality - Processing' },
  };

  const popularCrops: Crop[] = ['mais', 'cacao', 'manioc', 'banane-plantain', 'tomate', 'cafe'];

  const QualityBar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <PageContainer title={t('harvest.title')}>
      {/* Back button on result */}
      {step !== 'capture' && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-4"
          onClick={resetAnalysis}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('common.back')}
        </Button>
      )}

      {/* CAPTURE STEP */}
      {step === 'capture' && (
        <div className="space-y-6 fade-in">
          {/* Image Preview or Camera Options */}
          {imageUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <img 
                  src={imageUrl} 
                  alt="Harvest photo" 
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3"
                  onClick={() => {
                    setImageUrl(null);
                    setImageBase64(null);
                  }}
                >
                  {language === 'fr' ? 'Changer' : 'Change'}
                </Button>
              </div>

              {/* Crop Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {language === 'fr' ? 'Quel produit analysez-vous ?' : 'What product are you analyzing?'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularCrops.map((crop) => (
                    <button
                      key={crop}
                      onClick={() => setSelectedCrop(crop)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        selectedCrop === crop
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {CROP_LABELS[crop][language]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Analyze Button */}
              <Button
                variant="harvest"
                size="xl"
                className="w-full"
                onClick={handleAnalyze}
                disabled={!selectedCrop}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                {language === 'fr' ? 'Analyser la qualité' : 'Analyze quality'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {language === 'fr' ? 'Conseils pour une bonne analyse' : 'Tips for good analysis'}
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• {language === 'fr' ? 'Photographiez plusieurs produits ensemble' : 'Photograph multiple products together'}</li>
                      <li>• {language === 'fr' ? 'Utilisez un fond uni et clair' : 'Use a plain, light background'}</li>
                      <li>• {language === 'fr' ? 'Montrez les produits de face' : 'Show products from the front'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Camera/Upload Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="harvest"
                  size="lg"
                  className="h-32 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-8 h-8" />
                  <span>{language === 'fr' ? 'Prendre une photo' : 'Take a photo'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-32 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8" />
                  <span>{language === 'fr' ? 'Importer une image' : 'Upload image'}</span>
                </Button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>
      )}

      {/* ANALYZING STEP */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <div className="relative w-48 h-48 mb-6">
            <img 
              src={imageUrl!} 
              alt="Analyzing" 
              className="w-full h-full object-cover rounded-2xl"
            />
            <div className="absolute inset-0 bg-accent/20 rounded-2xl animate-pulse" />
          </div>
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <p className="text-lg font-semibold text-foreground">
            {language === 'fr' ? 'Analyse en cours...' : 'Analyzing...'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'fr' ? 'Évaluation de la qualité de votre récolte' : 'Evaluating your harvest quality'}
          </p>
        </div>
      )}

      {/* RESULT STEP */}
      {step === 'result' && result && (
        <div className="space-y-4 fade-in">
          {/* Grade Card */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <img 
                  src={imageUrl!} 
                  alt="Analyzed harvest" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn(
                    "text-3xl font-bold w-12 h-12 rounded-xl flex items-center justify-center",
                    gradeColors[result.grade]
                  )}>
                    {result.grade}
                  </span>
                  <div>
                    <h2 className="font-bold text-foreground">{t('harvest.grade')}</h2>
                    <p className="text-sm text-muted-foreground">
                      {gradeDescriptions[result.grade][language]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <h3 className="font-semibold text-foreground">
              {language === 'fr' ? 'Critères de qualité' : 'Quality criteria'}
            </h3>
            <QualityBar label={language === 'fr' ? 'Couleur' : 'Color'} value={result.quality.color} />
            <QualityBar label={language === 'fr' ? 'Taille' : 'Size'} value={result.quality.size} />
            <QualityBar label={language === 'fr' ? 'Uniformité' : 'Uniformity'} value={result.quality.uniformity} />
            <QualityBar label={language === 'fr' ? 'Maturité' : 'Maturity'} value={result.quality.maturity} />
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{language === 'fr' ? 'Défauts' : 'Defects'}</span>
                <span className="font-medium text-foreground">{result.quality.defects}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-destructive/60 rounded-full"
                  style={{ width: `${result.quality.defects}%` }}
                />
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-foreground leading-relaxed">
              {result.feedback}
            </p>
          </div>

          {/* Price Estimate */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{t('harvest.price')}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-accent-foreground">
                    {result.estimatedPrice.min} - {result.estimatedPrice.max}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {result.estimatedPrice.currency}/{result.estimatedPrice.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  📍 {result.estimatedPrice.market}
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Use */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              {t('harvest.use')}
            </h3>
            <div className="space-y-2">
              {result.recommendedUse.map((use, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  {use}
                </div>
              ))}
            </div>
          </div>

          {/* New Analysis Button */}
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={resetAnalysis}
          >
            {language === 'fr' ? 'Nouvelle analyse' : 'New analysis'}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
