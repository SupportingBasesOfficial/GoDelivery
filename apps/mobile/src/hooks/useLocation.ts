import { useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function useLocation(courierId: string | null) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const startTracking = useCallback(async () => {
    if (!courierId) return;

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      setError("Permissão de localização em primeiro plano negada");
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      // Continua sem background, apenas foreground
    }

    setTracking(true);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // 10 segundos
        distanceInterval: 50, // 50 metros
      },
      async (loc) => {
        const coords: Coordinates = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        };
        setLocation(coords);

        // Envia para o Supabase
        await supabase.from("courier_locations").insert({
          courier_id: courierId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      },
    );
  }, [courierId]);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return { location, error, tracking, startTracking, stopTracking };
}
