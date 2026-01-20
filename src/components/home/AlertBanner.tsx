import { AlertTriangle, X, Info, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGeolocationContext } from '@/contexts/GeolocationContext';

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
  const { language, t } = useLanguage();
  const { locationInfo, position, loading: geoLoading } = useGeolocationContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      // Wait for geolocation to settle
      if (geoLoading) return;
      
      try {
        setLoading(true);
        
        // Use detected region or default to 'centre'
        const region = locationInfo?.region || 'centre';
        
        console.log('[AlertBanner] Fetching alerts for region:', region, 'city:', locationInfo?.nearestCity);
        
        const { data, error } = await supabase.functions.invoke('get-alerts', {
          body: { 
            region, 
            language,
            coordinates: position ? {
              latitude: position.latitude,
              longitude: position.longitude,
              altitude: position.altitude,
              climateZone: locationInfo?.climateZone
            } : null
          },
        });

        if (error) throw error;
        if (data?.success && data?.alerts) {
          setAlerts(data.alerts);
        }
      } catch (err) {
        console.error('[AlertBanner] Alerts fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [language, locationInfo?.region, geoLoading]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(alert.id));

  if (loading || geoLoading) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">
            {language === 'fr' ? 'Attention' : 'Alerts'}
          </h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">
              {language === 'fr' ? 'Attention' : 'Alerts'}
            </h3>
          </div>
          {locationInfo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{locationInfo.nearestCity}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {language === 'fr' ? 'Aucune alerte pour votre région' : 'No alerts for your region'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">
            {language === 'fr' ? 'Attention' : 'Alerts'}
          </h3>
        </div>
        {locationInfo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{locationInfo.nearestCity}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const style = alertStyles[alert.type] || alertStyles.info;
          const Icon = style.icon;

          return (
            <div 
              key={alert.id}
              className={`p-3 rounded-lg ${style.container} border flex gap-3`}
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
    </div>
  );
}
