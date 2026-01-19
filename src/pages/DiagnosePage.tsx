import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, Volume2, ChevronLeft, AlertTriangle, Check, Leaf } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CROP_LABELS, type Crop } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AnalysisStep = 'capture' | 'analyzing' | 'result';

interface AnalysisResult {
  disease_name: string;
  local_name?: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  causes: string[];
  symptoms: string[];
  biological_treatments: string[];
  chemical_treatments: string[];
  prevention: string[];
  affected_crop: string;
}

export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<AnalysisStep>('capture');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
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
      const { data, error } = await supabase.functions.invoke('analyze-plant', {
        body: {
          image: imageBase64,
          crop_hint: CROP_LABELS[selectedCrop][language],
          language: language,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.analysis) {
        setResult(data.analysis);
        setStep('result');
      } else {
        throw new Error('Résultat inattendu');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Erreur lors de l\'analyse. Veuillez réessayer.'
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

  const speakResult = () => {
    if (!result || isReading) return;

    const text = language === 'fr'
      ? `Maladie détectée: ${result.disease_name}. ${result.local_name ? `Aussi appelée ${result.local_name}.` : ''} 
         Niveau de gravité: ${result.severity === 'low' ? 'faible' : result.severity === 'medium' ? 'moyen' : result.severity === 'high' ? 'élevé' : 'critique'}. 
         ${result.description}. 
         Traitements recommandés: ${result.biological_treatments.join('. ')}. 
         ${result.chemical_treatments.length > 0 ? 'Traitements chimiques: ' + result.chemical_treatments.join('. ') : ''}`
      : `Disease detected: ${result.disease_name}. ${result.local_name ? `Also called ${result.local_name}.` : ''} 
         Severity level: ${result.severity}. 
         ${result.description}. 
         Recommended treatments: ${result.biological_treatments.join('. ')}. 
         ${result.chemical_treatments.length > 0 ? 'Chemical treatments: ' + result.chemical_treatments.join('. ') : ''}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => {
      setIsReading(false);
      toast.error('Impossible de lire le texte');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const severityColors = {
    low: 'bg-success/10 text-success border-success/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    critical: 'bg-destructive text-destructive-foreground border-destructive',
  };

  const popularCrops: Crop[] = ['mais', 'cacao', 'manioc', 'banane-plantain', 'tomate', 'cafe'];

  return (
    <PageContainer title={t('disease.title')}>
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
                  alt="Captured plant" 
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
                  Changer
                </Button>
              </div>

              {/* Crop Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Quelle culture est-ce ?
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
                variant="forest"
                size="xl"
                className="w-full"
                onClick={handleAnalyze}
                disabled={!selectedCrop}
              >
                <Camera className="w-5 h-5 mr-2" />
                Analyser la plante
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
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      Comment prendre une bonne photo ?
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• Photographiez les feuilles affectées de près</li>
                      <li>• Assurez un bon éclairage naturel</li>
                      <li>• Évitez les photos floues</li>
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
                >
                  <Camera className="w-8 h-8" />
                  <span>{t('disease.take_photo')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-32 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
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
            {/* Scan line animation */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent scan-line" />
            </div>
            <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse" />
          </div>
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-lg font-semibold text-foreground">{t('disease.analyzing')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Identification de la maladie en cours...
          </p>
        </div>
      )}

      {/* RESULT STEP */}
      {step === 'result' && result && (
        <div className="space-y-4 fade-in">
          {/* Disease Card */}
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
                  severityColors[result.severity]
                )}>
                  <AlertTriangle className="w-3 h-3" />
                  {t(`severity.${result.severity}`)}
                </div>
                <h2 className="text-lg font-bold text-foreground">{result.disease_name}</h2>
                {result.local_name && (
                  <p className="text-sm text-muted-foreground">{result.local_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Culture: {result.affected_crop}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
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
            {isReading ? 'Lecture en cours...' : t('disease.listen')}
          </Button>

          {/* Symptoms */}
          {result.symptoms.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-warning" />
                Symptômes
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

          {/* Treatments */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              {t('disease.treatments')}
            </h3>
            <div className="space-y-3">
              {/* Biological treatments */}
              {result.biological_treatments.length > 0 && (
                <div className="p-3 rounded-lg border bg-success/5 border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-success/10 text-success">
                      Biologique
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
              {result.chemical_treatments.length > 0 && (
                <div className="p-3 rounded-lg border bg-info/5 border-info/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-info/10 text-info">
                      Chimique
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

          {/* Prevention */}
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

          {/* New Analysis Button */}
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={resetAnalysis}
          >
            Nouvelle analyse
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
