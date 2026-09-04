export type VehicleStatus = 'Moving' | 'Idling' | 'Ignition On' | 'Ignition Off' | 'No Signal';

export interface Vehicle {
  id: string;
  plateNumber: string;
  name: string;
  type: 'Heavy Truck' | 'Container Trailer' | 'Tanker' | 'Refrigerated Truck' | 'Flatbed Truck';
  currentSpeed: number; // km/h
  status: VehicleStatus;
  statusDuration: string; // e.g. "01:24:35"
  fuelLevel: number; // 0 - 100 %
  fuelCapacity: number; // Liters e.g. 300
  currentFuelLiters: number; // Liters
  lastKnownLocation: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  heading: number; // degrees 0-360
  ignition: boolean; // true = on, false = off
  mileage: number; // total km
  driverId?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  idleMinutes?: number;
  lastUpdated: string;
  engineTemp?: number; // °C
  batteryVoltage?: number; // V
  assignedGeofenceIds?: string[];
  assignedRouteId?: string;
}

export type DriverStatus = 'Active' | 'On Duty' | 'Resting' | 'Inactive';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  assignedVehicleId?: string;
  rfidId: string;
  status: DriverStatus;
  licenseNumber: string;
  experienceYears: number;
  avatarUrl?: string;
  joinedDate: string;
  totalTrips: number;
  safetyScore: number; // out of 100
}

export interface AreaGeofence {
  id: string;
  name: string;
  type: 'area';
  shapeType: 'polygon' | 'circle';
  coordinates: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
  radius?: number; // in meters
  assignedVehicleIds: string[];
  enabled: boolean;
  color: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  createdAt: string;
}

export interface RouteGeofence {
  id: string;
  name: string;
  type: 'route';
  startLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  endLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  waypoints: Array<{ lat: number; lng: number }>;
  corridorWidthMeters: number;
  assignedVehicleIds: string[];
  enabled: boolean;
  color: string;
  alertOnDeviation: boolean;
  createdAt: string;
}

export type AlertType =
  | 'Fuel Alert'
  | 'Refuel Alert'
  | 'Idle Alert'
  | 'Geofence Enter'
  | 'Geofence Exit'
  | 'Route Deviation'
  | 'Driver RFID Scan';

export interface AlertRule {
  id: string;
  alertType: AlertType;
  enabled: boolean;
  vehicleId: string; // 'ALL' or specific vehicle ID
  threshold: string;
  destination: string;
  frequency: string;
  description?: string;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  vehicleId: string;
  vehiclePlate: string;
  alertType: AlertType;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'New' | 'Acknowledged' | 'Resolved';
  location?: string;
}

export interface RefuelEvent {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  timestamp: string;
  fuelBefore: number; // Liters
  fuelAfter: number; // Liters
  fuelAdded: number; // Liters
  location: string;
  stationName?: string;
  driverName?: string;
  odometer?: number;
  receiptNumber?: string;
  cost?: number;
}

export interface FuelDrainEvent {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  timestamp: string;
  amountDrained: number; // Liters
  location: string;
  suspectedTheft: boolean;
}

export interface FuelTelemetryPoint {
  timestamp: string;
  fuelLevelPercent: number;
  fuelLiters: number;
  speed: number;
  distanceKm: number;
  isRefuel?: boolean;
  isDrain?: boolean;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'fleet'
  | 'drivers'
  | 'geofencing'
  | 'fuel'
  | 'notifications'
  | 'settings';
