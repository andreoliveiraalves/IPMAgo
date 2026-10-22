import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { IpmaLocation } from '@/api/ipma/types';
import { type LatLng, nearestLocation } from '@/lib/geo';

export type LocationStatus =
  | 'idle'
  | 'locating'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'error';

export type NearestLocation = {
  location: IpmaLocation;
  distanceKm: number;
};

/**
 * Matches the device position to the closest IPMA forecast location.
 * Permission is only prompted on an explicit user action; on later launches the
 * position is used automatically when permission was already granted.
 */
export function useNearestLocation(locations: IpmaLocation[]) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [position, setPosition] = useState<LatLng | null>(null);

  const match = useMemo<NearestLocation | null>(() => {
    if (!position || locations.length === 0) {
      return null;
    }

    return nearestLocation(position, locations);
  }, [position, locations]);

  const locate = useCallback(async (prompt: boolean) => {
    setStatus('locating');

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus('unavailable');
        return;
      }

      const permission = prompt
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        setStatus('denied');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setPosition({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (active && permission.granted) {
        await locate(false);
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, [locate]);

  const requestPermission = useCallback(() => locate(true), [locate]);

  return { status, match, requestPermission };
}
