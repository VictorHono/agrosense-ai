import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Loader2, ChevronLeft, TrendingUp, Star, Package, Sparkles, AlertTriangle, Leaf, Wheat, ShoppingCart, DollarSign, Target, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useHarvestAnalysis, HarvestResult } from '@/hooks/useHarvestAnalysis';

type AnalysisStep = 'capture' | 'analyzing' | 'result';

export default function HarvestPage() {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    analyzing, 
    result, 
    imageUrl: persistedImageUrl,
    imageBase64: persistedImageBase64,
    hasPersistedResult,
    analyzeHarvest, 
    reset: resetHook 
  } = useHarvestAnalysis();

  // Local state for image during capture phase
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [localImageBase64, setLocalImageBase64] = useState<string | null>(null);
  
  // Determine step based on persisted result
  const [step, setStep] = useState<AnalysisStep>(() => {
    if (hasPersistedResult && result) return 'result';
    return 'capture';
  });

  // Update step when result changes (after analysis)
  useEffect(() => {
    if (result && !analyzing) {
      setStep('result');
    }
  }, [result, analyzing]);

  // Use persisted or local image
  const imageUrl = persistedImageUrl || localImageUrl;
  const imageBase64 = persistedImageBase64 || localImageBase64;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalImageUrl(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLocalImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    const imgBase64 = localImageBase64 || persistedImageBase64;
    const imgUrl = localImageUrl || persistedImageUrl;
    if (!imgBase64 || !imgUrl) return;
    
    setStep('analyzing');
    
    const analysisResult = await analyzeHarvest(imgBase64, imgUrl);
    
    if (analysisResult) {
      setStep('result');
      // Clear local state since it's now persisted in the hook
      setLocalImageUrl(null);
      setLocalImageBase64(null);
    } else {
      setStep('capture');
    }
  };

  const resetAnalysis = () => {
    setStep('capture');
    setLocalImageUrl(null);
    setLocalImageBase64(null);
    resetHook();
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

  const yieldPotentialLabels = {
    low: { fr: 'Faible', en: 'Low', color: 'text-destructive' },
    medium: { fr: 'Moyen', en: 'Medium', color: 'text-warning' },
    high: { fr: 'Élevé', en: 'High', color: 'text-success' },
    excellent: { fr: 'Excellent', en: 'Excellent', color: 'text-primary' },
  };

  const QualityBar = ({ label, value, isDefect = false }: { label: string; value: number; isDefect?: boolean }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isDefect 
              ? "bg-destructive/60"
              : value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <PageContainer title={t('harvest.title')}>
      {/* Back button - only show during analyzing, not on result */}
      {step === 'analyzing' && (
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
                    setLocalImageUrl(null);
                    setLocalImageBase64(null);
                  }}
                >
                  {language === 'fr' ? 'Changer' : 'Change'}
                </Button>
              </div>

              {/* AI Detection Info */}
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 text-sm text-accent-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">
                    {language === 'fr' 
                      ? "L'IA analysera qualité, rendement et prix" 
                      : "AI will analyze quality, yield and price"}
                  </span>
                </div>
              </div>

              {/* Analyze Button */}
              <Button
                variant="harvest"
                size="xl"
                className="w-full"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-5 h-5 mr-2" />
                )}
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
                      {language === 'fr' ? 'Analyse complète de récolte' : 'Complete harvest analysis'}
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• {language === 'fr' ? "Tri qualitatif pour la vente (Grade A, B, C)" : "Quality sorting for sales (Grade A, B, C)"}</li>
                      <li>• {language === 'fr' ? "Estimation du prix sur les marchés locaux" : "Local market price estimation"}</li>
                      <li>• {language === 'fr' ? "Estimation du rendement (pour semences)" : "Yield estimation (for seeds)"}</li>
                      <li>• {language === 'fr' ? "Stratégie de vente optimale" : "Optimal selling strategy"}</li>
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
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {language === 'fr' 
              ? 'Qualité, rendement et prix estimés' 
              : 'Quality, yield and price estimation'}
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
                    <h2 className="font-bold text-foreground">{result.detected_crop}</h2>
                    {result.detected_crop_local && (
                      <p className="text-xs text-muted-foreground">{result.detected_crop_local}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {gradeDescriptions[result.grade][language]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issues Detected */}
          {result.issues_detected && result.issues_detected.length > 0 && (
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                {language === 'fr' ? 'Problèmes détectés' : 'Issues Detected'}
              </h3>
              <ul className="space-y-2">
                {result.issues_detected.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 mt-1.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quality Metrics */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <h3 className="font-semibold text-foreground">
              {language === 'fr' ? 'Critères de qualité' : 'Quality criteria'}
            </h3>
            <QualityBar label={language === 'fr' ? 'Couleur' : 'Color'} value={result.quality.color} />
            <QualityBar label={language === 'fr' ? 'Taille' : 'Size'} value={result.quality.size} />
            <QualityBar label={language === 'fr' ? 'Uniformité' : 'Uniformity'} value={result.quality.uniformity} />
            <QualityBar label={language === 'fr' ? 'Maturité' : 'Maturity'} value={result.quality.maturity} />
            {result.quality.moisture !== undefined && (
              <QualityBar label={language === 'fr' ? 'Humidité' : 'Moisture'} value={result.quality.moisture} />
            )}
            {result.quality.cleanliness !== undefined && (
              <QualityBar label={language === 'fr' ? 'Propreté' : 'Cleanliness'} value={result.quality.cleanliness} />
            )}
            <QualityBar 
              label={language === 'fr' ? 'Défauts' : 'Defects'} 
              value={result.quality.defects} 
              isDefect={true}
            />
          </div>

          {/* Feedback */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-foreground leading-relaxed">
              {result.feedback}
            </p>
          </div>

          {/* Yield Estimation */}
          {result.yield_estimation && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wheat className="w-4 h-4 text-primary" />
                {language === 'fr' ? 'Estimation du rendement' : 'Yield Estimation'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Rendement estimé' : 'Estimated yield'}
                  </span>
                  <span className="font-bold text-foreground">
                    {result.yield_estimation.estimated_yield_per_hectare}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Potentiel' : 'Potential'}
                  </span>
                  <span className={cn("font-bold", yieldPotentialLabels[result.yield_estimation.yield_potential].color)}>
                    {yieldPotentialLabels[result.yield_estimation.yield_potential][language]}
                  </span>
                </div>
                {result.yield_estimation.yield_factors.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'fr' ? 'Facteurs de rendement:' : 'Yield factors:'}
                    </p>
                    <ul className="space-y-1">
                      {result.yield_estimation.yield_factors.map((factor, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-primary">•</span> {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.yield_estimation.optimization_tips.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-2">
                      {language === 'fr' ? 'Optimisation:' : 'Optimization:'}
                    </p>
                    <ul className="space-y-1">
                      {result.yield_estimation.optimization_tips.map((tip, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-success">✓</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Price Estimate */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{t('harvest.price')}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-accent-foreground">
                    {result.estimatedPrice.min.toLocaleString()} - {result.estimatedPrice.max.toLocaleString()}
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

          {/* Selling Strategy */}
          {result.selling_strategy && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-success" />
                {language === 'fr' ? 'Stratégie de vente' : 'Selling Strategy'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'fr' ? 'Meilleur moment pour vendre:' : 'Best time to sell:'}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {result.selling_strategy.best_time_to_sell}
                  </p>
                </div>
                {result.selling_strategy.target_buyers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'fr' ? 'Acheteurs cibles:' : 'Target buyers:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.selling_strategy.target_buyers.map((buyer, i) => (
                        <span key={i} className="px-2 py-1 bg-success/10 text-success text-xs rounded-full flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {buyer}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.selling_strategy.negotiation_tips.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-2">
                      {language === 'fr' ? 'Conseils de négociation:' : 'Negotiation tips:'}
                    </p>
                    <ul className="space-y-1">
                      {result.selling_strategy.negotiation_tips.map((tip, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-success">💡</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Improvement Tips */}
          {result.improvement_tips && result.improvement_tips.length > 0 && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {language === 'fr' ? 'Améliorer les prochaines récoltes' : 'Improve Future Harvests'}
              </h3>
              <ul className="space-y-2">
                {result.improvement_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Storage Tips */}
          {result.storage_tips && result.storage_tips.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-success" />
                {language === 'fr' ? 'Conseils de stockage' : 'Storage Tips'}
              </h3>
              <ul className="space-y-2">
                {result.storage_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 mt-1.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* New Analysis Button */}
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={resetAnalysis}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Nouvelle analyse' : 'New analysis'}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
