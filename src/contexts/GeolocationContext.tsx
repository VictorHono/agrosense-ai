import React, { createContext, useContext, useMemo } from 'react';
import { 
  useGeolocation, 
  GeolocationPosition, 
  GeolocationError,
  getCameroonRegionFromCoords,
  getClimateZone,
} from '@/hooks/useGeolocation';

interface LocationInfo {
  region: string;
  regionName: string;
  nearestCity: string;
  climateZone: string;
  climateCharacteristics: string[];
  altitude: number | null;
  accuracy: number;
  isHighAccuracy: boolean;
}

interface GeolocationContextType {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  isWatching: boolean;
  locationInfo: LocationInfo | null;
  refresh: () => void;
  startWatching: () => void;
  stopWatching: () => void;
  hasPermission: boolean;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const geo = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000, // Cache position for 1 minute
    watchPosition: true,
  });

  const locationInfo = useMemo<LocationInfo | null>(() => {
    if (!geo.position) return null;

    const { latitude, longitude, altitude, accuracy } = geo.position;
    const regionData = getCameroonRegionFromCoords(latitude, longitude);
    const climateData = getClimateZone(latitude, altitude);

    return {
      region: regionData.region,
      regionName: regionData.regionName,
      nearestCity: regionData.nearestCity,
      climateZone: climateData.zone,
      climateCharacteristics: climateData.characteristics,
      altitude,
      accuracy,
      isHighAccuracy: accuracy < 100, // Less than 100m is considered high accuracy
    };
  }, [geo.position]);

  const hasPermission = !geo.error || geo.error.code !== 1; // 1 = PERMISSION_DENIED

  const value: GeolocationContextType = {
    position: geo.position,
    error: geo.error,
    loading: geo.loading,
    isWatching: geo.isWatching,
    locationInfo,
    refresh: geo.refresh,
    startWatching: geo.startWatching,
    stopWatching: geo.stopWatching,
    hasPermission,
  };

  return (
    <GeolocationContext.Provider value={value}>
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocationContext() {
  const context = useContext(GeolocationContext);
  if (!context) {
    throw new Error('useGeolocationContext must be used within a GeolocationProvider');
  }
  return context;
}
