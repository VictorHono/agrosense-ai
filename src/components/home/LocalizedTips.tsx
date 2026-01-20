import { Lightbulb, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGeolocationContext } from '@/contexts/GeolocationContext';

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
}

export function LocalizedTips() {
  const { language, t } = useLanguage();
  const { locationInfo, position, loading: geoLoading } = useGeolocationContext();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTips = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine region from geolocation
      const region = locationInfo?.region || 'centre';
      
      console.log('[LocalizedTips] Fetching tips for region:', region, 'language:', language);

      const { data, error: fetchError } = await supabase.functions.invoke('get-tips', {
        body: { 
          category: 'seasonal',
          region,
          language,
          limit: 3,
          coordinates: position ? {
            latitude: position.latitude,
            longitude: position.longitude,
            altitude: position.altitude
          } : null
        },
      });

      if (fetchError) throw fetchError;
      
      if (data?.success && data?.tips) {
        setTips(data.tips.slice(0, 3));
      } else {
        setTips([]);
      }
    } catch (err) {
      console.error('[LocalizedTips] Fetch error:', err);
      setError(language === 'fr' ? 'Impossible de charger les conseils' : 'Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for geolocation to settle before fetching
    if (!geoLoading) {
      fetchTips();
    }
  }, [language, locationInfo?.region, geoLoading]);

  if (loading || geoLoading) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">
            {language === 'fr' ? 'Conseils' : 'Tips'}
          </h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">
              {language === 'fr' ? 'Conseils' : 'Tips'}
            </h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchTips}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
      </div>
    );
  }

  if (tips.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">
            {language === 'fr' ? 'Conseils' : 'Tips'}
          </h3>
        </div>
        {locationInfo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{locationInfo.nearestCity}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div 
            key={tip.id || index}
            className="p-3 rounded-lg bg-warning/5 border border-warning/20"
          >
            <h4 className="font-medium text-sm text-foreground mb-1">{tip.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{tip.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
