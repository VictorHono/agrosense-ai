import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type PositionSource = 'gps' | 'cache' | 'manual' | 'none';

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  isWatching: boolean;
  source: PositionSource;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 30000,
  watchPosition: true,
};

const CACHE_KEY = 'agrocamer-last-position';
const MANUAL_KEY = 'agrocamer-manual-location';

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { enableHighAccuracy, timeout, maximumAge, watchPosition } = {
    ...defaultOptions,
    ...options,
  };

  const [state, setState] = useState<GeolocationState>(() => {
    // 1) Manual location override (works even if GPS is blocked / unsupported)
    const manual = localStorage.getItem(MANUAL_KEY);
    if (manual) {
      try {
        const manualPos = JSON.parse(manual);
        return {
          position: {
            ...manualPos,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          error: null,
          loading: false,
          isWatching: false,
          source: 'manual',
        };
      } catch {
        // Invalid manual cache, ignore
      }
    }

    // 2) Cached GPS position (last known)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const cachedPos = JSON.parse(cached);
        return {
          position: {
            ...cachedPos,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          error: null,
          loading: true, // Still loading to get fresh position
          isWatching: false,
          source: 'cache',
        };
      } catch {
        // Invalid cache, ignore
      }
    }

    return {
      position: null,
      error: null,
      loading: true,
      isWatching: false,
      source: 'none',
    };
  });

  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const handleSuccess = useCallback((pos: globalThis.GeolocationPosition) => {
    if (!mountedRef.current) return;
    
    const { coords, timestamp } = pos;
    
    console.log('[Geolocation] Position obtained:', {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
    });
    
    const newPosition: GeolocationPosition = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp,
    };

    setState({
      position: newPosition,
      error: null,
      loading: false,
      isWatching: watchPosition ?? true,
      source: 'gps',
    });

    // Store in localStorage for offline use
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        accuracy: coords.accuracy,
        timestamp,
      }));
    } catch (e) {
      console.warn('[Geolocation] Failed to cache position:', e);
    }
  }, [watchPosition]);

  const handleError = useCallback((error: globalThis.GeolocationPositionError) => {
    if (!mountedRef.current) return;

    let message = '';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'La permission de géolocalisation a été refusée. Veuillez autoriser l\'accès à votre position dans les paramètres de votre navigateur.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Position non disponible. Vérifiez que le GPS est activé.';
        break;
      case error.TIMEOUT:
        message = 'Délai de géolocalisation dépassé. Réessayez.';
        break;
      default:
        message = 'Erreur de géolocalisation inconnue';
    }

    console.error('[Geolocation] Error:', error.code, message);

    // Try to use cached position as fallback
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const cachedPos = JSON.parse(cached);
        console.log('[Geolocation] Using cached position as fallback');
        setState({
          position: {
            ...cachedPos,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          error: { code: error.code, message: `${message} (position en cache utilisée)` },
          loading: false,
          isWatching: false,
          source: 'cache',
        });
        return;
      } catch {
        // Invalid cache
      }
    }

    setState({
      position: null,
      error: { code: error.code, message },
      loading: false,
      isWatching: false,
      source: 'none',
    });
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('[Geolocation] Not supported');
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Géolocalisation non supportée par votre navigateur' },
        loading: false,
        isWatching: false,
        source: prev.source ?? 'none',
      }));
      return;
    }

    console.log('[Geolocation] Requesting current position...');
    // Keep any existing position (cache/manual) while we try to refresh
    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('[Geolocation] Not supported');
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Géolocalisation non supportée par votre navigateur' },
        loading: false,
        isWatching: false,
      }));
      return;
    }

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    console.log('[Geolocation] Starting position watch...');
    // Keep any existing position (cache/manual) while we try to refresh
    setState(prev => ({ ...prev, loading: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[Geolocation] Stopping watch');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState(prev => ({ ...prev, isWatching: false }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // If user set a manual location, we don't spam GPS requests (important for browsers where
    // the permission was blocked and Retry would never prompt again).
    const manual = localStorage.getItem(MANUAL_KEY);
    if (manual) {
      console.log('[Geolocation] Manual location present, skipping GPS init');
      setState(prev => ({ ...prev, loading: false, isWatching: false, source: 'manual' }));
      return () => {
        mountedRef.current = false;
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    }

    // Start watching or get current position
    if (watchPosition) {
      startWatching();
    } else {
      getCurrentPosition();
    }

    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setManualLocation = useCallback((manual: Pick<GeolocationPosition, 'latitude' | 'longitude'> & { altitude?: number | null }) => {
    // Stop any watch
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const now = Date.now();
    const manualPosition: GeolocationPosition = {
      latitude: manual.latitude,
      longitude: manual.longitude,
      altitude: manual.altitude ?? null,
      accuracy: 5000,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: now,
    };

    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(manualPosition));
    } catch (e) {
      console.warn('[Geolocation] Failed to cache manual location:', e);
    }

    setState({
      position: manualPosition,
      error: null,
      loading: false,
      isWatching: false,
      source: 'manual',
    });
  }, []);

  const clearManualLocation = useCallback(() => {
    try {
      localStorage.removeItem(MANUAL_KEY);
    } catch {
      // ignore
    }

    // After clearing manual mode, try GPS again
    if (watchPosition) startWatching();
    else getCurrentPosition();
  }, [watchPosition, startWatching, getCurrentPosition]);

  return {
    ...state,
    refresh: getCurrentPosition,
    startWatching,
    stopWatching,
    setManualLocation,
    clearManualLocation,
  };
}

// Utility function to calculate distance between two points in km (Haversine formula)
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Cameroon regions with their approximate center coordinates
const CAMEROON_REGIONS = [
  { id: 'extreme-nord', name: 'Extrême-Nord', city: 'Maroua', lat: 10.5917, lon: 14.3167 },
  { id: 'nord', name: 'Nord', city: 'Garoua', lat: 9.3000, lon: 13.3833 },
  { id: 'adamaoua', name: 'Adamaoua', city: 'Ngaoundéré', lat: 7.3167, lon: 13.5833 },
  { id: 'centre', name: 'Centre', city: 'Yaoundé', lat: 3.8667, lon: 11.5167 },
  { id: 'est', name: 'Est', city: 'Bertoua', lat: 4.5833, lon: 13.6833 },
  { id: 'littoral', name: 'Littoral', city: 'Douala', lat: 4.0503, lon: 9.7000 },
  { id: 'nord-ouest', name: 'Nord-Ouest', city: 'Bamenda', lat: 5.9500, lon: 10.1500 },
  { id: 'ouest', name: 'Ouest', city: 'Bafoussam', lat: 5.4833, lon: 10.4167 },
  { id: 'sud', name: 'Sud', city: 'Ebolowa', lat: 2.9333, lon: 11.1500 },
  { id: 'sud-ouest', name: 'Sud-Ouest', city: 'Buéa', lat: 4.1500, lon: 9.2333 },
];

// Determine Cameroon region from GPS coordinates
export function getCameroonRegionFromCoords(lat: number, lon: number): {
  region: string;
  regionName: string;
  nearestCity: string;
  distanceToCity: number;
} {
  let nearestRegion = CAMEROON_REGIONS[0];
  let minDistance = Infinity;

  for (const region of CAMEROON_REGIONS) {
    const distance = calculateDistance(lat, lon, region.lat, region.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestRegion = region;
    }
  }

  console.log('[Geolocation] Detected region:', nearestRegion.name, 'at', Math.round(minDistance), 'km from', nearestRegion.city);

  return {
    region: nearestRegion.id,
    regionName: nearestRegion.name,
    nearestCity: nearestRegion.city,
    distanceToCity: Math.round(minDistance),
  };
}

// Get climate zone based on latitude, longitude, and altitude
export function getClimateZone(lat: number, lon: number, altitude: number | null): {
  zone: string;
  characteristics: string[];
} {
  const alt = altitude ?? 0;
  
  // Northern Cameroon - Sahel / Sudan zone (lat > 8°)
  if (lat > 8) {
    if (lat > 10) {
      return {
        zone: 'Sahélienne',
        characteristics: [
          'Saison sèche très longue (8-9 mois)',
          'Températures: 25-45°C',
          'Pluviométrie: 300-600mm/an',
          'Cultures: sorgho, mil, arachide, niébé',
        ],
      };
    }
    return {
      zone: 'Soudano-sahélienne',
      characteristics: [
        'Saison sèche longue (7-8 mois)',
        'Températures: 25-40°C',
        'Pluviométrie: 600-1000mm/an',
        'Cultures: coton, maïs, sorgho, arachide',
      ],
    };
  }
  
  // Adamaoua plateau (lat 6-8°, alt > 800m)
  if (lat > 6 && alt > 800) {
    return {
      zone: 'Altitude tropicale (Adamaoua)',
      characteristics: [
        'Climat tempéré d\'altitude',
        'Températures: 18-28°C',
        'Pluviométrie: 1400-1800mm/an',
        'Élevage bovin, maïs, patate douce',
      ],
    };
  }
  
  // Western highlands (alt > 1000m)
  if (alt > 1000) {
    return {
      zone: 'Hautes terres de l\'Ouest',
      characteristics: [
        'Climat frais et humide',
        'Températures: 15-25°C',
        'Pluviométrie: 1800-3000mm/an',
        'Café arabica, thé, légumes, maraîchage',
      ],
    };
  }
  
  // Coastal zone (lon < 10° and lat < 5°)
  if (lon < 10 && lat < 5) {
    return {
      zone: 'Côtière équatoriale',
      characteristics: [
        'Climat très humide toute l\'année',
        'Températures: 24-32°C',
        'Pluviométrie: 3000-5000mm/an',
        'Palmier à huile, hévéa, banane plantain',
      ],
    };
  }
  
  // Forest zone (lat < 5°)
  if (lat < 5) {
    return {
      zone: 'Forestière équatoriale',
      characteristics: [
        'Forêt tropicale humide',
        'Températures: 23-30°C',
        'Pluviométrie: 1500-2500mm/an',
        'Cacao, manioc, macabo, plantain',
      ],
    };
  }
  
  // Default - Guinea savanna
  return {
    zone: 'Soudano-guinéenne',
    characteristics: [
      'Deux saisons (sèche et pluies)',
      'Températures: 22-32°C',
      'Pluviométrie: 1200-1600mm/an',
      'Maïs, manioc, igname, légumineuses',
    ],
  };
}
