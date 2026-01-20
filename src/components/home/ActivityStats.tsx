import { Camera, BarChart3, BookOpen, Loader2 } from 'lucide-react';
import { useUserActivity } from '@/hooks/useUserActivity';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

export function ActivityStats() {
  const { stats, loading } = useUserActivity();
  const { user } = useAuth();
  const { t } = useLanguage();

  // If not logged in, show a prompt to sign in
  if (!user) {
    return (
      <div className="p-4 rounded-2xl bg-card border border-border fade-in" style={{ animationDelay: '600ms' }}>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          {t('home.activity.title') || 'Votre activité récente'}
        </h3>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Connectez-vous pour suivre votre activité
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-card border border-border fade-in" style={{ animationDelay: '600ms' }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        {t('home.activity.title') || 'Votre activité récente'}
      </h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <Link
            to="/diagnose"
            className="p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
          >
            <div className="flex items-center justify-center mb-1">
              <Camera className="w-4 h-4 text-primary mr-1 opacity-60" />
              <span className="text-2xl font-bold text-primary">{stats.diagnostics}</span>
            </div>
            <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
              Diagnostics
            </p>
          </Link>
          
          <Link
            to="/harvest"
            className="p-3 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors group"
          >
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="w-4 h-4 text-accent-foreground mr-1 opacity-60" />
              <span className="text-2xl font-bold text-accent-foreground">{stats.analyses}</span>
            </div>
            <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
              Analyses
            </p>
          </Link>
          
          <Link
            to="/tips"
            className="p-3 rounded-xl bg-success/10 hover:bg-success/20 transition-colors group"
          >
            <div className="flex items-center justify-center mb-1">
              <BookOpen className="w-4 h-4 text-success mr-1 opacity-60" />
              <span className="text-2xl font-bold text-success">{stats.tipsRead}</span>
            </div>
            <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
              Conseils lus
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}
