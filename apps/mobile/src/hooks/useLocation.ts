import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { supabase } from "../lib/supabase";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

const LOCATION_TASK_NAME = "background-location-task";

// Throttle global para background task (shared entre foreground e background)
let lastBackgroundPublish = 0;

/**
 * TaskManager que roda em background (e foreground) publicando localização no Supabase.
 * Funciona mesmo quando o app está minimizado (APK/IPA).
 */
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[GPS Background] Erro:", error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const loc = locations[0];
  if (!loc) return;

  // Throttle: evita flood
  const now = Date.now();
  if (now - lastBackgroundPublish < 3000) return;
  lastBackgroundPublish = now;

  // Recupera sessão do courier
  const { data: sessionData } = await supabase.auth.getSession();
  const courierId = sessionData.session?.user?.id;
  if (!courierId) {
    console.warn("[GPS Background] Sem sessao ativa");
    return;
  }

  const coords = {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy,
  };

  // Atualiza localizacao atual do courier
  const { error: locError } = await supabase
    .from("couriers")
    .update({
      current_location_lat: coords.latitude,
      current_location_lng: coords.longitude,
      last_location_at: new Date().toISOString(),
    })
    .eq("id", courierId);
  if (locError) {
    console.error("[GPS Background] Erro ao atualizar localizacao:", locError.message);
  }

  // Salva no historico de localizacoes
  const { error: histError } = await supabase.from("courier_locations").insert({
    courier_id: courierId,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    recorded_at: new Date().toISOString(),
  });
  if (histError) {
    console.error("[GPS Background] Erro ao salvar historico:", histError.message);
  }
});

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
      console.warn("[GPS] Background permission negada — tracking apenas em foreground");
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

    // 1) Foreground: watchPositionAsync atualiza UI em tempo real
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

    // 2) Background: startLocationUpdatesAsync publica no Supabase mesmo com app minimizado
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: config.timeInterval,
        distanceInterval: config.distanceInterval,
        foregroundService: {
          notificationTitle: "GoDelivery GPS ativo",
          notificationBody: "Rastreando sua localização para entregas",
          notificationColor: "#2563EB",
        },
        showsBackgroundLocationIndicator: true,
      });
      console.warn("[GPS] Background location updates iniciado");
    }
  }, [courierId, publishLocation]);

  const stopTracking = useCallback(async () => {
    // Para foreground
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    // Para background
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskDefined) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.warn("[GPS] Background location updates parado");
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

  // Restaura estado de tracking ao montar (navegacao interna)
  useEffect(() => {
    let isMounted = true;

    async function restoreTracking() {
      if (!courierId) return;
      const { data: courier } = await supabase
        .from("couriers")
        .select("status, last_location_at")
        .eq("id", courierId)
        .single();

      if (!isMounted) return;

      // Se courier estava online recentemente (< 10min), assume que tracking deveria estar ativo
      const wasRecentlyActive =
        courier?.status !== "offline" &&
        courier?.last_location_at &&
        Date.now() - new Date(courier.last_location_at).getTime() < 10 * 60 * 1000;

      const isBgTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

      if (wasRecentlyActive && !subscriptionRef.current && !isBgTaskRunning) {
        console.warn("[GPS] Restaurando tracking apos remontagem");
        await startTracking();
      }
    }

    restoreTracking();

    return () => {
      isMounted = false;
      // Ao desmontar o Dashboard (ex: ir para Perfil), paramos o tracking
      if (subscriptionRef.current) {
        console.warn("[GPS] Dashboard desmontado — parando tracking");
        stopTracking();
      }
    };
  }, [courierId, startTracking, stopTracking]);

  return { location, error, tracking, startTracking, stopTracking };
}
