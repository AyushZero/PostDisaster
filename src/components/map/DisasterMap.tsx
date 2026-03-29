'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents } from 'react-leaflet';
import type { Icon, DivIcon, LeafletMouseEvent } from 'leaflet';
import { InfrastructurePoint, AffectedArea, SeverityLevel } from '@/types';

const severityColors: Record<SeverityLevel, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

interface DisasterMapProps {
  center?: [number, number];
  zoom?: number;
  infrastructurePoints?: InfrastructurePoint[];
  affectedAreas?: AffectedArea[];
  userLocation?: [number, number];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  interactive?: boolean;
}

export function DisasterMap({
  center = [20.5937, 78.9629], // Center of India
  zoom = 5,
  infrastructurePoints = [],
  affectedAreas = [],
  userLocation,
  onMapClick,
  className = '',
  interactive = true,
}: DisasterMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [defaultIcon, setDefaultIcon] = useState<Icon | null>(null);
  const [infrastructureIcons, setInfrastructureIcons] = useState<Record<string, DivIcon>>({});

  useEffect(() => {
    // Import leaflet only on client side
    import('leaflet').then((L) => {
      // Import CSS
      import('leaflet/dist/leaflet.css');
      
      // Create default icon
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      
      L.Marker.prototype.options.icon = icon;
      setDefaultIcon(icon);

      // Create custom icons for infrastructure types
      const createCustomIcon = (color: string) =>
        L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        });

      setInfrastructureIcons({
        closed_road: createCustomIcon('#ef4444'),
        evacuation_zone: createCustomIcon('#f97316'),
        supply_center: createCustomIcon('#22c55e'),
        help_center: createCustomIcon('#3b82f6'),
        shelter: createCustomIcon('#8b5cf6'),
        hospital: createCustomIcon('#ec4899'),
        ngo: createCustomIcon('#14b8a6'),
      });

      setIsClient(true);
    });
  }, []);

  if (!isClient || !defaultIcon) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center ${className}`} style={{ minHeight: '400px' }}>
        <p className="text-slate-500">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`h-full w-full ${className}`}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render affected areas */}
      {affectedAreas.map((area) => {
        if (area.coordinates && area.coordinates.type === 'Polygon') {
          const positions = area.coordinates.coordinates[0].map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number]
          );
          return (
            <Polygon
              key={area.id}
              positions={positions}
              pathOptions={{
                color: severityColors[area.severity_level],
                fillColor: severityColors[area.severity_level],
                fillOpacity: 0.3,
              }}
            >
              <Popup>
                <div>
                  <strong>{area.name}</strong>
                  <p className="text-sm">Severity: {area.severity_level}</p>
                  {area.description && <p className="text-sm">{area.description}</p>}
                </div>
              </Popup>
            </Polygon>
          );
        }
        return null;
      })}

      {/* Render infrastructure points */}
      {infrastructurePoints.map((point) => (
        <Marker
          key={point.id}
          position={[point.latitude, point.longitude]}
          icon={infrastructureIcons[point.type] || defaultIcon}
        >
          <Popup>
            <div>
              <strong>{point.name}</strong>
              <p className="text-sm capitalize">{point.type.replace('_', ' ')}</p>
              {point.address && <p className="text-sm">{point.address}</p>}
              {point.contact_info && <p className="text-sm">Contact: {point.contact_info}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Render user location */}
      {userLocation && (
        <Circle
          center={userLocation}
          radius={1000}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
          }}
        >
          <Popup>Your Location</Popup>
        </Circle>
      )}

      {onMapClick && <MapClickHandler onClick={onMapClick} />}
    </MapContainer>
  );
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default DisasterMap;
