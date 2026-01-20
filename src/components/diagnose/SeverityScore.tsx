import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldX, Skull, Heart } from 'lucide-react';

interface SeverityScoreProps {
  severity: 'healthy' | 'low' | 'medium' | 'high' | 'critical';
  language: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SeverityScore({ 
  severity, 
  language, 
  showIcon = true,
  size = 'md' 
}: SeverityScoreProps) {
  const config = {
    healthy: {
      score: 100,
      label: { fr: 'Excellente santé', en: 'Excellent health' },
      color: 'bg-success text-success-foreground',
      bgLight: 'bg-success/10',
      textColor: 'text-success',
      icon: Heart,
      bars: 5,
    },
    low: {
      score: 75,
      label: { fr: 'Faible risque', en: 'Low risk' },
      color: 'bg-warning text-warning-foreground',
      bgLight: 'bg-warning/10',
      textColor: 'text-warning',
      icon: ShieldCheck,
      bars: 4,
    },
    medium: {
      score: 50,
      label: { fr: 'Risque modéré', en: 'Moderate risk' },
      color: 'bg-warning text-warning-foreground',
      bgLight: 'bg-warning/10',
      textColor: 'text-warning',
      icon: ShieldAlert,
      bars: 3,
    },
    high: {
      score: 25,
      label: { fr: 'Risque élevé', en: 'High risk' },
      color: 'bg-destructive text-destructive-foreground',
      bgLight: 'bg-destructive/10',
      textColor: 'text-destructive',
      icon: ShieldX,
      bars: 2,
    },
    critical: {
      score: 10,
      label: { fr: 'Critique', en: 'Critical' },
      color: 'bg-destructive text-destructive-foreground',
      bgLight: 'bg-destructive/10',
      textColor: 'text-destructive',
      icon: Skull,
      bars: 1,
    },
  };

  const { score, label, color, bgLight, textColor, icon: Icon, bars } = config[severity];

  const sizes = {
    sm: { container: 'p-2', icon: 'w-4 h-4', text: 'text-sm', bar: 'h-1' },
    md: { container: 'p-3', icon: 'w-5 h-5', text: 'text-base', bar: 'h-1.5' },
    lg: { container: 'p-4', icon: 'w-6 h-6', text: 'text-lg', bar: 'h-2' },
  };

  return (
    <div className={cn(
      "rounded-xl border",
      bgLight,
      "border-current/20",
      sizes[size].container
    )}>
      <div className="flex items-center gap-3">
        {showIcon && (
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className={sizes[size].icon} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={cn("font-semibold", textColor, sizes[size].text)}>
              {label[language as 'fr' | 'en']}
            </span>
            <span className={cn("font-bold", textColor)}>
              {score}/100
            </span>
          </div>
          {/* Health bars */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all",
                  sizes[size].bar,
                  i <= bars ? color : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
