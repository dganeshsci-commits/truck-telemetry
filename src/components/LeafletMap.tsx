import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vehicle, AreaGeofence, RouteGeofence } from '../types';

interface LeafletMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  areaGeofences?: AreaGeofence[];
  routeGeofences?: RouteGeofence[];
  showGeofences?: boolean;
  centerCoordinates?: { lat: number; lng: number };
  zoomLevel?: number;
  height?: string;
  isDrawingArea?: boolean;
  drawingPoints?: Array<{ lat: number; lng: number }>;
  onMapClickForDrawing?: (point: { lat: number; lng: number }) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  areaGeofences = [],
  routeGeofences = [],
  showGeofences = true,
  centerCoordinates,
  zoomLevel = 11,
  height = '100%',
  isDrawingArea = false,
  drawingPoints = [],
  onMapClickForDrawing
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const drawingLayerRef = useRef<L.LayerGroup | null>(null);
  const markersByVehicleIdRef = useRef<Map<string, { marker: L.Marker; key: string }>>(new Map());
  const prevSelectedVehIdRef = useRef<string | null>(null);

  // Status colors & styles
  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'Moving':
        return {
          bg: '#10b981', // emerald-500
          border: '#059669',
          textColor: '#ffffff',
          pulse: true,
          label: 'Moving'
        };
      case 'Idling':
        return {
          bg: '#f59e0b', // amber-500
          border: '#d97706',
          textColor: '#ffffff',
          pulse: false,
          label: 'Idling'
        };
      case 'Ignition On':
        return {
          bg: '#0284c7', // sky-600
          border: '#0369a1',
          textColor: '#ffffff',
          pulse: false,
          label: 'Ignition ON'
        };
      case 'Ignition Off':
        return {
          bg: '#64748b', // slate-500
          border: '#475569',
          textColor: '#ffffff',
          pulse: false,
          label: 'Ignition OFF'
        };
      case 'No Signal':
        return {
          bg: '#ef4444', // red-500
          border: '#dc2626',
          textColor: '#ffffff',
          pulse: false,
          label: 'No Signal'
        };
      default:
        return {
          bg: '#3b82f6',
          border: '#2563eb',
          textColor: '#ffffff',
          pulse: false,
          label: status
        };
    }
  };

  // Initialize Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Destroy any existing map instance attached to this container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (err) {
        console.warn('Map cleanup error:', err);
      }
      mapInstanceRef.current = null;
    }

    // Leaflet assigns an internal _leaflet_id to the DOM node; clearing it prevents "Map container is already initialized"
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const initialCenter: [number, number] = centerCoordinates
      ? [centerCoordinates.lat, centerCoordinates.lng]
      : [13.045, 80.12];

    let map: L.Map;
    try {
      map = L.map(container, {
        center: initialCenter,
        zoom: zoomLevel,
        zoomControl: false,
        attributionControl: false
      });
    } catch (e) {
      console.warn('Leaflet map creation handled error:', e);
      return;
    }

    // Add clean tiles (styled via CSS to dark mode)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Zoom control in bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layers groups
    geofencesLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    drawingLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Click handler for drawing
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickForDrawing) {
        onMapClickForDrawing({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapInstanceRef.current = map;

    // Invalidate size after container mounting
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Map unmount cleanup error:', err);
        }
        mapInstanceRef.current = null;
      }
      if (container && (container as unknown as { _leaflet_id?: number })._leaflet_id) {
        delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []);

  // Update vehicle markers incrementally without destroying and recreating DOM nodes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layer = markersLayerRef.current;
    const currentMarkers = markersByVehicleIdRef.current;
    const activeIds = new Set<string>();

    vehicles.forEach((vehicle) => {
      if (!vehicle || !vehicle.coordinates || typeof vehicle.coordinates.lat !== 'number' || typeof vehicle.coordinates.lng !== 'number') {
        return;
      }
      activeIds.add(vehicle.id);
      const { lat, lng } = vehicle.coordinates;
      const isSelected = selectedVehicle?.id === vehicle.id;
      const style = getStatusColor(vehicle.status);

      // Stable marker cache key based on visual attributes
      const markerKey = `${lat.toFixed(5)}_${lng.toFixed(5)}_${vehicle.status}_${vehicle.heading || 0}_${isSelected}`;

      const existing = currentMarkers.get(vehicle.id);

      if (existing) {
        // If nothing changed visually, do not touch DOM
        if (existing.key === markerKey) {
          return;
        }

        // Only update position if moved
        const curLatLng = existing.marker.getLatLng();
        if (Math.abs(curLatLng.lat - lat) > 0.00001 || Math.abs(curLatLng.lng - lng) > 0.00001) {
          existing.marker.setLatLng([lat, lng]);
        }
      }

      // Create HTML marker
      const markerHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
          <div class="relative flex items-center justify-center ${
            style.pulse ? 'pulse-moving' : ''
          }" style="
            width: ${isSelected ? '38px' : '32px'};
            height: ${isSelected ? '38px' : '32px'};
            background-color: ${style.bg};
            border: 2px solid ${isSelected ? '#ffffff' : style.border};
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            transition: all 0.2s ease;
          ">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: ${style.textColor}; transform: rotate(${vehicle.heading || 0}deg);">
              <path d="M10 17h4V5H2v12h3m9 0h2.5a2.5 2.5 0 0 0 2.5-2.5V10l-3-4h-2" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          </div>

          <div class="mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-md ${
            isSelected
              ? 'bg-blue-600 text-white border border-blue-400'
              : 'bg-slate-900/90 text-slate-200 border border-slate-700'
          }">
            ${vehicle.plateNumber}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: markerHtml,
        iconSize: [40, 55],
        iconAnchor: [20, 28]
      });

      if (existing) {
        existing.marker.setIcon(customIcon);
        existing.key = markerKey;
      } else {
        const marker = L.marker([lat, lng], { icon: customIcon });

        const popupHtml = `
          <div class="p-3.5 bg-slate-900 text-slate-100 rounded-xl min-w-[220px] font-sans border border-slate-700">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div>
                <span class="text-xs font-mono font-bold text-blue-400">${vehicle.plateNumber}</span>
                <p class="text-[11px] text-slate-400">${vehicle.name}</p>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style="background-color: ${style.bg}">
                ${vehicle.status}
              </span>
            </div>
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-400">Speed:</span>
                <span class="font-bold text-slate-200">${vehicle.currentSpeed} km/h</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Ignition:</span>
                <span class="font-semibold ${vehicle.ignition ? 'text-emerald-400' : 'text-slate-400'}">
                  ${vehicle.ignition ? 'ON' : 'OFF'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Fuel Level:</span>
                <span class="font-bold text-slate-200">${vehicle.fuelLevel}%</span>
              </div>
              <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 truncate">
                📍 ${vehicle.lastKnownLocation}
              </div>
            </div>
            <button id="view-details-${vehicle.id}" class="mt-3 w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors text-center block">
              Open Telemetry Details →
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false });
        marker.on('click', () => onSelectVehicle(vehicle));
        marker.on('popupopen', () => {
          const btn = document.getElementById(`view-details-${vehicle.id}`);
          if (btn) btn.onclick = () => onSelectVehicle(vehicle);
        });

        layer.addLayer(marker);
        currentMarkers.set(vehicle.id, { marker, key: markerKey });
      }
    });

    // Remove deleted vehicle markers
    for (const [vId, entry] of currentMarkers.entries()) {
      if (!activeIds.has(vId)) {
        layer.removeLayer(entry.marker);
        currentMarkers.delete(vId);
      }
    }
  }, [vehicles, selectedVehicle?.id, onSelectVehicle]);

  // Handle selected vehicle flyTo (ONLY once when user explicitly selects a vehicle)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicle) return;

    if (prevSelectedVehIdRef.current === selectedVehicle.id) {
      return; // Already centered on this vehicle, prevent camera shaking
    }

    prevSelectedVehIdRef.current = selectedVehicle.id;
    const { lat, lng } = selectedVehicle.coordinates;
    mapInstanceRef.current.flyTo([lat, lng], 13, {
      duration: 1.0
    });
  }, [selectedVehicle?.id]);

  // Render Area Geofences
  useEffect(() => {
    if (!mapInstanceRef.current || !geofencesLayerRef.current) return;

    geofencesLayerRef.current.clearLayers();
    if (!showGeofences) return;

    areaGeofences.forEach((geo) => {
      if (!geo.enabled) return;

      if (geo.shapeType === 'polygon' && geo.coordinates.length >= 3) {
        const latLngs = geo.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
        const polygon = L.polygon(latLngs, {
          color: geo.color || '#0284c7',
          weight: 2,
          opacity: 0.8,
          fillColor: geo.color || '#0284c7',
          fillOpacity: 0.15,
          dashArray: '4, 6'
        });

        polygon.bindTooltip(`<b>${geo.name}</b><br/><span style="font-size:10px">${geo.assignedVehicleIds.length} vehicles assigned</span>`, {
          permanent: false,
          direction: 'center',
          className: 'bg-slate-900 text-white text-xs border border-slate-700 px-2 py-1 rounded shadow-lg'
        });

        geofencesLayerRef.current?.addLayer(polygon);
      } else if (geo.shapeType === 'circle' && geo.center && geo.radius) {
        const circle = L.circle([geo.center.lat, geo.center.lng], {
          radius: geo.radius,
          color: geo.color || '#16a34a',
          weight: 2,
          opacity: 0.8,
          fillColor: geo.color || '#16a34a',
          fillOpacity: 0.15,
          dashArray: '4, 6'
        });

        circle.bindTooltip(`<b>${geo.name}</b><br/><span style="font-size:10px">Radius: ${(geo.radius / 1000).toFixed(1)} km</span>`, {
          permanent: false,
          direction: 'center',
          className: 'bg-slate-900 text-white text-xs border border-slate-700 px-2 py-1 rounded shadow-lg'
        });

        geofencesLayerRef.current?.addLayer(circle);
      }
    });
  }, [areaGeofences, showGeofences]);

  // Render Route Geofences
  useEffect(() => {
    if (!mapInstanceRef.current || !routesLayerRef.current) return;

    routesLayerRef.current.clearLayers();
    if (!showGeofences) return;

    routeGeofences.forEach((route) => {
      if (!route.enabled || route.waypoints.length < 2) return;

      const pathLatLngs = route.waypoints.map((w) => [w.lat, w.lng] as [number, number]);

      // Route line
      const polyline = L.polyline(pathLatLngs, {
        color: route.color || '#f59e0b',
        weight: 4,
        opacity: 0.85
      });

      // Buffer corridor line
      const corridor = L.polyline(pathLatLngs, {
        color: route.color || '#f59e0b',
        weight: 16,
        opacity: 0.15
      });

      // Start marker
      const startMarker = L.circleMarker([route.startLocation.lat, route.startLocation.lng], {
        radius: 6,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 1
      }).bindTooltip(`Start: ${route.startLocation.name}`);

      // End marker
      const endMarker = L.circleMarker([route.endLocation.lat, route.endLocation.lng], {
        radius: 6,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 1
      }).bindTooltip(`Destination: ${route.endLocation.name}`);

      polyline.bindTooltip(`<b>${route.name}</b><br/><span style="font-size:10px">Corridor: ±${route.corridorWidthMeters}m</span>`);

      routesLayerRef.current?.addLayer(corridor);
      routesLayerRef.current?.addLayer(polyline);
      routesLayerRef.current?.addLayer(startMarker);
      routesLayerRef.current?.addLayer(endMarker);
    });
  }, [routeGeofences, showGeofences]);

  // Render temporary drawing layer
  useEffect(() => {
    if (!mapInstanceRef.current || !drawingLayerRef.current) return;

    drawingLayerRef.current.clearLayers();

    if (isDrawingArea && drawingPoints.length > 0) {
      drawingPoints.forEach((pt, index) => {
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: 5,
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 1
        }).bindTooltip(`Point #${index + 1}`);
        drawingLayerRef.current?.addLayer(marker);
      });

      if (drawingPoints.length >= 2) {
        const line = L.polyline(
          drawingPoints.map((p) => [p.lat, p.lng]),
          { color: '#38bdf8', weight: 2, dashArray: '5, 5' }
        );
        drawingLayerRef.current?.addLayer(line);
      }
    }
  }, [isDrawingArea, drawingPoints]);

  const fitAllVehicles = () => {
    if (!mapInstanceRef.current || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((v) => [v.coordinates.lat, v.coordinates.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 shadow-xl" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map floating controls overlay */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <button
          onClick={fitAllVehicles}
          title="Fit all vehicles in view"
          className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5"
        >
          <span>Fit All</span>
          <span className="text-[10px] text-slate-400 font-mono">({vehicles.length})</span>
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 shadow-xl hidden md:flex items-center gap-3 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Moving</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Idling</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>Ignition ON</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span>Ignition OFF</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>No Signal</span>
        </div>
      </div>

      {isDrawingArea && (
        <div className="absolute top-3 left-3 z-20 bg-blue-900/90 text-blue-100 border border-blue-700 px-3 py-2 rounded-lg text-xs backdrop-blur-md shadow-xl flex items-center gap-2 animate-pulse">
          <span>Click on map to place polygon boundary points ({drawingPoints.length} points placed)</span>
        </div>
      )}
    </div>
  );
};
