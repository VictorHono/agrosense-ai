import { Cloud, Sun, Droplets, Wind, CloudRain, CloudLightning, CloudFog, Loader2, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGeolocationContext } from '@/contexts/GeolocationContext';

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  location: string;
  rain_probability: number;
  agricultural_advice: string;
  altitude?: number;
  climate_zone?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'sun': <Sun className="w-6 h-6 text-warning" />,
  'cloud-sun': <><Sun className="w-6 h-6 text-warning" /><Cloud className="w-4 h-4 text-info/60 -ml-2 mt-2" /></>,
  'cloud': <Cloud className="w-6 h-6 text-muted-foreground" />,
  'cloud-rain': <CloudRain className="w-6 h-6 text-info" />,
  'cloud-drizzle': <CloudRain className="w-6 h-6 text-info/70" />,
  'cloud-lightning': <CloudLightning className="w-6 h-6 text-warning" />,
  'cloud-fog': <CloudFog className="w-6 h-6 text-muted-foreground" />,
};

export function WeatherWidget() {
  const { language } = useLanguage();
  const { position, loading: geoLoading, error: geoError, locationInfo } = useGeolocationContext();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        
        const body: Record<string, any> = { language };
        
        // Use real GPS coordinates if available
        if (position) {
          body.latitude = position.latitude;
          body.longitude = position.longitude;
          body.altitude = position.altitude;
          body.accuracy = position.accuracy;
        } else {
          // Fallback to default region
          body.region = 'centre';
        }

        const { data, error: fetchError } = await supabase.functions.invoke('get-weather', {
          body,
        });

        if (fetchError) throw fetchError;
        if (data?.success && data?.weather) {
          setWeather(data.weather);
        } else {
          throw new Error('Invalid response');
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(language === 'fr' ? 'Météo indisponible' : 'Weather unavailable');
      } finally {
        setLoading(false);
      }
    };

    // Fetch when position is available or after geo loading finishes
    if (!geoLoading) {
      fetchWeather();
    }
  }, [language, position, geoLoading]);

  if (loading || geoLoading) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-5 h-5 text-info animate-spin" />
          <span className="text-sm text-muted-foreground">
            {geoLoading 
              ? (language === 'fr' ? 'Localisation...' : 'Getting location...')
              : (language === 'fr' ? 'Chargement météo...' : 'Loading weather...')
            }
          </span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/5 border border-border">
        <p className="text-sm text-muted-foreground text-center">{error || 'Météo indisponible'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20">
      <div className="flex items-center justify-between">
        {/* Main Weather */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
            {iconMap[weather.icon] || <Sun className="w-6 h-6 text-warning" />}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{weather.temp}°</span>
              <span className="text-sm text-muted-foreground">C</span>
            </div>
            <p className="text-xs text-muted-foreground">{weather.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <Droplets className="w-4 h-4 text-info mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">{weather.humidity}%</span>
          </div>
          <div className="text-center">
            <Wind className="w-4 h-4 text-info mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">{weather.wind_speed} km/h</span>
          </div>
          {weather.rain_probability > 0 && (
            <div className="text-center">
              <CloudRain className="w-4 h-4 text-info mx-auto mb-1" />
              <span className="text-xs text-muted-foreground">{weather.rain_probability}%</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Agricultural Advice */}
      <p className="text-xs text-foreground/80 mt-3 p-2 bg-background/50 rounded-lg">
        {weather.agricultural_advice}
      </p>
      
      {/* Location with GPS indicator */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {position ? (
            <Navigation className="w-3 h-3 text-success" />
          ) : (
            <MapPin className="w-3 h-3" />
          )}
          <span>{weather.location}</span>
        </div>
        {weather.altitude && (
          <span className="text-[10px] text-muted-foreground">
            ⛰️ {Math.round(weather.altitude)}m
          </span>
        )}
      </div>
    </div>
  );
}
