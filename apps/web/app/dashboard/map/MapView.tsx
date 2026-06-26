"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { useEffect } from "react";
import type { CourierWithLocation, TenantLocation } from "../../actions/couriers";

const storeIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2276/2276122.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

function getCourierIcon(vehicleType: string | null, isOffline: boolean) {
  const size: [number, number] = isOffline ? [24, 24] : [32, 32];
  const anchor: [number, number] = isOffline ? [12, 24] : [16, 32];
  const popupAnchor: [number, number] = isOffline ? [0, -24] : [0, -32];

  switch (vehicleType?.toLowerCase()) {
    case "bike":
    case "bicicleta":
      return new Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/2933/2933921.png",
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor,
      });
    case "car":
    case "carro":
      return new Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor,
      });
    case "moto":
    case "motorcycle":
    default:
      return new Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/3089/3089803.png",
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor,
      });
  }
}

const statusLabels: Record<string, string> = {
  available: "Disponível",
  offline: "Offline",
  busy: "Em entrega",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MapViewProps {
  couriers: CourierWithLocation[];
  tenantLocation: TenantLocation | null;
  focusTarget?: { type: "tenant" } | { type: "courier"; courierId: string } | null;
}

// Atualiza o centro do mapa quando os dados ou foco mudam
function MapCenterUpdater({
  center,
  zoom = 13,
  focusTarget,
}: {
  center: [number, number];
  zoom?: number;
  focusTarget?: MapViewProps["focusTarget"];
}) {
  const map = useMap();

  useEffect(() => {
    if (focusTarget?.type === "tenant") {
      map.setView(center, 16);
    } else if (focusTarget?.type === "courier") {
      map.setView(center, 16);
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, focusTarget, map]);

  return null;
}

function isLocationStale(lastLocationAt: string | null): boolean {
  if (!lastLocationAt) return true;
  const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos
  return Date.now() - new Date(lastLocationAt).getTime() > STALE_THRESHOLD_MS;
}

function getEffectiveStatus(courier: CourierWithLocation): string {
  if (courier.status === "offline") return "offline";
  if (isLocationStale(courier.lastLocationAt)) return "offline";
  return courier.status;
}

export default function MapView({ couriers, tenantLocation, focusTarget }: MapViewProps) {
  const onlineCouriers = couriers.filter(
    (c) => getEffectiveStatus(c) !== "offline" && c.lat && c.lng
  );

  const hasTenantLocation = tenantLocation?.lat && tenantLocation?.lng;

  let centerLat: number;
  let centerLng: number;
  let zoom = 13;

  if (focusTarget?.type === "tenant" && hasTenantLocation) {
    centerLat = tenantLocation!.lat!;
    centerLng = tenantLocation!.lng!;
    zoom = 16;
  } else if (focusTarget?.type === "courier") {
    const focusedCourier = onlineCouriers.find((c) => c.id === focusTarget.courierId);
    if (focusedCourier) {
      centerLat = focusedCourier.lat!;
      centerLng = focusedCourier.lng!;
      zoom = 16;
    } else {
      centerLat = hasTenantLocation ? tenantLocation!.lat! : -23.55;
      centerLng = hasTenantLocation ? tenantLocation!.lng! : -46.63;
    }
  } else {
    centerLat =
      onlineCouriers.length > 0
        ? onlineCouriers.reduce((sum, c) => sum + (c.lat ?? 0), 0) / onlineCouriers.length
        : hasTenantLocation
          ? tenantLocation!.lat!
          : -23.55;
    centerLng =
      onlineCouriers.length > 0
        ? onlineCouriers.reduce((sum, c) => sum + (c.lng ?? 0), 0) / onlineCouriers.length
        : hasTenantLocation
          ? tenantLocation!.lng!
          : -46.63;
  }

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={zoom}
      className="h-full w-full"
    >
      <MapCenterUpdater center={[centerLat, centerLng]} zoom={zoom} focusTarget={focusTarget} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Marcador do estabelecimento */}
      {hasTenantLocation && (
        <Marker
          position={[tenantLocation!.lat!, tenantLocation!.lng!]}
          icon={storeIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Seu estabelecimento</p>
              {tenantLocation?.address && (
                <p className="text-gray-600">{tenantLocation.address}</p>
              )}
            </div>
          </Popup>
        </Marker>
      )}
      {onlineCouriers.map((courier) => (
        <Marker
          key={courier.id}
          position={[courier.lat!, courier.lng!]}
          icon={getCourierIcon(courier.vehicleType, getEffectiveStatus(courier) === "offline")}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{courier.fullName || courier.phone || courier.vehiclePlate || "Entregador"}</p>
              <p className="text-gray-600">
                {statusLabels[getEffectiveStatus(courier)] || getEffectiveStatus(courier)}
              </p>
              {courier.vehicleType && (
                <p className="text-gray-500">{courier.vehicleType}</p>
              )}
              {courier.vehiclePlate && (
                <p className="text-gray-500 text-xs">Placa: {courier.vehiclePlate}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Atualizado: {formatDate(courier.lastLocationAt)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${courier.lat},${courier.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-blue-600 hover:underline"
              >
                Abrir no Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
