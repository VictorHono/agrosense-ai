import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Compass,
  Mountain,
  Globe2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGeolocationContext } from '@/contexts/GeolocationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

const MANUAL_LOCATIONS = [
  { id: 'douala', label: 'Douala (Littoral)', lat: 4.0503, lon: 9.7, altitude: 13 },
  { id: 'yaounde', label: 'Yaoundé (Centre)', lat: 3.8667, lon: 11.5167, altitude: 726 },
  { id: 'bafoussam', label: 'Bafoussam (Ouest)', lat: 5.4833, lon: 10.4167, altitude: 1450 },
  { id: 'bamenda', label: 'Bamenda (Nord-Ouest)', lat: 5.95, lon: 10.15, altitude: 1600 },
  { id: 'buea', label: 'Buéa (Sud-Ouest)', lat: 4.15, lon: 9.2333, altitude: 1000 },
  { id: 'ebolowa', label: 'Ebolowa (Sud)', lat: 2.9333, lon: 11.15, altitude: 613 },
  { id: 'bertoua', label: 'Bertoua (Est)', lat: 4.5833, lon: 13.6833, altitude: 672 },
  { id: 'ngaoundere', label: 'Ngaoundéré (Adamaoua)', lat: 7.3167, lon: 13.5833, altitude: 1102 },
  { id: 'garoua', label: 'Garoua (Nord)', lat: 9.3, lon: 13.3833, altitude: 244 },
  { id: 'maroua', label: 'Maroua (Extrême-Nord)', lat: 10.5917, lon: 14.3167, altitude: 405 },
] as const;

export function LocationSettings() {
  const { language } = useLanguage();
  const {
    position,
    loading,
    error,
    locationInfo,
    refresh,
    startWatching,
    hasPermission,
    permissionDenied,
    positionSource,
    setManualLocation,
    clearManualLocation,
  } = useGeolocationContext();

  const [useGPS, setUseGPS] = useState(positionSource === 'gps' || positionSource === 'cache');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);

  // Update GPS toggle based on position source
  useEffect(() => {
    setUseGPS(positionSource === 'gps' || positionSource === 'cache');
  }, [positionSource]);

  // Find currently selected manual city
  useEffect(() => {
    if (positionSource === 'manual' && position) {
      const city = MANUAL_LOCATIONS.find(
        loc => Math.abs(loc.lat - position.latitude) < 0.01 && Math.abs(loc.lon - position.longitude) < 0.01
      );
      if (city) setSelectedCity(city.id);
    }
  }, [positionSource, position]);

  const handleGPSToggle = (enabled: boolean) => {
    setUseGPS(enabled);
    if (enabled) {
      clearManualLocation();
      startWatching();
      refresh();
    }
  };

  const handleCitySelect = (cityId: string) => {
    const city = MANUAL_LOCATIONS.find(l => l.id === cityId);
    if (city) {
      setSelectedCity(cityId);
      setUseGPS(false);
      setManualLocation({ latitude: city.lat, longitude: city.lon, altitude: city.altitude });
    }
  };

  const handleRetryGPS = async () => {
    setIsRetrying(true);
    clearManualLocation();
    startWatching();
    refresh();
    // Wait for the attempt
    setTimeout(() => setIsRetrying(false), 3000);
  };

  const handleClearLocation = () => {
    clearManualLocation();
    setSelectedCity('');
  };

  // Status display
  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="w-5 h-5 text-info animate-spin" />;
    if (permissionDenied) return <XCircle className="w-5 h-5 text-destructive" />;
    if (error && !position) return <AlertTriangle className="w-5 h-5 text-warning" />;
    if (position) return <CheckCircle2 className="w-5 h-5 text-success" />;
    return <WifiOff className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (loading) return language === 'fr' ? 'Recherche GPS...' : 'Searching GPS...';
    if (permissionDenied) return language === 'fr' ? 'Permission GPS refusée' : 'GPS permission denied';
    if (error && !position) return error.message;
    if (position) {
      switch (positionSource) {
        case 'gps': return language === 'fr' ? 'GPS actif' : 'GPS active';
        case 'cache': return language === 'fr' ? 'Position en cache' : 'Cached position';
        case 'manual': return language === 'fr' ? 'Ville sélectionnée manuellement' : 'Manually selected city';
        default: return language === 'fr' ? 'Position disponible' : 'Position available';
      }
    }
    return language === 'fr' ? 'Aucune position' : 'No position';
  };

  const getSourceBadge = () => {
    const sources = {
      gps: { label: 'GPS', variant: 'default' as const, icon: Navigation },
      cache: { label: language === 'fr' ? 'Cache' : 'Cached', variant: 'secondary' as const, icon: Wifi },
      manual: { label: language === 'fr' ? 'Manuel' : 'Manual', variant: 'outline' as const, icon: MapPin },
      none: { label: language === 'fr' ? 'Aucun' : 'None', variant: 'destructive' as const, icon: WifiOff },
    };
    const source = sources[positionSource];
    const Icon = source.icon;
    
    return (
      <Badge variant={source.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {source.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* GPS Status Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Compass className="w-4 h-4 text-info" />
            {language === 'fr' ? 'État de la localisation' : 'Location Status'}
          </h4>
          {getSourceBadge()}
        </div>

        <div className="flex items-center gap-3 mb-3">
          {getStatusIcon()}
          <span className="text-sm text-foreground">{getStatusText()}</span>
        </div>

        {/* Position details */}
        {position && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-background/50 rounded-lg text-xs">
            <div>
              <span className="text-muted-foreground">{language === 'fr' ? 'Latitude' : 'Latitude'}</span>
              <p className="font-mono text-foreground">{position.latitude.toFixed(4)}°</p>
            </div>
            <div>
              <span className="text-muted-foreground">{language === 'fr' ? 'Longitude' : 'Longitude'}</span>
              <p className="font-mono text-foreground">{position.longitude.toFixed(4)}°</p>
            </div>
            {position.altitude && (
              <div className="flex items-center gap-1">
                <Mountain className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{language === 'fr' ? 'Altitude' : 'Altitude'}</span>
                <p className="font-mono text-foreground ml-auto">{Math.round(position.altitude)}m</p>
              </div>
            )}
            {position.accuracy && (
              <div>
                <span className="text-muted-foreground">{language === 'fr' ? 'Précision' : 'Accuracy'}</span>
                <p className="font-mono text-foreground">±{Math.round(position.accuracy)}m</p>
              </div>
            )}
          </div>
        )}

        {/* Location info */}
        {locationInfo && (
          <div className="mt-3 p-3 bg-background/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Globe2 className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{locationInfo.regionName}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{locationInfo.nearestCity}</Badge>
              <Badge variant="outline">{locationInfo.climateZone}</Badge>
              {locationInfo.distanceToCity > 0 && (
                <span className="text-muted-foreground">
                  ~{locationInfo.distanceToCity}km {language === 'fr' ? 'du centre' : 'from center'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GPS Toggle */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-success" />
            </div>
            <div>
              <span className="font-medium text-foreground">
                {language === 'fr' ? 'Utiliser le GPS' : 'Use GPS'}
              </span>
              <p className="text-xs text-muted-foreground">
                {language === 'fr' ? 'Position précise automatique' : 'Automatic precise location'}
              </p>
            </div>
          </div>
          <Switch
            checked={useGPS}
            onCheckedChange={handleGPSToggle}
            disabled={loading}
          />
        </div>

        {/* Retry GPS button when permission denied */}
        {permissionDenied && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {language === 'fr'
                ? '💡 Astuce : Cliquez sur 🔒 dans la barre d\'adresse → Localisation → Autoriser, puis rechargez.'
                : '💡 Tip: Click 🔒 in address bar → Location → Allow, then reload.'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetryGPS}
              disabled={isRetrying}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {language === 'fr' ? 'Réessayer la demande GPS' : 'Retry GPS request'}
            </Button>
          </div>
        )}
      </div>

      {/* Manual City Selection */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-foreground">
              {language === 'fr' ? 'Sélection manuelle' : 'Manual selection'}
            </span>
            <p className="text-xs text-muted-foreground">
              {language === 'fr' ? 'Choisir une ville camerounaise' : 'Choose a Cameroonian city'}
            </p>
          </div>
        </div>

        <Select 
          value={selectedCity} 
          onValueChange={handleCitySelect}
          disabled={useGPS && !permissionDenied}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={language === 'fr' ? 'Choisir une ville...' : 'Choose a city...'} />
          </SelectTrigger>
          <SelectContent>
            {MANUAL_LOCATIONS.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{loc.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{loc.altitude}m</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {positionSource === 'manual' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearLocation}
            className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Effacer la sélection manuelle' : 'Clear manual selection'}
          </Button>
        )}
      </div>

      {/* Info Card */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {language === 'fr'
            ? '📍 Votre position est utilisée pour fournir des conseils agricoles personnalisés selon votre zone climatique, les prix du marché local et les alertes régionales. Les données sont stockées localement sur votre appareil.'
            : '📍 Your location is used to provide personalized agricultural advice based on your climate zone, local market prices, and regional alerts. Data is stored locally on your device.'}
        </p>
      </div>
    </div>
  );
}
