import { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Loader2, Volume2, ChevronLeft, AlertTriangle, Check, Leaf, Sparkles, TrendingUp, HelpCircle, RefreshCw, Save, Zap, BookOpen, Timer } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDiagnosis } from '@/hooks/useDiagnosis';
import { CompressionIndicator } from '@/components/diagnose/CompressionIndicator';
import { NetworkStatus, OnlineIndicator } from '@/components/diagnose/NetworkStatus';
import { ConfidenceGauge } from '@/components/diagnose/ConfidenceGauge';
import { SeverityScore } from '@/components/diagnose/SeverityScore';
import { ActionChecklist } from '@/components/diagnose/ActionChecklist';
import { ShareDiagnosis } from '@/components/diagnose/ShareDiagnosis';
import { DiagnosisHistory, saveDiagnosisToHistory } from '@/components/diagnose/DiagnosisHistory';
import { SimilarCases } from '@/components/diagnose/SimilarCases';
import { LocalSourceBadge } from '@/components/diagnose/LocalSourceBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocationContext } from '@/contexts/GeolocationContext';

export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { locationInfo, position } = useGeolocationContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [actionProgress, setActionProgress] = useState(0);
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  const analysisStartRef = useRef<number | null>(null);

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
    isRestored,
    handleFileSelect,
    analyze,
    reset,
    setSelectedCrop,
    clearImage,
  } = useDiagnosis(language);

  // Track if we already logged this result (to prevent double-logging on re-renders)
  const hasLoggedRef = useRef(false);

  // Track analysis time
  useEffect(() => {
    if (step === 'analyzing') {
      analysisStartRef.current = Date.now();
      hasLoggedRef.current = false; // Reset logging flag for new analysis
    } else if (step === 'result' && analysisStartRef.current) {
      setAnalysisTime(Math.round((Date.now() - analysisStartRef.current) / 1000));
      analysisStartRef.current = null;
    }
  }, [step]);

  // Save to history when result is received (only for NEW diagnoses, not restored ones)
  useEffect(() => {
    if (step === 'result' && result && imageUrl && !isRestored && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      saveDiagnosisToHistory(imageUrl, result);
      logDiagnosisActivity();
    }
  }, [step, result, imageUrl, isRestored]);

  const logDiagnosisActivity = async () => {
    if (!user || !result) return;
    
    // Determine current season based on month
    const getSeason = () => {
      const month = new Date().getMonth();
      if (month >= 2 && month <= 4) return 'dry_season'; // Mar-May
      if (month >= 5 && month <= 9) return 'rainy_season'; // Jun-Oct
      return 'dry_season'; // Nov-Feb
    };
    
    try {
      await supabase.from('user_activity').insert([{
        user_id: user.id,
        activity_type: 'diagnosis',
        metadata: {
          // Basic crop info
          crop: result.detected_crop,
          crop_local: result.detected_crop_local,
          disease_name: result.disease_name,
          disease_local: result.local_name,
          is_healthy: result.is_healthy,
          severity: result.severity,
          confidence: result.confidence,
          description: result.description,
          
          // Symptoms, causes, treatments
          symptoms: result.symptoms || [],
          causes: result.causes || [],
          treatments: [
            ...(result.biological_treatments || []),
            ...(result.chemical_treatments || []),
          ],
          prevention: result.prevention || [],
          
          // Location data
          region: locationInfo?.regionName,
          latitude: position?.latitude,
          longitude: position?.longitude,
          altitude: position?.altitude,
          nearest_city: locationInfo?.nearestCity,
          climate_zone: locationInfo?.climateZone,
          season: getSeason(),
          
          // Source tracking
          from_learning: result.from_learning,
          from_database: result.from_database,
        },
      }]);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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

  return (
    <PageContainer title={t('disease.title')}>
      {/* Network status banner */}
      <NetworkStatus 
        isOnline={isOnline} 
        retryCount={retryCount} 
        maxRetries={maxRetries} 
        language={language} 
      />

      {/* Back button - only show during analyzing, not on result */}
      {step === 'analyzing' && (
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
              {/* Image preview with enhanced styling */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted shadow-lg">
                <img 
                  src={imageUrl} 
                  alt="Captured plant" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3 backdrop-blur-sm"
                  onClick={clearImage}
                  disabled={isCompressing}
                >
                  {language === 'fr' ? 'Changer' : 'Change'}
                </Button>
                
                {/* Online indicator */}
                <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                  <OnlineIndicator isOnline={isOnline} language={language} />
                </div>

                {/* Quick tips overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2 text-white/90 text-xs bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Zap className="w-3 h-3" />
                    <span>
                      {language === 'fr' 
                        ? 'Assurez-vous que la partie malade est bien visible' 
                        : 'Make sure the affected part is clearly visible'}
                    </span>
                  </div>
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

              {/* Crop Selection - enhanced design */}
              {isReady && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-primary" />
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

              {/* Analyze Button - enhanced */}
              <Button
                variant="forest"
                size="xl"
                className="w-full relative overflow-hidden group"
                onClick={handleAnalyze}
                disabled={!isReady || isCompressing || !isOnline}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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
                    <Sparkles className="w-5 h-5 mr-2" />
                    {language === 'fr' ? 'Lancer le diagnostic IA' : 'Start AI diagnosis'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Enhanced Instructions */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Leaf className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-foreground">
                        {language === 'fr' ? 'Diagnostic intelligent' : 'Smart diagnosis'}
                      </h3>
                      <OnlineIndicator isOnline={isOnline} language={language} />
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-primary shrink-0" />
                        {language === 'fr' ? "Photo de votre plante" : "Photo of your plant"}
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        {language === 'fr' ? "Détection automatique par IA" : "AI auto-detection"}
                      </li>
                      <li className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        {language === 'fr' ? "Traitements locaux recommandés" : "Local treatments recommended"}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Camera/Upload Buttons - enhanced */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="forest"
                  size="lg"
                  className="h-36 flex-col gap-3 relative overflow-hidden group"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!isOnline}
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Camera className="w-7 h-7" />
                  </div>
                  <span className="font-medium">{t('disease.take_photo')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-36 flex-col gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOnline}
                >
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-7 h-7" />
                  </div>
                  <span className="font-medium">{t('disease.upload')}</span>
                </Button>
              </div>

              {/* Diagnosis History */}
              <DiagnosisHistory 
                language={language}
                onSelect={(entry) => {
                  // Could implement viewing historical results
                  toast.info(
                    language === 'fr' 
                      ? `Diagnostic: ${entry.result.detected_crop}` 
                      : `Diagnosis: ${entry.result.detected_crop}`
                  );
                }}
              />

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

      {/* ANALYZING STEP - enhanced animation */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <div className="relative w-56 h-56 mb-8">
            <img 
              src={imageUrl!} 
              alt="Analyzing" 
              className="w-full h-full object-cover rounded-2xl shadow-lg"
            />
            {/* Scanning effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 scan-line" />
            </div>
            {/* Pulse overlay */}
            <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse" />
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
          </div>
          
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-xl font-bold text-foreground">{t('disease.analyzing')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {retryCount > 0 
                ? (language === 'fr' ? `Tentative ${retryCount}/${maxRetries}...` : `Attempt ${retryCount}/${maxRetries}...`)
                : (language === 'fr' ? 'Intelligence artificielle en action...' : 'AI in action...')
              }
            </p>
            
            {/* Analysis steps indicator */}
            <div className="flex items-center gap-3 mt-6">
              {['detection', 'analysis', 'treatment'].map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    i === 0 ? "bg-primary animate-pulse" : "bg-muted"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    {language === 'fr' 
                      ? ['Détection', 'Analyse', 'Traitement'][i]
                      : ['Detection', 'Analysis', 'Treatment'][i]
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESULT STEP - completely redesigned */}
      {step === 'result' && result && (
        <div className="space-y-4 fade-in">
          {/* Main Result Card - redesigned */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
            <div className="flex items-start gap-4">
              {/* Image with confidence gauge */}
              <div className="relative">
                <div className="w-24 h-24 rounded-xl overflow-hidden shadow-md">
                  <img 
                    src={imageUrl!} 
                    alt="Analyzed plant" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Crop name */}
                <h2 className="text-xl font-bold text-foreground">
                  {result.detected_crop}
                </h2>
                {result.detected_crop_local && (
                  <p className="text-sm text-muted-foreground">{result.detected_crop_local}</p>
                )}
                
                {/* Disease name if sick */}
                {!result.is_healthy && result.disease_name && (
                  <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {result.disease_name}
                    </p>
                    {result.local_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{result.local_name}</p>
                    )}
                  </div>
                )}

                {/* Analysis time badge */}
                {analysisTime && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Timer className="w-3 h-3" />
                    {language === 'fr' ? `Analysé en ${analysisTime}s` : `Analyzed in ${analysisTime}s`}
                  </div>
                )}
              </div>

              {/* Confidence gauge */}
              <ConfidenceGauge 
                confidence={result.confidence} 
                size="sm" 
                language={language} 
              />
            </div>
          </div>

          {/* Local Source Indicator */}
          <LocalSourceBadge 
            fromLearning={result.from_learning === true} 
            fromDatabase={result.from_database === true && !result.from_learning}
            language={language}
          />

          {/* Severity Score */}
          <SeverityScore 
            severity={result.severity || 'healthy'} 
            language={language}
            size="md"
          />

          {/* Description */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-foreground leading-relaxed">
              {result.description}
            </p>
          </div>

          {/* Action buttons row */}
          <div className="flex gap-2">
            <Button 
              variant="harvest" 
              className="flex-1" 
              size="lg"
              onClick={speakResult}
              disabled={isReading}
            >
              <Volume2 className={cn("w-5 h-5 mr-2", isReading && "animate-pulse")} />
              {isReading 
                ? (language === 'fr' ? 'Lecture...' : 'Reading...') 
                : t('disease.listen')}
            </Button>
          </div>

          {/* Share options */}
          <ShareDiagnosis 
            result={result} 
            imageUrl={imageUrl!} 
            language={language} 
          />

          {/* Similar cases - for sick plants */}
          {!result.is_healthy && result.disease_name && (
            <SimilarCases 
              diseaseName={result.disease_name}
              cropName={result.detected_crop}
              language={language}
            />
          )}

          {/* HEALTHY PLANT: Maintenance and Improvement Tips */}
          {result.is_healthy && (
            <>
              {result.maintenance_tips && result.maintenance_tips.length > 0 && (
                <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-success" />
                    {language === 'fr' ? "Conseils d'entretien" : 'Maintenance Tips'}
                  </h3>
                  <ActionChecklist 
                    actions={result.maintenance_tips}
                    diseaseId={`healthy-${result.detected_crop}`}
                    language={language}
                    onProgressChange={setActionProgress}
                  />
                </div>
              )}

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
              {/* Interactive Action Checklist for treatments */}
              {(result.biological_treatments?.length || result.chemical_treatments?.length) && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    {t('disease.treatments')}
                  </h3>
                  <ActionChecklist 
                    actions={[
                      ...(result.biological_treatments || []).map(t => `🌿 ${t}`),
                      ...(result.chemical_treatments || []).map(t => `💊 ${t}`),
                    ]}
                    diseaseId={result.disease_name}
                    language={language}
                    onProgressChange={setActionProgress}
                  />
                </div>
              )}

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
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Nouvelle analyse' : 'New analysis'}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
