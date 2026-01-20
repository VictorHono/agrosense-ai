import { AlertTriangle, X, Info, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  message: string;
  region: string;
  created_at: string;
  expires_at: string;
}

const alertStyles = {
  warning: {
    container: 'bg-warning/10 border-warning/30',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  info: {
    container: 'bg-info/10 border-info/30',
    icon: Info,
    iconClass: 'text-info',
  },
  danger: {
    container: 'bg-destructive/10 border-destructive/30',
    icon: AlertCircle,
    iconClass: 'text-destructive',
  },
};

export function AlertBanner() {
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-alerts', {
          body: { region: 'centre', language },
        });

        if (error) throw error;
        if (data?.success && data?.alerts) {
          setAlerts(data.alerts);
        }
      } catch (err) {
        console.error('Alerts fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [language]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(alert.id));

  if (loading) {
    return (
      <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const style = alertStyles[alert.type] || alertStyles.info;
        const Icon = style.icon;

        return (
          <div 
            key={alert.id}
            className={`p-3 rounded-xl ${style.container} border flex gap-3`}
          >
            <Icon className={`w-5 h-5 ${style.iconClass} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground">{alert.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {alert.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-6 w-6"
              onClick={() => handleDismiss(alert.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
