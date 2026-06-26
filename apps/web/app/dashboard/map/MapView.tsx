"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { useEffect } from "react";
import type { CourierWithLocation, TenantLocation } from "../../actions/couriers";

const courierIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3089/3089803.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const offlineIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3089/3089803.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const storeIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2276/2276122.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

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
}

// Atualiza o centro do mapa quando os dados mudam (react-leaflet nao reage a prop center apos mount)
function MapCenterUpdater({
  center,
  zoom = 13,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapView({ couriers, tenantLocation }: MapViewProps) {
  const onlineCouriers = couriers.filter(
    (c) => c.status !== "offline" && c.lat && c.lng
  );

  const hasTenantLocation = tenantLocation?.lat && tenantLocation?.lng;

  const centerLat =
    onlineCouriers.length > 0
      ? onlineCouriers.reduce((sum, c) => sum + (c.lat ?? 0), 0) / onlineCouriers.length
      : hasTenantLocation
        ? tenantLocation!.lat!
        : -23.55;
  const centerLng =
    onlineCouriers.length > 0
      ? onlineCouriers.reduce((sum, c) => sum + (c.lng ?? 0), 0) / onlineCouriers.length
      : hasTenantLocation
        ? tenantLocation!.lng!
        : -46.63;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      className="h-full w-full"
    >
      <MapCenterUpdater center={[centerLat, centerLng]} />
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
          icon={courier.status === "offline" ? offlineIcon : courierIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{courier.fullName || courier.phone || courier.vehiclePlate || "Motoboy"}</p>
              <p className="text-gray-600">
                {statusLabels[courier.status] || courier.status}
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
