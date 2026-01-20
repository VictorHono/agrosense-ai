import { Cloud, Sun, Droplets, Wind, CloudRain, CloudLightning, CloudFog, Loader2, MapPin, Navigation, AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGeolocationContext } from '@/contexts/GeolocationContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const MANUAL_LOCATIONS = [
  { id: 'douala', label: 'Douala (Littoral)', lat: 4.0503, lon: 9.7 },
  { id: 'yaounde', label: 'Yaoundé (Centre)', lat: 3.8667, lon: 11.5167 },
  { id: 'bafoussam', label: 'Bafoussam (Ouest)', lat: 5.4833, lon: 10.4167 },
  { id: 'bamenda', label: 'Bamenda (Nord-Ouest)', lat: 5.95, lon: 10.15 },
  { id: 'buea', label: 'Buéa (Sud-Ouest)', lat: 4.15, lon: 9.2333 },
  { id: 'ebolowa', label: 'Ebolowa (Sud)', lat: 2.9333, lon: 11.15 },
  { id: 'bertoua', label: 'Bertoua (Est)', lat: 4.5833, lon: 13.6833 },
  { id: 'ngaoundere', label: 'Ngaoundéré (Adamaoua)', lat: 7.3167, lon: 13.5833 },
  { id: 'garoua', label: 'Garoua (Nord)', lat: 9.3, lon: 13.3833 },
  { id: 'maroua', label: 'Maroua (Extrême-Nord)', lat: 10.5917, lon: 14.3167 },
] as const;

export function WeatherWidget() {
  const { language } = useLanguage();
  const {
    position,
    loading: geoLoading,
    error: geoError,
    locationInfo,
    refresh: refreshGeo,
    hasPermission,
    permissionDenied,
    positionSource,
    setManualLocation,
    clearManualLocation,
    startWatching,
  } = useGeolocationContext();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchCoords, setLastFetchCoords] = useState<{lat: number, lon: number} | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!position) {
      console.log('[WeatherWidget] No position available, skipping fetch');
      return;
    }

    // Avoid refetching if coordinates haven't changed significantly (< 1km)
    if (lastFetchCoords) {
      const latDiff = Math.abs(position.latitude - lastFetchCoords.lat);
      const lonDiff = Math.abs(position.longitude - lastFetchCoords.lon);
      // ~0.01 degrees ≈ 1km
      if (latDiff < 0.01 && lonDiff < 0.01 && weather) {
        console.log('[WeatherWidget] Position unchanged, using cached weather');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('[WeatherWidget] Fetching weather for:', {
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude,
      });

      const { data, error: fetchError } = await supabase.functions.invoke('get-weather', {
        body: {
          language,
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude,
          accuracy: position.accuracy,
        },
      });

      if (fetchError) throw fetchError;
      
      if (data?.success && data?.weather) {
        console.log('[WeatherWidget] Weather received:', data.weather.location);
        setWeather(data.weather);
        setLastFetchCoords({ lat: position.latitude, lon: position.longitude });
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('[WeatherWidget] Fetch error:', err);
      setError(language === 'fr' ? 'Météo indisponible' : 'Weather unavailable');
    } finally {
      setLoading(false);
    }
  }, [position, language, weather, lastFetchCoords]);

  // Fetch weather when position becomes available or changes
  useEffect(() => {
    if (position && !geoLoading) {
      fetchWeather();
    }
  }, [position, geoLoading, fetchWeather]);

  const handleManualLocation = useCallback((id: string) => {
    const loc = MANUAL_LOCATIONS.find(l => l.id === id);
    if (!loc) return;
    setManualLocation({ latitude: loc.lat, longitude: loc.lon });
  }, [setManualLocation]);

  const retryGps = useCallback(() => {
    // If user was in manual mode, let them switch back to GPS.
    clearManualLocation();
    // Try both single-shot and watch, because different browsers behave differently.
    startWatching();
    refreshGeo();
  }, [clearManualLocation, startWatching, refreshGeo]);

  // Permission denied (or unsupported) AND no position => offer manual fallback
  if ((!hasPermission || permissionDenied || geoError?.code === 0) && !position && !geoLoading) {
    return (
      <div data-testid="weather-widget" className="p-4 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {language === 'fr' ? 'Localisation requise' : 'Location required'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {geoError?.message || (language === 'fr'
                ? 'Autorisez l\'accès à votre position pour des conseils agricoles personnalisés à votre zone.'
                : 'Allow location access for agricultural advice personalized to your area.')}
            </p>

            <div className="mt-3 space-y-2">
              <Button variant="outline" size="sm" onClick={retryGps}>
                <RefreshCw className="w-3 h-3 mr-2" />
                {language === 'fr' ? 'Réessayer GPS' : 'Retry GPS'}
              </Button>

              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground">
                  {language === 'fr'
                    ? 'Si le navigateur bloque le GPS, choisissez une ville (persistant sur cet appareil) :'
                    : 'If GPS is blocked, choose a city (saved on this device):'}
                </p>
                <Select onValueChange={handleManualLocation}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={language === 'fr' ? 'Choisir une ville…' : 'Choose a city…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_LOCATIONS.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {permissionDenied && (
                <p className="text-[11px] text-muted-foreground">
                  {language === 'fr'
                    ? 'Astuce Chrome: cliquez sur 🔒 à gauche de l\'URL → "Localisation" → Autoriser, puis rechargez.'
                    : 'Chrome tip: click 🔒 next to the URL → "Location" → Allow, then reload.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (geoLoading || (loading && !weather)) {
    return (
      <div data-testid="weather-widget" className="p-4 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-5 h-5 text-info animate-spin" />
          <span className="text-sm text-muted-foreground">
            {geoLoading 
              ? (language === 'fr' ? 'Localisation GPS en cours...' : 'Getting GPS location...')
              : (language === 'fr' ? 'Chargement météo...' : 'Loading weather...')
            }
          </span>
        </div>
      </div>
    );
  }

  // Show error state (but still waiting for position)
  if (!position && !weather) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/5 border border-border">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {geoError?.message || (language === 'fr' ? 'Position en attente...' : 'Waiting for position...')}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 h-7 text-xs"
              onClick={refreshGeo}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {language === 'fr' ? 'Actualiser' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Weather error but no data at all
  if (error && !weather) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/5 border border-border">
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  // Show weather data
  if (!weather) return null;

  return (
    <div data-testid="weather-widget" className="relative p-4 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20">
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
          {position && positionSource === 'gps' ? (
            <Navigation className="w-3 h-3 text-success" />
          ) : (
            <MapPin className="w-3 h-3" />
          )}
          <span>{weather.location}</span>
          {locationInfo && locationInfo.distanceToCity > 5 && (
            <span className="text-muted-foreground/60">
              (~{locationInfo.distanceToCity}km)
            </span>
          )}
          {positionSource === 'cache' && (
            <span className="text-muted-foreground/60">• {language === 'fr' ? 'cache' : 'cached'}</span>
          )}
          {positionSource === 'manual' && (
            <span className="text-muted-foreground/60">• {language === 'fr' ? 'manuel' : 'manual'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {weather.climate_zone && (
            <span className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
              {weather.climate_zone}
            </span>
          )}
          {weather.altitude && (
            <span className="text-[10px] text-muted-foreground">
              ⛰️ {Math.round(weather.altitude)}m
            </span>
          )}
        </div>
      </div>

      {/* Loading indicator for background refresh */}
      {loading && weather && (
        <div className="absolute top-2 right-2">
          <Loader2 className="w-3 h-3 text-info/50 animate-spin" />
        </div>
      )}
    </div>
  );
}
