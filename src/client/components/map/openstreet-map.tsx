"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OpenStreetMapProps {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  height?: string;
  interactive?: boolean;
}

const markerIcon = L.divIcon({
  className: "gocofa-map-marker",
  html: '<span class="gocofa-map-marker__pulse"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapPosition({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], 15, { animate: true });
  }, [latitude, longitude, map]);

  return null;
}

export function OpenStreetMap({
  latitude,
  longitude,
  accuracy,
  height = "260px",
  interactive = true,
}: OpenStreetMapProps) {
  const hasPosition = typeof latitude === "number" && typeof longitude === "number";
  const center: [number, number] = hasPosition ? [latitude, longitude] : [8.4657, -13.2317];

  return (
    <div className="gocofa-map" style={{ height }}>
      <MapContainer
        center={center}
        zoom={hasPosition ? 15 : 7}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasPosition && (
          <>
            <MapPosition latitude={latitude} longitude={longitude} />
            <Marker position={[latitude, longitude]} icon={markerIcon} />
            {typeof accuracy === "number" && (
              <Circle
                center={[latitude, longitude]}
                radius={accuracy}
                pathOptions={{ color: "#0b6b35", fillColor: "#a6c90f", fillOpacity: 0.14, weight: 1 }}
              />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}
