import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
  delay?: number;
}

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    icon: 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
    hover: 'hover:border-primary/30',
  },
  accent: {
    bg: 'bg-accent/10',
    icon: 'bg-gradient-to-br from-accent to-accent/80 text-accent-foreground',
    hover: 'hover:border-accent/30',
  },
  success: {
    bg: 'bg-success/10',
    icon: 'bg-gradient-to-br from-success to-success/80 text-success-foreground',
    hover: 'hover:border-success/30',
  },
  warning: {
    bg: 'bg-warning/10',
    icon: 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground',
    hover: 'hover:border-warning/30',
  },
};

export function FeatureCard({ to, icon, title, description, color, delay = 0 }: FeatureCardProps) {
  const colors = colorClasses[color];

  return (
    <Link
      to={to}
      className={cn(
        "block p-4 rounded-2xl bg-card border-2 border-transparent transition-all duration-300",
        "shadow-md hover:shadow-lg active:scale-[0.98]",
        colors.hover,
        "slide-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center shadow-md",
          colors.icon
        )}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground mb-0.5 truncate">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
