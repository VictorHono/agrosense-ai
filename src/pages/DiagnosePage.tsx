import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, Volume2, ChevronLeft, AlertTriangle, Check, Leaf } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { CROP_LABELS, type Crop } from '@/types';

type AnalysisStep = 'capture' | 'analyzing' | 'result';

interface MockResult {
  disease: string;
  localName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  causes: string[];
  treatments: { type: 'biological' | 'chemical'; name: string; dosage: string }[];
  prevention: string[];
}

export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<AnalysisStep>('capture');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!imageUrl || !selectedCrop) return;
    
    setStep('analyzing');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock result
    setResult({
      disease: 'Cercosporiose',
      localName: 'Maladie des taches foliaires',
      severity: 'medium',
      confidence: 87,
      description: 'La cercosporiose est une maladie fongique qui provoque des taches brunes sur les feuilles. Elle est courante pendant la saison des pluies.',
      causes: [
        'Humidité excessive',
        'Mauvaise circulation d\'air',
        'Sol contaminé'
      ],
      treatments: [
        { type: 'biological', name: 'Extrait de neem', dosage: '50ml/L d\'eau, pulvériser tous les 7 jours' },
        { type: 'chemical', name: 'Fongicide Mancozèbe', dosage: '2.5g/L d\'eau, appliquer toutes les 2 semaines' }
      ],
      prevention: [
        'Espacer les plants pour favoriser l\'aération',
        'Éviter l\'arrosage excessif',
        'Retirer les feuilles infectées',
        'Rotation des cultures'
      ]
    });
    
    setStep('result');
  };

  const resetAnalysis = () => {
    setStep('capture');
    setImageUrl(null);
    setSelectedCrop(null);
    setResult(null);
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
                  onClick={() => setImageUrl(null)}
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
                <h2 className="text-lg font-bold text-foreground">{result.disease}</h2>
                <p className="text-sm text-muted-foreground">{result.localName}</p>
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
          <Button variant="harvest" className="w-full" size="lg">
            <Volume2 className="w-5 h-5 mr-2" />
            {t('disease.listen')}
          </Button>

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
              {result.treatments.map((treatment, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg border",
                  treatment.type === 'biological' 
                    ? "bg-success/5 border-success/20" 
                    : "bg-info/5 border-info/20"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-medium uppercase px-1.5 py-0.5 rounded",
                      treatment.type === 'biological' 
                        ? "bg-success/10 text-success" 
                        : "bg-info/10 text-info"
                    )}>
                      {treatment.type === 'biological' ? 'Biologique' : 'Chimique'}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-foreground">{treatment.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{treatment.dosage}</p>
                </div>
              ))}
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
