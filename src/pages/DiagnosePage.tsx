import { useRef, useState } from 'react';
import { Camera, Upload, Loader2, Volume2, ChevronLeft, AlertTriangle, Check, Leaf, Sparkles, TrendingUp, HelpCircle, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDiagnosis } from '@/hooks/useDiagnosis';
import { CompressionIndicator } from '@/components/diagnose/CompressionIndicator';
import { NetworkStatus, OnlineIndicator } from '@/components/diagnose/NetworkStatus';

export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);

  const {
    step,
    compressionStep,
    compressionProgress,
    imageUrl,
    imageBase64,
    result,
    crops,
    selectedCrop,
    loadingCrops,
    isOnline,
    retryCount,
    maxRetries,
    isReady,
    isCompressing,
    handleFileSelect,
    analyze,
    reset,
    setSelectedCrop,
    clearImage,
  } = useDiagnosis(language);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Allow re-selection
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleAnalyze = async () => {
    if (!isReady) {
      toast.error(language === 'fr' ? 'Image pas encore prête.' : 'Image not ready yet.');
      return;
    }
    if (!isOnline) {
      toast.error(language === 'fr' ? 'Pas de connexion Internet.' : 'No internet connection.');
      return;
    }
    await analyze();
  };

  const speakResult = () => {
    if (!result || isReading) return;

    let text: string;
    
    if (result.is_healthy) {
      text = language === 'fr'
        ? `Bonne nouvelle! Votre ${result.detected_crop}${result.detected_crop_local ? `, aussi appelé ${result.detected_crop_local},` : ''} est en bonne santé avec un niveau de confiance de ${result.confidence}%. 
           ${result.description}. 
           Conseils d'entretien: ${result.maintenance_tips?.join('. ') || 'Continuez les bonnes pratiques'}. 
           Pour améliorer le rendement: ${result.yield_improvement_tips?.join('. ') || 'Maintenez les bonnes conditions'}.`
        : `Good news! Your ${result.detected_crop}${result.detected_crop_local ? `, also called ${result.detected_crop_local},` : ''} is healthy with a confidence level of ${result.confidence}%. 
           ${result.description}. 
           Maintenance tips: ${result.maintenance_tips?.join('. ') || 'Continue good practices'}. 
           To improve yield: ${result.yield_improvement_tips?.join('. ') || 'Maintain good conditions'}.`;
    } else {
      text = language === 'fr'
        ? `Maladie détectée sur votre ${result.detected_crop}: ${result.disease_name}. ${result.local_name ? `Aussi appelée ${result.local_name}.` : ''} 
           Niveau de gravité: ${result.severity === 'low' ? 'faible' : result.severity === 'medium' ? 'moyen' : result.severity === 'high' ? 'élevé' : 'critique'}. 
           ${result.description}. 
           Traitements recommandés: ${result.biological_treatments?.join('. ') || 'Consultez un expert'}. 
           ${result.chemical_treatments?.length ? 'Traitements chimiques: ' + result.chemical_treatments.join('. ') : ''}`
        : `Disease detected on your ${result.detected_crop}: ${result.disease_name}. ${result.local_name ? `Also called ${result.local_name}.` : ''} 
           Severity level: ${result.severity}. 
           ${result.description}. 
           Recommended treatments: ${result.biological_treatments?.join('. ') || 'Consult an expert'}. 
           ${result.chemical_treatments?.length ? 'Chemical treatments: ' + result.chemical_treatments.join('. ') : ''}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => {
      setIsReading(false);
      toast.error(language === 'fr' ? 'Lecture impossible' : 'Cannot read');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const severityColors = {
    healthy: 'bg-success/10 text-success border-success/30',
    low: 'bg-warning/10 text-warning border-warning/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    critical: 'bg-destructive text-destructive-foreground border-destructive',
  };

  const severityLabels = {
    healthy: { fr: 'Plante saine', en: 'Healthy plant' },
    low: { fr: 'Faible', en: 'Low' },
    medium: { fr: 'Moyen', en: 'Medium' },
    high: { fr: 'Élevé', en: 'High' },
    critical: { fr: 'Critique', en: 'Critical' },
  };

  return (
    <PageContainer title={t('disease.title')}>
      {/* Network status banner */}
      <NetworkStatus 
        isOnline={isOnline} 
        retryCount={retryCount} 
        maxRetries={maxRetries} 
        language={language} 
      />

      {/* Back button */}
      {step !== 'capture' && step !== 'compressing' && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-4"
          onClick={reset}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('common.back')}
        </Button>
      )}

      {/* CAPTURE / COMPRESSING STEP */}
      {(step === 'capture' || step === 'compressing') && (
        <div className="space-y-6 fade-in">
          {imageUrl ? (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <img 
                  src={imageUrl} 
                  alt="Captured plant" 
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3"
                  onClick={clearImage}
                  disabled={isCompressing}
                >
                  {language === 'fr' ? 'Changer' : 'Change'}
                </Button>
                
                {/* Online indicator */}
                <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                  <OnlineIndicator isOnline={isOnline} language={language} />
                </div>
              </div>

              {/* Compression progress indicator */}
              {isCompressing && (
                <CompressionIndicator 
                  step={compressionStep} 
                  progress={compressionProgress} 
                  language={language} 
                />
              )}

              {/* Crop Selection - only show when ready */}
              {isReady && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {language === 'fr' ? 'Type de plante' : 'Plant type'}
                  </label>
                  <Select value={selectedCrop} onValueChange={setSelectedCrop} disabled={loadingCrops}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span>{language === 'fr' ? 'Détection automatique (IA)' : 'Auto-detect (AI)'}</span>
                        </div>
                      </SelectItem>
                      {crops.map((crop) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name} {crop.name_local ? `(${crop.name_local})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {language === 'fr' 
                      ? "Sélectionnez votre plante pour un diagnostic plus précis." 
                      : "Select your plant for a more accurate diagnosis."}
                  </p>
                </div>
              )}

              {/* Analyze Button */}
              <Button
                variant="forest"
                size="xl"
                className="w-full"
                onClick={handleAnalyze}
                disabled={!isReady || isCompressing || !isOnline}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {language === 'fr' ? 'Préparation...' : 'Preparing...'}
                  </>
                ) : !isOnline ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    {language === 'fr' ? 'Hors ligne' : 'Offline'}
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    {language === 'fr' ? 'Analyser la plante' : 'Analyze plant'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground text-sm">
                        {language === 'fr' ? 'Comment ça marche ?' : 'How does it work?'}
                      </h3>
                      <OnlineIndicator isOnline={isOnline} language={language} />
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• {language === 'fr' ? "Prenez une photo de votre plante" : "Take a photo of your plant"}</li>
                      <li>• {language === 'fr' ? "L'IA détecte automatiquement le type de culture" : "AI automatically detects the crop type"}</li>
                      <li>• {language === 'fr' ? "Recevez un diagnostic complet avec conseils" : "Get a complete diagnosis with advice"}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Camera/Upload Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="forest"
                  size="lg"
                  className="h-32 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!isOnline}
                >
                  <Camera className="w-8 h-8" />
                  <span>{t('disease.take_photo')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-32 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOnline}
                >
                  <Upload className="w-8 h-8" />
                  <span>{t('disease.upload')}</span>
                </Button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFileChange}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
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
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent scan-line" />
            </div>
            <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse" />
          </div>
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-lg font-semibold text-foreground">{t('disease.analyzing')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {retryCount > 0 
              ? (language === 'fr' ? `Tentative ${retryCount}/${maxRetries}...` : `Attempt ${retryCount}/${maxRetries}...`)
              : (language === 'fr' ? 'Analyse IA en cours...' : 'AI analysis in progress...')
            }
          </p>
        </div>
      )}

      {/* RESULT STEP */}
      {step === 'result' && result && (
        <div className="space-y-4 fade-in">
          {/* Main Result Card */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <img 
                  src={imageUrl!} 
                  alt="Analyzed plant" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border mb-2",
                  severityColors[result.severity || 'healthy']
                )}>
                  {result.is_healthy ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {severityLabels[result.severity || 'healthy'][language]}
                </div>
                
                {/* Detected crop */}
                <h2 className="text-lg font-bold text-foreground">
                  {result.detected_crop}
                </h2>
                {result.detected_crop_local && (
                  <p className="text-sm text-muted-foreground">{result.detected_crop_local}</p>
                )}
                
                {/* Disease name if sick */}
                {!result.is_healthy && result.disease_name && (
                  <div className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">
                      {result.disease_name}
                    </p>
                    {result.local_name && (
                      <p className="text-xs text-muted-foreground">{result.local_name}</p>
                    )}
                  </div>
                )}
                
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        result.is_healthy ? "bg-success" : "bg-primary"
                      )}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{result.confidence}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-foreground leading-relaxed">
              {result.description}
            </p>
          </div>

          {/* Listen Button */}
          <Button 
            variant="harvest" 
            className="w-full" 
            size="lg"
            onClick={speakResult}
            disabled={isReading}
          >
            <Volume2 className={cn("w-5 h-5 mr-2", isReading && "animate-pulse")} />
            {isReading 
              ? (language === 'fr' ? 'Lecture en cours...' : 'Reading...') 
              : t('disease.listen')}
          </Button>

          {/* HEALTHY PLANT: Maintenance and Improvement Tips */}
          {result.is_healthy && (
            <>
              {/* Maintenance Tips */}
              {result.maintenance_tips && result.maintenance_tips.length > 0 && (
                <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-success" />
                    {language === 'fr' ? "Conseils d'entretien" : 'Maintenance Tips'}
                  </h3>
                  <ul className="space-y-2">
                    {result.maintenance_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Yield Improvement Tips */}
              {result.yield_improvement_tips && result.yield_improvement_tips.length > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    {language === 'fr' ? 'Améliorer le rendement' : 'Improve Yield'}
                  </h3>
                  <ul className="space-y-2">
                    {result.yield_improvement_tips.map((tip, i) => (
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
            </>
          )}

          {/* SICK PLANT: Symptoms, Causes, Treatments */}
          {!result.is_healthy && (
            <>
              {/* Symptoms */}
              {result.symptoms && result.symptoms.length > 0 && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-warning" />
                    {language === 'fr' ? 'Symptômes' : 'Symptoms'}
                  </h3>
                  <ul className="space-y-2">
                    {result.symptoms.map((symptom, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 mt-1.5" />
                        {symptom}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Causes */}
              {result.causes && result.causes.length > 0 && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    {t('disease.causes')}
                  </h3>
                  <ul className="space-y-2">
                    {result.causes.map((cause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 mt-1.5" />
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Treatments */}
              <div className="p-4 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  {t('disease.treatments')}
                </h3>
                <div className="space-y-3">
                  {/* Biological treatments */}
                  {result.biological_treatments && result.biological_treatments.length > 0 && (
                    <div className="p-3 rounded-lg border bg-success/5 border-success/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-success/10 text-success">
                          {language === 'fr' ? 'Biologique' : 'Biological'}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {result.biological_treatments.map((treatment, i) => (
                          <li key={i} className="text-sm text-foreground">{treatment}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Chemical treatments */}
                  {result.chemical_treatments && result.chemical_treatments.length > 0 && (
                    <div className="p-3 rounded-lg border bg-info/5 border-info/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-info/10 text-info">
                          {language === 'fr' ? 'Chimique' : 'Chemical'}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {result.chemical_treatments.map((treatment, i) => (
                          <li key={i} className="text-sm text-foreground">{treatment}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Prevention - Always shown */}
          {result.prevention && result.prevention.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-primary" />
                {t('disease.prevention')}
              </h3>
              <ul className="space-y-2">
                {result.prevention.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
            onClick={reset}
          >
            {language === 'fr' ? 'Nouvelle analyse' : 'New analysis'}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
