import { Loader2, Check, AlertCircle, Image, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompressionStep } from '@/hooks/useDiagnosis';

interface CompressionIndicatorProps {
  step: CompressionStep;
  progress: number;
  language: string;
}

const stepLabels = {
  idle: { fr: 'En attente...', en: 'Waiting...' },
  reading: { fr: 'Lecture de l\'image...', en: 'Reading image...' },
  resizing: { fr: 'Redimensionnement...', en: 'Resizing...' },
  compressing: { fr: 'Compression optimale...', en: 'Optimal compression...' },
  ready: { fr: 'Image prête !', en: 'Image ready!' },
  error: { fr: 'Erreur de compression', en: 'Compression error' },
};

const stepIcons = {
  idle: Loader2,
  reading: Image,
  resizing: Maximize2,
  compressing: Minimize2,
  ready: Check,
  error: AlertCircle,
};

export function CompressionIndicator({ step, progress, language }: CompressionIndicatorProps) {
  const Icon = stepIcons[step];
  const label = stepLabels[step][language as 'fr' | 'en'] || stepLabels[step].en;
  
  const isAnimating = ['idle', 'reading', 'resizing', 'compressing'].includes(step);
  const isSuccess = step === 'ready';
  const isError = step === 'error';

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          isSuccess && "bg-success/10",
          isError && "bg-destructive/10",
          !isSuccess && !isError && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            isAnimating && "animate-spin",
            isSuccess && "text-success",
            isError && "text-destructive",
            !isSuccess && !isError && "text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium",
            isSuccess && "text-success",
            isError && "text-destructive",
            !isSuccess && !isError && "text-foreground"
          )}>
            {label}
          </p>
          {!isSuccess && !isError && (
            <p className="text-xs text-muted-foreground">
              {language === 'fr' ? 'Préparation pour l\'analyse IA...' : 'Preparing for AI analysis...'}
            </p>
          )}
        </div>
        <span className={cn(
          "text-sm font-bold tabular-nums",
          isSuccess && "text-success",
          isError && "text-destructive",
          !isSuccess && !isError && "text-primary"
        )}>
          {progress}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            isSuccess && "bg-success",
            isError && "bg-destructive",
            !isSuccess && !isError && "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
