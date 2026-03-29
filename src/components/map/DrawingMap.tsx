'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent, Icon } from 'leaflet';
import { Button } from '@/components/ui';
import { SeverityLevel } from '@/types';

interface DrawingMapProps {
  onAreaComplete?: (coordinates: [number, number][]) => void;
  onPointSelect?: (lat: number, lng: number) => void;
  existingAreas?: { coordinates: [number, number][]; severity: SeverityLevel }[];
  mode: 'polygon' | 'point';
  className?: string;
}

const severityColors: Record<SeverityLevel, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export function DrawingMap({
  onAreaComplete,
  onPointSelect,
  existingAreas = [],
  mode,
  className = '',
}: DrawingMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [defaultIcon, setDefaultIcon] = useState<Icon | null>(null);

  useEffect(() => {
    // Import leaflet only on client side
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');
      
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
      setIsClient(true);
    });
  }, []);

  const handleMapClick = useCallback(
    (e: LeafletMouseEvent) => {
      const point: [number, number] = [e.latlng.lat, e.latlng.lng];

      if (mode === 'polygon') {
        setDrawingPoints((prev) => [...prev, point]);
      } else if (mode === 'point' && onPointSelect) {
        setSelectedPoint(point);
        onPointSelect(point[0], point[1]);
      }
    },
    [mode, onPointSelect]
  );

  const handleComplete = useCallback(() => {
    if (drawingPoints.length >= 3 && onAreaComplete) {
      onAreaComplete(drawingPoints);
      setDrawingPoints([]);
    }
  }, [drawingPoints, onAreaComplete]);

  const handleClear = useCallback(() => {
    setDrawingPoints([]);
    setSelectedPoint(null);
  }, []);

  if (!isClient || !defaultIcon) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center ${className}`} style={{ minHeight: '400px' }}>
        <p className="text-slate-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        className={`h-[400px] w-full rounded-lg ${className}`}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Existing areas */}
        {existingAreas.map((area, index) => (
          <Polygon
            key={index}
            positions={area.coordinates}
            pathOptions={{
              color: severityColors[area.severity],
              fillColor: severityColors[area.severity],
              fillOpacity: 0.3,
            }}
          />
        ))}

        {/* Drawing points for polygon */}
        {mode === 'polygon' && drawingPoints.map((point, index) => (
          <Marker key={index} position={point} icon={defaultIcon} />
        ))}

        {/* Current polygon being drawn */}
        {mode === 'polygon' && drawingPoints.length >= 2 && (
          <Polygon
            positions={drawingPoints}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              dashArray: '5, 5',
            }}
          />
        )}

        {/* Selected point marker */}
        {mode === 'point' && selectedPoint && (
          <Marker position={selectedPoint} icon={defaultIcon} />
        )}

        <MapClickEvents onClick={handleMapClick} />
      </MapContainer>

      {/* Controls */}
      {mode === 'polygon' && (
        <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={drawingPoints.length < 3}
          >
            Complete Area ({drawingPoints.length} points)
          </Button>
          <Button size="sm" variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}

      {mode === 'polygon' && (
        <div className="absolute top-4 left-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow text-sm">
          Click on map to add points. Minimum 3 points required.
        </div>
      )}
    </div>
  );
}

function MapClickEvents({ onClick }: { onClick: (e: LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onClick,
  });
  return null;
}

export default DrawingMap;
