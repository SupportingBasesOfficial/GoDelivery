"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import type { CourierWithLocation } from "../../actions/couriers";

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
}

export default function MapView({ couriers }: MapViewProps) {
  const onlineCouriers = couriers.filter(
    (c) => c.status !== "offline" && c.lat && c.lng
  );

  const centerLat =
    onlineCouriers.length > 0
      ? onlineCouriers.reduce((sum, c) => sum + (c.lat ?? 0), 0) / onlineCouriers.length
      : -23.55;
  const centerLng =
    onlineCouriers.length > 0
      ? onlineCouriers.reduce((sum, c) => sum + (c.lng ?? 0), 0) / onlineCouriers.length
      : -46.63;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onlineCouriers.map((courier) => (
        <Marker
          key={courier.id}
          position={[courier.lat!, courier.lng!]}
          icon={courier.status === "offline" ? offlineIcon : courierIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{courier.fullName || courier.email}</p>
              <p className="text-gray-600">
                {statusLabels[courier.status] || courier.status}
              </p>
              {courier.vehicleType && (
                <p className="text-gray-500">{courier.vehicleType}</p>
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
