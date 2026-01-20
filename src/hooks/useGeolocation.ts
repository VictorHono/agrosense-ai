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

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  isWatching: boolean;
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

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { enableHighAccuracy, timeout, maximumAge, watchPosition } = {
    ...defaultOptions,
    ...options,
  };

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
    isWatching: false,
  });

  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: globalThis.GeolocationPosition) => {
    const { coords, timestamp } = pos;
    
    setState({
      position: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        accuracy: coords.accuracy,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
        speed: coords.speed,
        timestamp,
      },
      error: null,
      loading: false,
      isWatching: watchPosition ?? true,
    });

    // Store in localStorage for offline use
    localStorage.setItem('agrocamer-last-position', JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
      timestamp,
    }));
  }, [watchPosition]);

  const handleError = useCallback((error: globalThis.GeolocationPositionError) => {
    let message = '';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'La permission de géolocalisation a été refusée';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Position non disponible';
        break;
      case error.TIMEOUT:
        message = 'Délai de géolocalisation dépassé';
        break;
      default:
        message = 'Erreur de géolocalisation inconnue';
    }

    // Try to use cached position
    const cached = localStorage.getItem('agrocamer-last-position');
    if (cached) {
      const cachedPos = JSON.parse(cached);
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
      });
    } else {
      setState({
        position: null,
        error: { code: error.code, message },
        loading: false,
        isWatching: false,
      });
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Géolocalisation non supportée' },
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Géolocalisation non supportée' },
        loading: false,
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setState(prev => ({ ...prev, loading: true }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState(prev => ({ ...prev, isWatching: false }));
    }
  }, []);

  useEffect(() => {
    // Try to load cached position first for faster initial render
    const cached = localStorage.getItem('agrocamer-last-position');
    if (cached) {
      const cachedPos = JSON.parse(cached);
      setState(prev => ({
        ...prev,
        position: {
          ...cachedPos,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
      }));
    }

    if (watchPosition) {
      startWatching();
    } else {
      getCurrentPosition();
    }

    return () => {
      stopWatching();
    };
  }, [watchPosition, startWatching, getCurrentPosition, stopWatching]);

  return {
    ...state,
    refresh: getCurrentPosition,
    startWatching,
    stopWatching,
  };
}

// Utility function to calculate distance between two points in km
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

// Determine Cameroon region from coordinates
export function getCameroonRegionFromCoords(lat: number, lon: number): {
  region: string;
  regionName: string;
  nearestCity: string;
} {
  const regions = [
    { id: 'extreme-nord', name: 'Extrême-Nord', city: 'Maroua', lat: 10.5917, lon: 14.3167 },
    { id: 'nord', name: 'Nord', city: 'Garoua', lat: 9.3000, lon: 13.3833 },
    { id: 'adamaoua', name: 'Adamaoua', city: 'Ngaoundéré', lat: 7.3167, lon: 13.5833 },
    { id: 'centre', name: 'Centre', city: 'Yaoundé', lat: 3.8667, lon: 11.5167 },
    { id: 'est', name: 'Est', city: 'Bertoua', lat: 4.0333, lon: 14.0333 },
    { id: 'littoral', name: 'Littoral', city: 'Douala', lat: 4.0503, lon: 9.7000 },
    { id: 'nord-ouest', name: 'Nord-Ouest', city: 'Bamenda', lat: 5.9500, lon: 10.1500 },
    { id: 'ouest', name: 'Ouest', city: 'Bafoussam', lat: 5.4833, lon: 10.4167 },
    { id: 'sud', name: 'Sud', city: 'Ebolowa', lat: 2.9333, lon: 11.1500 },
    { id: 'sud-ouest', name: 'Sud-Ouest', city: 'Buéa', lat: 4.1500, lon: 9.2333 },
  ];

  let nearestRegion = regions[0];
  let minDistance = Infinity;

  for (const region of regions) {
    const distance = calculateDistance(lat, lon, region.lat, region.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestRegion = region;
    }
  }

  return {
    region: nearestRegion.id,
    regionName: nearestRegion.name,
    nearestCity: nearestRegion.city,
  };
}

// Get climate zone based on altitude and latitude
export function getClimateZone(lat: number, altitude: number | null): {
  zone: string;
  characteristics: string[];
} {
  const alt = altitude ?? 0;
  
  // Northern Cameroon (Sahel / Sudan)
  if (lat > 8) {
    return {
      zone: 'Soudano-sahélienne',
      characteristics: [
        'Saison sèche longue (7-8 mois)',
        'Températures élevées (30-40°C)',
        'Pluviométrie: 400-900mm/an',
        'Sols sablonneux à argileux',
      ],
    };
  }
  
  // Adamaoua plateau
  if (lat > 6 && alt > 800) {
    return {
      zone: 'Altitude tropicale',
      characteristics: [
        'Climat tempéré d\'altitude',
        'Températures modérées (18-28°C)',
        'Pluviométrie: 1500-2000mm/an',
        'Propice à l\'élevage et cultures tempérées',
      ],
    };
  }
  
  // Western highlands
  if (alt > 1000) {
    return {
      zone: 'Hautes terres de l\'Ouest',
      characteristics: [
        'Climat frais et humide',
        'Températures: 15-25°C',
        'Pluviométrie: 1500-3000mm/an',
        'Idéal pour café arabica, thé, légumes',
      ],
    };
  }
  
  // Coastal / humid forest zone (using lat only since lon is not in scope)
  if (lat < 5 && alt < 500) {
    return {
      zone: 'Forestière équatoriale',
      characteristics: [
        'Forêt tropicale humide',
        'Pluviométrie élevée: 2000-4000mm/an',
        'Humidité constante >80%',
        'Propice au cacao, palmier à huile, hévéa',
      ],
    };
  }
  
  // Default forest zone
  return {
    zone: 'Forestière guinéenne',
    characteristics: [
      'Deux saisons de pluies',
      'Températures: 24-28°C',
      'Pluviométrie: 1500-2000mm/an',
      'Cultures vivrières variées',
    ],
  };
}
