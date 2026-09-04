import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { AreaGeofence, RouteGeofence, Vehicle, AlertEvent } from '../types';
import { LeafletMap } from '../components/LeafletMap';

interface GeofencingViewProps {
  areaGeofences: AreaGeofence[];
  routeGeofences: RouteGeofence[];
  vehicles: Vehicle[];
  onAddAreaGeofence: (geo: AreaGeofence) => void;
  onUpdateAreaGeofence: (geo: AreaGeofence) => void;
  onDeleteAreaGeofence: (id: string) => void;
  onAddRouteGeofence: (route: RouteGeofence) => void;
  onUpdateRouteGeofence: (route: RouteGeofence) => void;
  onDeleteRouteGeofence: (id: string) => void;
  onTriggerAlert: (alert: AlertEvent) => void;
}

export const GeofencingView: React.FC<GeofencingViewProps> = ({
  areaGeofences,
  routeGeofences,
  vehicles,
  onAddAreaGeofence,
  onUpdateAreaGeofence,
  onDeleteAreaGeofence,
  onAddRouteGeofence,
  onUpdateRouteGeofence,
  onDeleteRouteGeofence,
  onTriggerAlert
}) => {
  const [activeTab, setActiveTab] = useState<'area' | 'route'>('area');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  // Route creation state
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [startPointPreset, setStartPointPreset] = useState('chennai_port');
  const [endPointPreset, setEndPointPreset] = useState('bangalore_hub');
  const [corridorWidth, setCorridorWidth] = useState(500);
  const [routeAssignedVehicles, setRouteAssignedVehicles] = useState<string[]>([]);

  // Simulation test feedback
  const [testNotification, setTestNotification] = useState<string | null>(null);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);

  // Predefined logistics locations for route navigation creation
  const PRESET_LOCATIONS: Record<string, { name: string; lat: number; lng: number }> = {
    chennai_port: { name: 'Chennai Port Logistics Gate', lat: 13.092, lng: 80.298 },
    sriperumbudur: { name: 'Sriperumbudur Auto Cluster', lat: 12.9815, lng: 79.954 },
    ennore_dock: { name: 'Ennore Coastal Dock Terminal', lat: 13.2415, lng: 80.312 },
    ambattur_depot: { name: 'Ambattur Inland Freight Depot', lat: 13.0982, lng: 80.1611 },
    bangalore_hub: { name: 'Bangalore Electronic City Gateway', lat: 12.839, lng: 77.677 },
    kanchipuram: { name: 'Kanchipuram Outer Expressway Hub', lat: 12.8342, lng: 79.7036 }
  };

  const handleMapClick = (pt: { lat: number; lng: number }) => {
    if (!isDrawing) return;
    setDrawingPoints((prev) => [...prev, pt]);
    setGeofenceError(null);
  };

  const handleSaveAreaGeofence = () => {
    setGeofenceError(null);
    if (!newAreaName.trim()) {
      setGeofenceError('Please enter a name for the area geofence.');
      return;
    }
    if (drawingPoints.length < 3) {
      setGeofenceError('Please click at least 3 points on the map to define the area boundary polygon.');
      return;
    }

    const newGeo: AreaGeofence = {
      id: `geo-${Date.now()}`,
      name: newAreaName.trim(),
      type: 'area',
      shapeType: 'polygon',
      coordinates: drawingPoints,
      assignedVehicleIds: selectedVehicleIds,
      enabled: true,
      color: '#3b82f6',
      alertOnEnter: true,
      alertOnExit: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddAreaGeofence(newGeo);
    setIsDrawing(false);
    setDrawingPoints([]);
    setNewAreaName('');
    setSelectedVehicleIds([]);
    setGeofenceError(null);
  };

  const handleSaveRouteGeofence = () => {
    setGeofenceError(null);
    if (!newRouteName.trim()) {
      setGeofenceError('Please enter a name for the route geofence.');
      return;
    }

    const start = PRESET_LOCATIONS[startPointPreset];
    const end = PRESET_LOCATIONS[endPointPreset];

    // Compute synthetic waypoints along navigation corridor
    const waypoints = [
      { lat: start.lat, lng: start.lng },
      { lat: (start.lat * 2 + end.lat) / 3, lng: (start.lng * 2 + end.lng) / 3 },
      { lat: (start.lat + end.lat * 2) / 3, lng: (start.lng + end.lng * 2) / 3 },
      { lat: end.lat, lng: end.lng }
    ];

    const newRoute: RouteGeofence = {
      id: `route-${Date.now()}`,
      name: newRouteName.trim(),
      type: 'route',
      startLocation: start,
      endLocation: end,
      waypoints,
      corridorWidthMeters: corridorWidth,
      assignedVehicleIds: routeAssignedVehicles,
      enabled: true,
      color: '#f59e0b',
      alertOnDeviation: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddRouteGeofence(newRoute);
    setIsCreatingRoute(false);
    setNewRouteName('');
    setRouteAssignedVehicles([]);
    setGeofenceError(null);
  };

  // Modular event detection simulator
  const handleSimulateEvent = (type: 'enter' | 'exit' | 'deviation', vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
    let msg = '';
    let alertType: AlertEvent['alertType'] = 'Geofence Enter';

    if (type === 'enter') {
      alertType = 'Geofence Enter';
      msg = `Vehicle ${vehicle.plateNumber} entered geofence perimeter at ${vehicle.lastKnownLocation}`;
    } else if (type === 'exit') {
      alertType = 'Geofence Exit';
      msg = `Vehicle ${vehicle.plateNumber} exited authorized geofence boundary near ${vehicle.lastKnownLocation}`;
    } else {
      alertType = 'Route Deviation';
      msg = `WARNING: Vehicle ${vehicle.plateNumber} deviated 620 meters from assigned corridor!`;
    }

    const event: AlertEvent = {
      id: `sim-alt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plateNumber,
      alertType,
      message: msg,
      severity: type === 'deviation' ? 'high' : 'medium',
      status: 'New',
      location: vehicle.lastKnownLocation
    };

    onTriggerAlert(event);
    setTestNotification(msg);
    setTimeout(() => setTestNotification(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Header controls & Type toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Geofence Boundary & Route Corridor Control</span>
          </h2>
          <p className="text-xs text-slate-400">
            Define perimeter zones, navigation route corridors, and configure enter/exit/deviation alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher: Area Geofence vs Route Geofence */}
          <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('area')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'area'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Area Geofences ({areaGeofences.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('route')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'route'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route Geofences ({routeGeofences.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulator banner */}
      {testNotification && (
        <div className="p-3 bg-amber-950/80 border border-amber-800 text-amber-200 text-xs rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{testNotification}</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono">Logged to Notifications</span>
        </div>
      )}

      {/* Main Grid: Controls on Left, Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Geofence Items */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Trigger Box */}
          {activeTab === 'area' ? (
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Area Geofence Actions
                </span>
                {!isDrawing ? (
                  <button
                    onClick={() => {
                      setIsDrawing(true);
                      setDrawingPoints([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Draw New Zone</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDrawing(false);
                      setDrawingPoints([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancel Drawing
                  </button>
                )}
              </div>

              {isDrawing && (
                <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                  <div className="p-2.5 rounded-lg bg-blue-950/50 border border-blue-800/60 text-blue-200 text-[11px] leading-relaxed flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span>💡 <strong>How to draw:</strong> Click map points for vertices.</span>
                      <span className="font-mono font-bold text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded text-[10px]">
                        {drawingPoints.length} points
                      </span>
                    </div>
                    {drawingPoints.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-blue-800/40">
                        <button
                          type="button"
                          onClick={() => setDrawingPoints((prev) => prev.slice(0, -1))}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium"
                        >
                          Undo Last Point
                        </button>
                        <button
                          type="button"
                          onClick={() => setDrawingPoints([])}
                          className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 text-[10px] font-medium"
                        >
                          Clear Points
                        </button>
                      </div>
                    )}
                  </div>

                  {geofenceError && activeTab === 'area' && (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{geofenceError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1">Geofence Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. North Harbor Security Yard"
                      value={newAreaName}
                      onChange={(e) => {
                        setNewAreaName(e.target.value);
                        setGeofenceError(null);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Assign Vehicles to Zone</label>
                    <div className="max-h-28 overflow-y-auto space-y-1 p-2 bg-slate-800 rounded-lg border border-slate-700">
                      {vehicles.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVehicleIds.includes(v.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVehicleIds([...selectedVehicleIds, v.id]);
                              } else {
                                setSelectedVehicleIds(selectedVehicleIds.filter((id) => id !== v.id));
                              }
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span className="font-mono font-bold text-white">{v.plateNumber}</span>
                          <span className="text-slate-400 truncate">({v.name})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAreaGeofence}
                    disabled={drawingPoints.length < 3 || !newAreaName.trim()}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors shadow"
                  >
                    Save Area Geofence ({drawingPoints.length} pts)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Route Corridor Setup
                </span>
                {!isCreatingRoute ? (
                  <button
                    onClick={() => setIsCreatingRoute(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Route Path</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCreatingRoute(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isCreatingRoute && (
                <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                  {geofenceError && activeTab === 'route' && (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{geofenceError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1">Route Corridor Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Chennai Port to Bangalore Gateway Route"
                      value={newRouteName}
                      onChange={(e) => {
                        setNewRouteName(e.target.value);
                        setGeofenceError(null);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Start Location</label>
                      <select
                        value={startPointPreset}
                        onChange={(e) => setStartPointPreset(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        {Object.entries(PRESET_LOCATIONS).map(([k, v]) => (
                          <option key={k} value={k}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">End Location</label>
                      <select
                        value={endPointPreset}
                        onChange={(e) => setEndPointPreset(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        {Object.entries(PRESET_LOCATIONS).map(([k, v]) => (
                          <option key={k} value={k}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Allowed Corridor Buffer:</span>
                      <span className="font-mono text-white">±{corridorWidth} meters</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={corridorWidth}
                      onChange={(e) => setCorridorWidth(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Assign Vehicles to Route</label>
                    <div className="max-h-24 overflow-y-auto space-y-1 p-2 bg-slate-800 rounded-lg border border-slate-700">
                      {vehicles.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={routeAssignedVehicles.includes(v.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRouteAssignedVehicles([...routeAssignedVehicles, v.id]);
                              } else {
                                setRouteAssignedVehicles(routeAssignedVehicles.filter((id) => id !== v.id));
                              }
                            }}
                            className="rounded border-slate-700 text-amber-600 focus:ring-0"
                          />
                          <span className="font-mono font-bold text-white">{v.plateNumber}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveRouteGeofence}
                    disabled={!newRouteName.trim() || startPointPreset === endPointPreset}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors shadow"
                  >
                    Save & Store Route Path
                  </button>
                </div>
              )}
            </div>
          )}

          {/* List of Defined Geofences */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
              Active Geofence Profiles
            </span>

            {activeTab === 'area' ? (
              areaGeofences.map((geo) => (
                <div
                  key={geo.id}
                  className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: geo.color }}
                      />
                      <h4 className="font-bold text-white text-xs">{geo.name}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Enable/Disable switch per prompt */}
                      <button
                        onClick={() => onUpdateAreaGeofence({ ...geo, enabled: !geo.enabled })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          geo.enabled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {geo.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteAreaGeofence(geo.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete geofence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>
                      Type: <strong className="text-slate-200 capitalize">{geo.shapeType}</strong>
                    </span>
                    <span>
                      {geo.assignedVehicleIds.length} Vehicles Assigned
                    </span>
                  </div>

                  {/* Simulator buttons for Enter/Exit event testing */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSimulateEvent('enter', geo.assignedVehicleIds[0] || vehicles[0].id)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                    >
                      ⚡ Test "Vehicle Enters"
                    </button>
                    <button
                      onClick={() => handleSimulateEvent('exit', geo.assignedVehicleIds[0] || vehicles[0].id)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                    >
                      ⚡ Test "Vehicle Exits"
                    </button>
                  </div>
                </div>
              ))
            ) : (
              routeGeofences.map((route) => (
                <div
                  key={route.id}
                  className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-amber-400" />
                      <h4 className="font-bold text-white text-xs">{route.name}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateRouteGeofence({ ...route, enabled: !route.enabled })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          route.enabled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {route.enabled ? 'Active' : 'Muted'}
                      </button>

                      <button
                        onClick={() => onDeleteRouteGeofence(route.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete route geofence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800">
                    <div>Origin: <span className="text-slate-200">{route.startLocation.name}</span></div>
                    <div>Destination: <span className="text-slate-200">{route.endLocation.name}</span></div>
                    <div className="text-amber-400 font-mono">Allowed corridor: ±{route.corridorWidthMeters}m</div>
                  </div>

                  {/* Simulator button for route deviation */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleSimulateEvent('deviation', route.assignedVehicleIds[0] || vehicles[0].id)}
                      className="w-full py-1 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 text-amber-300 rounded text-[11px] font-medium transition-colors"
                    >
                      ⚡ Test "Vehicle Deviates from Route" Alert
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Interactive Map */}
        <div className="lg:col-span-7">
          <div className="sticky top-20">
            <LeafletMap
              vehicles={vehicles}
              selectedVehicle={null}
              onSelectVehicle={() => {}}
              areaGeofences={areaGeofences}
              routeGeofences={routeGeofences}
              showGeofences={true}
              height="640px"
              isDrawingArea={isDrawing}
              drawingPoints={drawingPoints}
              onMapClickForDrawing={handleMapClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
