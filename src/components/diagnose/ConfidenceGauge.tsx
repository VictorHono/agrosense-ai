import { cn } from '@/lib/utils';

interface ConfidenceGaugeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  language: string;
}

export function ConfidenceGauge({ 
  confidence, 
  size = 'md', 
  showLabel = true,
  language 
}: ConfidenceGaugeProps) {
  const sizes = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-[10px]' },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' },
    lg: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-sm' },
  };

  const getColor = (value: number) => {
    if (value >= 85) return { stroke: 'stroke-success', text: 'text-success', bg: 'bg-success/10' };
    if (value >= 70) return { stroke: 'stroke-primary', text: 'text-primary', bg: 'bg-primary/10' };
    if (value >= 50) return { stroke: 'stroke-warning', text: 'text-warning', bg: 'bg-warning/10' };
    return { stroke: 'stroke-destructive', text: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const colors = getColor(confidence);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", sizes[size].container)}>
      <svg className="absolute -rotate-90 w-full h-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          className={cn("transition-all duration-1000 ease-out", colors.stroke)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className={cn("absolute flex flex-col items-center justify-center rounded-full", colors.bg, sizes[size].container)}>
        <span className={cn("font-bold", sizes[size].text, colors.text)}>
          {confidence}%
        </span>
        {showLabel && (
          <span className={cn("text-muted-foreground", sizes[size].label)}>
            {language === 'fr' ? 'confiance' : 'confidence'}
          </span>
        )}
      </div>
    </div>
  );
}
