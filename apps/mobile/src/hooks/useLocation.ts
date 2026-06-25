import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Intervalo adaptativo de GPS.
 * Economiza bateria/dados quando parado; precisão máxima durante entrega.
 */
interface TrackingConfig {
  timeInterval: number;    // ms
  distanceInterval: number; // metros
}

function getTrackingConfig(isDelivering: boolean): TrackingConfig {
  if (isDelivering) {
    // Entrega ativa: alta precisão, baixa latência
    return { timeInterval: 5000, distanceInterval: 20 };
  }
  // Disponível/parado: economia de bateria
  return { timeInterval: 30000, distanceInterval: 100 };
}

export function useLocation(courierId: string | null) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPublishRef = useRef<number>(0);

  const publishLocation = useCallback(
    async (coords: Coordinates, cid: string) => {
      // Throttle: evita flood se GPS disparar muito rápido
      const now = Date.now();
      if (now - lastPublishRef.current < 3000) return;
      lastPublishRef.current = now;

      // Atualiza localizacao atual do courier
      const { error: locError } = await supabase
        .from("couriers")
        .update({
          current_location_lat: coords.latitude,
          current_location_lng: coords.longitude,
          last_location_at: new Date().toISOString(),
        })
        .eq("id", cid);
      if (locError) {
        console.error("[GPS] Erro ao atualizar localizacao:", locError.message);
      }

      // Salva no historico de localizacoes
      const { error: histError } = await supabase.from("courier_locations").insert({
        courier_id: cid,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        recorded_at: new Date().toISOString(),
      });
      if (histError) {
        console.error("[GPS] Erro ao salvar historico:", histError.message);
      }
    },
    [],
  );

  const startTracking = useCallback(async () => {
    if (!courierId) return;

    const { data: sessionData } = await supabase.auth.getSession();
    console.warn("[GPS] Sessao:", sessionData.session ? "ativa" : "inativa", "userId:", sessionData.session?.user?.id);

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      setError("Permissão de localização em primeiro plano negada");
      Alert.alert("GPS", "Permissão de localização negada");
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      // Continua sem background, apenas foreground
    }

    setTracking(true);

    // Detecta automaticamente se courier tem pedido ativo para definir intervalo
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("id, status")
      .eq("courier_id", courierId)
      .in("status", ["accepted", "collected", "in_transit"]);

    const isDelivering = (activeOrders?.length ?? 0) > 0;
    const config = getTrackingConfig(isDelivering);

    // Atualiza status do courier para refletir que está online
    const { data: courier } = await supabase
      .from("couriers")
      .select("status")
      .eq("id", courierId)
      .single();

    if (courier?.status === "offline") {
      const { error: onlineError } = await supabase
        .from("couriers")
        .update({ status: "available" })
        .eq("id", courierId);
      if (onlineError) {
        console.error("[GPS] Erro ao setar disponivel:", onlineError.message);
      }
    }

    Alert.alert(
      "GPS",
      `Localização ativa. Intervalo: ${config.timeInterval / 1000}s · ${config.distanceInterval}m`,
    );

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: config.timeInterval,
        distanceInterval: config.distanceInterval,
      },
      async (loc) => {
        const coords: Coordinates = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        };
        setLocation(coords);
        await publishLocation(coords, courierId);
      },
    );
  }, [courierId, publishLocation]);

  const stopTracking = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setTracking(false);

    if (courierId) {
      const { error: offlineError } = await supabase
        .from("couriers")
        .update({ status: "offline" })
        .eq("id", courierId);
      if (offlineError) {
        console.error("[GPS] Erro ao setar offline:", offlineError.message);
      }
    }
  }, [courierId]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return { location, error, tracking, startTracking, stopTracking };
}
