import {
  Vehicle,
  Driver,
  AreaGeofence,
  RouteGeofence,
  AlertRule,
  AlertEvent,
  RefuelEvent,
  FuelDrainEvent,
  FuelTelemetryPoint
} from './types';

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    plateNumber: 'TN-01-AB-4821',
    name: 'Freightliner Heavy Rig #1',
    type: 'Heavy Truck',
    currentSpeed: 0,
    status: 'Ignition Off',
    statusDuration: '00:15:20',
    fuelLevel: 67,
    fuelCapacity: 350,
    currentFuelLiters: 234,
    lastKnownLocation: 'Chennai Logistics Yard Bay 4',
    coordinates: { lat: 13.0645, lng: 80.1652 },
    heading: 260,
    ignition: false,
    mileage: 148200,
    driverId: 'DRV001',
    assignedDriverId: 'DRV001',
    assignedDriverName: 'Ahmed Khan',
    lastUpdated: 'Just now',
    engineTemp: 28,
    batteryVoltage: 24.3,
    assignedGeofenceIds: ['geo-1'],
    assignedRouteId: 'route-1'
  },
  {
    id: 'veh-2',
    plateNumber: 'TN-04-E-9022',
    name: 'BharatBenz Container Hauler #2',
    type: 'Container Trailer',
    currentSpeed: 0,
    status: 'Ignition Off',
    statusDuration: '00:32:10',
    fuelLevel: 42,
    fuelCapacity: 400,
    currentFuelLiters: 168,
    lastKnownLocation: 'NH48 Sriperumbudur Logistics Park',
    coordinates: { lat: 12.9691, lng: 79.9472 },
    heading: 245,
    ignition: false,
    mileage: 189400,
    driverId: 'DRV002',
    assignedDriverId: 'DRV002',
    assignedDriverName: 'Rajesh Kumar',
    lastUpdated: '1 min ago',
    engineTemp: 27,
    batteryVoltage: 24.1,
    assignedGeofenceIds: ['geo-2'],
    assignedRouteId: 'route-1'
  },
  {
    id: 'veh-3',
    plateNumber: 'TN-09-BK-3310',
    name: 'Tata Prima Prime Mover #3',
    type: 'Heavy Truck',
    currentSpeed: 0,
    status: 'Ignition Off',
    statusDuration: '00:48:15',
    fuelLevel: 81,
    fuelCapacity: 300,
    currentFuelLiters: 243,
    lastKnownLocation: 'Ennore Port Terminal Gate 2',
    coordinates: { lat: 13.2415, lng: 80.312 },
    heading: 15,
    ignition: false,
    mileage: 96350,
    driverId: 'DRV003',
    assignedDriverId: 'DRV003',
    assignedDriverName: 'Suresh Mani',
    lastUpdated: 'Just now',
    engineTemp: 26,
    batteryVoltage: 24.5,
    assignedGeofenceIds: ['geo-1']
  },
  {
    id: 'veh-4',
    plateNumber: 'TN-11-FA-7712',
    name: 'Volvo FH16 Multi-Axle #4',
    type: 'Heavy Truck',
    currentSpeed: 71,
    status: 'Moving',
    statusDuration: '03:40:02',
    fuelLevel: 55,
    fuelCapacity: 450,
    currentFuelLiters: 247,
    lastKnownLocation: 'Kanchipuram Outer Ring',
    coordinates: { lat: 12.8342, lng: 79.7036 },
    heading: 250,
    ignition: true,
    mileage: 215600,
    driverId: 'DRV004',
    lastUpdated: '2 min ago',
    engineTemp: 91,
    batteryVoltage: 24.0,
    assignedRouteId: 'route-1'
  },
  {
    id: 'veh-5',
    plateNumber: 'TN-22-CX-5509',
    name: 'Ashok Leyland 4220 Tanker #5',
    type: 'Tanker',
    currentSpeed: 48,
    status: 'Moving',
    statusDuration: '00:35:45',
    fuelLevel: 74,
    fuelCapacity: 380,
    currentFuelLiters: 281,
    lastKnownLocation: 'Poonamallee High Road',
    coordinates: { lat: 13.0489, lng: 80.0965 },
    heading: 90,
    ignition: true,
    mileage: 132400,
    driverId: 'DRV005',
    lastUpdated: 'Just now',
    engineTemp: 85,
    batteryVoltage: 24.4
  },
  {
    id: 'veh-6',
    plateNumber: 'TN-05-MN-1188',
    name: 'Scania R500 Long Haul #6',
    type: 'Heavy Truck',
    currentSpeed: 0,
    status: 'Idling',
    statusDuration: '00:18:22',
    fuelLevel: 62,
    fuelCapacity: 400,
    currentFuelLiters: 248,
    lastKnownLocation: 'Manali Industrial Area Gate 3',
    coordinates: { lat: 13.1788, lng: 80.2642 },
    heading: 180,
    ignition: true,
    mileage: 174300,
    driverId: 'DRV006',
    lastUpdated: 'Just now',
    engineTemp: 94,
    batteryVoltage: 23.8,
    assignedGeofenceIds: ['geo-1']
  },
  {
    id: 'veh-7',
    plateNumber: 'TN-18-GH-4421',
    name: 'Eicher Pro 6035 Tipper #7',
    type: 'Heavy Truck',
    currentSpeed: 0,
    status: 'Idling',
    statusDuration: '00:22:40',
    fuelLevel: 31,
    fuelCapacity: 250,
    currentFuelLiters: 77,
    lastKnownLocation: 'Sriperumbudur Loading Bay 4',
    coordinates: { lat: 12.9815, lng: 79.954 },
    heading: 0,
    ignition: true,
    mileage: 88700,
    lastUpdated: 'Just now',
    engineTemp: 92,
    batteryVoltage: 23.9,
    assignedGeofenceIds: ['geo-2']
  },
  {
    id: 'veh-8',
    plateNumber: 'TN-07-ZZ-9901',
    name: 'Mahindra Blazo X 49 #8',
    type: 'Container Trailer',
    currentSpeed: 0,
    status: 'Ignition On',
    statusDuration: '00:04:12',
    fuelLevel: 89,
    fuelCapacity: 350,
    currentFuelLiters: 311,
    lastKnownLocation: 'Guindy Logistics Hub staging',
    coordinates: { lat: 13.0067, lng: 80.2023 },
    heading: 45,
    ignition: true,
    mileage: 62100,
    driverId: 'DRV007',
    lastUpdated: 'Just now',
    engineTemp: 78,
    batteryVoltage: 24.6
  },
  {
    id: 'veh-9',
    plateNumber: 'TN-10-LK-6043',
    name: 'Tata Signa 4825.T #9',
    type: 'Flatbed Truck',
    currentSpeed: 0,
    status: 'Ignition Off',
    statusDuration: '05:42:19',
    fuelLevel: 18,
    fuelCapacity: 365,
    currentFuelLiters: 65,
    lastKnownLocation: 'Maraimalai Nagar Freight Yard',
    coordinates: { lat: 12.7934, lng: 80.0245 },
    heading: 0,
    ignition: false,
    mileage: 241900,
    lastUpdated: '5 mins ago',
    engineTemp: 34,
    batteryVoltage: 24.2
  },
  {
    id: 'veh-10',
    plateNumber: 'TN-14-PP-8120',
    name: 'BharatBenz 2823R Reefer #10',
    type: 'Refrigerated Truck',
    currentSpeed: 0,
    status: 'Ignition Off',
    statusDuration: '08:15:30',
    fuelLevel: 94,
    fuelCapacity: 280,
    currentFuelLiters: 263,
    lastKnownLocation: 'Ambattur Industrial Estate Depot',
    coordinates: { lat: 13.0982, lng: 80.1611 },
    heading: 0,
    ignition: false,
    mileage: 112050,
    lastUpdated: '12 mins ago',
    engineTemp: 31,
    batteryVoltage: 24.4,
    assignedGeofenceIds: ['geo-3']
  },
  {
    id: 'veh-11',
    plateNumber: 'TN-20-QQ-3399',
    name: 'Ashok Leyland Boss 1415 #11',
    type: 'Flatbed Truck',
    currentSpeed: 0,
    status: 'Ignition Off',
    statusDuration: '03:10:00',
    fuelLevel: 51,
    fuelCapacity: 200,
    currentFuelLiters: 102,
    lastKnownLocation: 'Chromepet Truck Rest Plaza',
    coordinates: { lat: 12.9517, lng: 80.141 },
    heading: 0,
    ignition: false,
    mileage: 95400,
    lastUpdated: '18 mins ago',
    engineTemp: 33,
    batteryVoltage: 24.1
  },
  {
    id: 'veh-12',
    plateNumber: 'TN-28-RT-0101',
    name: 'MAN CLA 31.280 #12',
    type: 'Heavy Truck',
    currentSpeed: 0,
    status: 'No Signal',
    statusDuration: '02:45:10',
    fuelLevel: 45,
    fuelCapacity: 300,
    currentFuelLiters: 135,
    lastKnownLocation: 'Ranipet Forest Transit Corridor',
    coordinates: { lat: 12.9284, lng: 79.3326 },
    heading: 270,
    ignition: false,
    mileage: 267300,
    lastUpdated: '2 hours ago',
    engineTemp: 29,
    batteryVoltage: 23.5
  }
];

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'DRV001',
    driverId: 'DRV001',
    name: 'Ahmed Khan',
    driverName: 'Ahmed Khan',
    phone: '+91 98401 23456',
    assignedVehicleId: 'veh-1',
    assignedVehicle: 'TN-01-AB-4821',
    rfidId: '22 9D 30 00',
    rfidUid: '22 9D 30 00',
    rfidUidAliases: ['RFID102934', '22 9D 30 00', '229D3000'],
    status: 'Inactive',
    licenseNumber: 'TN-01-2018-009211',
    experienceYears: 8,
    joinedDate: '15 Jan 2021',
    totalTrips: 642,
    safetyScore: 96,
    loginTime: undefined,
    lastRfidScan: undefined
  },
  {
    id: 'DRV002',
    driverId: 'DRV002',
    name: 'Rajesh Kumar',
    driverName: 'Rajesh Kumar',
    phone: '+91 98840 55123',
    assignedVehicleId: 'veh-2',
    assignedVehicle: 'TN-04-E-9022',
    rfidId: 'RFID204812',
    rfidUid: 'RFID204812',
    status: 'Inactive',
    licenseNumber: 'TN-04-2016-004381',
    experienceYears: 11,
    joinedDate: '02 Mar 2019',
    totalTrips: 890,
    safetyScore: 92,
    loginTime: undefined,
    lastRfidScan: undefined
  },
  {
    id: 'DRV003',
    driverId: 'DRV003',
    name: 'Suresh Mani',
    driverName: 'Suresh Mani',
    phone: '+91 94441 88902',
    assignedVehicleId: 'veh-3',
    assignedVehicle: 'TN-09-BK-3310',
    rfidId: 'RFID309124',
    rfidUid: 'RFID309124',
    status: 'Inactive',
    licenseNumber: 'TN-09-2019-011294',
    experienceYears: 6,
    joinedDate: '10 Aug 2022',
    totalTrips: 412,
    safetyScore: 98,
    loginTime: undefined,
    lastRfidScan: undefined
  },
  {
    id: 'DRV004',
    name: 'Mohamed Farooq',
    phone: '+91 97909 33214',
    assignedVehicleId: 'veh-4',
    rfidId: 'RFID401923',
    status: 'Active',
    licenseNumber: 'TN-11-2015-007823',
    experienceYears: 13,
    joinedDate: '18 Nov 2018',
    totalTrips: 1120,
    safetyScore: 94
  },
  {
    id: 'DRV005',
    name: 'Venkatesh Rao',
    phone: '+91 98412 77651',
    assignedVehicleId: 'veh-5',
    rfidId: 'RFID508712',
    status: 'Active',
    licenseNumber: 'TN-22-2020-003419',
    experienceYears: 5,
    joinedDate: '05 May 2023',
    totalTrips: 310,
    safetyScore: 89
  },
  {
    id: 'DRV006',
    name: 'Karthik Selvan',
    phone: '+91 96001 44521',
    assignedVehicleId: 'veh-6',
    rfidId: 'RFID602931',
    status: 'Resting',
    licenseNumber: 'TN-05-2017-006512',
    experienceYears: 9,
    joinedDate: '12 Sep 2020',
    totalTrips: 740,
    safetyScore: 91
  },
  {
    id: 'DRV007',
    name: 'Anand Prakash',
    phone: '+91 98408 99876',
    assignedVehicleId: 'veh-8',
    rfidId: 'RFID703418',
    status: 'On Duty',
    licenseNumber: 'TN-07-2021-008192',
    experienceYears: 4,
    joinedDate: '14 Feb 2024',
    totalTrips: 215,
    safetyScore: 95
  },
  {
    id: 'DRV008',
    name: 'Dinesh Babu',
    phone: '+91 99620 11234',
    assignedVehicleId: undefined,
    rfidId: 'RFID804592',
    status: 'Inactive',
    licenseNumber: 'TN-10-2014-002194',
    experienceYears: 12,
    joinedDate: '20 Jul 2017',
    totalTrips: 980,
    safetyScore: 93
  }
];

export const INITIAL_AREA_GEOFENCES: AreaGeofence[] = [
  {
    id: 'geo-1',
    name: 'Chennai Harbor & Port Terminal Zone',
    type: 'area',
    shapeType: 'polygon',
    coordinates: [
      { lat: 13.085, lng: 80.285 },
      { lat: 13.115, lng: 80.298 },
      { lat: 13.125, lng: 80.325 },
      { lat: 13.085, lng: 80.315 }
    ],
    assignedVehicleIds: ['veh-1', 'veh-3', 'veh-6'],
    enabled: true,
    color: '#0284c7', // sky-600
    alertOnEnter: true,
    alertOnExit: true,
    createdAt: '2026-08-10'
  },
  {
    id: 'geo-2',
    name: 'Sriperumbudur Auto Logistics Hub',
    type: 'area',
    shapeType: 'circle',
    center: { lat: 12.975, lng: 79.948 },
    radius: 3500,
    coordinates: [],
    assignedVehicleIds: ['veh-2', 'veh-7'],
    enabled: true,
    color: '#16a34a', // green-600
    alertOnEnter: true,
    alertOnExit: true,
    createdAt: '2026-08-15'
  },
  {
    id: 'geo-3',
    name: 'Ambattur Inland Container Depot',
    type: 'area',
    shapeType: 'polygon',
    coordinates: [
      { lat: 13.090, lng: 80.145 },
      { lat: 13.112, lng: 80.150 },
      { lat: 13.115, lng: 80.178 },
      { lat: 13.088, lng: 80.172 }
    ],
    assignedVehicleIds: ['veh-10'],
    enabled: true,
    color: '#9333ea', // purple-600
    alertOnEnter: true,
    alertOnExit: true,
    createdAt: '2026-08-20'
  }
];

export const INITIAL_ROUTE_GEOFENCES: RouteGeofence[] = [
  {
    id: 'route-1',
    name: 'Chennai Port to Bangalore Gateway Route',
    type: 'route',
    startLocation: {
      name: 'Chennai Port Logistics Gate',
      lat: 13.092,
      lng: 80.298
    },
    endLocation: {
      name: 'Bangalore Electronic City Hub',
      lat: 12.839,
      lng: 77.677
    },
    waypoints: [
      { lat: 13.092, lng: 80.298 },
      { lat: 13.0645, lng: 80.1652 },
      { lat: 12.9691, lng: 79.9472 },
      { lat: 12.8342, lng: 79.7036 },
      { lat: 12.918, lng: 79.132 },
      { lat: 12.839, lng: 77.677 }
    ],
    corridorWidthMeters: 500,
    assignedVehicleIds: ['veh-1', 'veh-2', 'veh-4'],
    enabled: true,
    color: '#f59e0b', // amber-500
    alertOnDeviation: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'route-2',
    name: 'Ennore Port to Sriperumbudur Component Line',
    type: 'route',
    startLocation: {
      name: 'Ennore Coastal Dock',
      lat: 13.2415,
      lng: 80.312
    },
    endLocation: {
      name: 'Sriperumbudur Auto Cluster',
      lat: 12.9815,
      lng: 79.954
    },
    waypoints: [
      { lat: 13.2415, lng: 80.312 },
      { lat: 13.1788, lng: 80.2642 },
      { lat: 13.0489, lng: 80.0965 },
      { lat: 12.9815, lng: 79.954 }
    ],
    corridorWidthMeters: 400,
    assignedVehicleIds: ['veh-3', 'veh-5'],
    enabled: true,
    color: '#06b6d4', // cyan-500
    alertOnDeviation: true,
    createdAt: '2026-08-18'
  }
];

export const INITIAL_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-1',
    alertType: 'Fuel Alert',
    enabled: true,
    vehicleId: 'ALL',
    threshold: 'Fuel below 20%',
    destination: 'fleet@example.com',
    frequency: '15 minutes',
    description: 'Trigger notification when fuel drops below 20% capacity'
  },
  {
    id: 'rule-2',
    alertType: 'Refuel Alert',
    enabled: true,
    vehicleId: 'ALL',
    threshold: 'Fuel increase >= 5 L',
    destination: 'fleet@example.com',
    frequency: 'Immediate',
    description: 'Trigger when a significant increase in fuel level is detected (difference >= 5L)'
  },
  {
    id: 'rule-3',
    alertType: 'Idle Alert',
    enabled: true,
    vehicleId: 'ALL',
    threshold: 'Ignition ON & stationary > 15 min',
    destination: 'operations@example.com',
    frequency: '15 minutes',
    description: 'Ideal alert if the ignition is on and does not move for 15 min'
  },
  {
    id: 'rule-4',
    alertType: 'Route Deviation',
    enabled: true,
    vehicleId: 'veh-1',
    threshold: 'Deviation > 500m from corridor',
    destination: 'dispatch@example.com',
    frequency: 'Immediate',
    description: 'Alert dispatch if vehicle deviates from assigned route corridor'
  }
];

export const INITIAL_ALERT_HISTORY: AlertEvent[] = [
  {
    id: 'alt-101',
    timestamp: '2026-09-03 21:12:00',
    vehicleId: 'veh-9',
    vehiclePlate: 'TN-10-LK-6043',
    alertType: 'Fuel Alert',
    message: 'Low fuel level detected (18% remaining, approx 65 L). Immediate refueling recommended.',
    severity: 'high',
    status: 'New',
    location: 'Maraimalai Nagar Freight Yard'
  },
  {
    id: 'alt-102',
    timestamp: '2026-09-03 20:45:12',
    vehicleId: 'veh-7',
    vehiclePlate: 'TN-18-GH-4421',
    alertType: 'Idle Alert',
    message: 'Excessive idling detected: Ignition ON and stationary for 22 minutes (threshold: 15 min).',
    severity: 'medium',
    status: 'Acknowledged',
    location: 'Sriperumbudur Loading Bay 4'
  },
  {
    id: 'alt-103',
    timestamp: '2026-09-03 18:30:45',
    vehicleId: 'veh-6',
    vehiclePlate: 'TN-05-MN-1188',
    alertType: 'Idle Alert',
    message: 'Excessive idling detected: Ignition ON and stationary for 18 minutes.',
    severity: 'medium',
    status: 'Resolved',
    location: 'Manali Industrial Area Gate 3'
  },
  {
    id: 'alt-104',
    timestamp: '2026-09-03 14:15:20',
    vehicleId: 'veh-1',
    vehiclePlate: 'TN-01-AB-4821',
    alertType: 'Refuel Alert',
    message: 'Refuel detected: Added 50 L (+21% increase) at Ajman Highway Fuel Station.',
    severity: 'low',
    status: 'Resolved',
    location: 'Ajman Central Fueling Station'
  },
  {
    id: 'alt-105',
    timestamp: '2026-09-03 11:02:18',
    vehicleId: 'veh-12',
    vehiclePlate: 'TN-28-RT-0101',
    alertType: 'Geofence Exit',
    message: 'GPS Telemetry signal lost for over 120 minutes near transit corridor.',
    severity: 'high',
    status: 'Acknowledged',
    location: 'Ranipet Forest Transit Corridor'
  }
];

export const INITIAL_REFUEL_HISTORY: RefuelEvent[] = [
  {
    id: 'ref-1',
    vehicleId: 'veh-1',
    vehiclePlate: 'TN-01-AB-4821',
    timestamp: '04 Sep 2026, 09:20',
    fuelBefore: 22,
    fuelAfter: 72,
    fuelAdded: 50,
    location: 'Ajman',
    stationName: 'Emirates National Fuel Mart #14',
    driverName: 'Ahmed Khan',
    odometer: 148150,
    receiptNumber: 'RCP-AJM-9021',
    cost: 165
  },
  {
    id: 'ref-2',
    vehicleId: 'veh-8',
    vehiclePlate: 'TN-07-ZZ-9901',
    timestamp: '03 Sep 2026, 17:45',
    fuelBefore: 45,
    fuelAfter: 89,
    fuelAdded: 44,
    location: 'Guindy Logistics Hub',
    stationName: 'Bharat Petroleum Fleet Depot',
    driverName: 'Anand Prakash',
    odometer: 62050,
    receiptNumber: 'BP-GDY-4481',
    cost: 140
  },
  {
    id: 'ref-3',
    vehicleId: 'veh-10',
    vehiclePlate: 'TN-14-PP-8120',
    timestamp: '03 Sep 2026, 08:30',
    fuelBefore: 18,
    fuelAfter: 94,
    fuelAdded: 76,
    location: 'Ambattur',
    stationName: 'Indian Oil High-Flow Diesel Station',
    driverName: 'Rajesh Kumar',
    odometer: 111900,
    receiptNumber: 'IOC-AMB-8820',
    cost: 245
  },
  {
    id: 'ref-4',
    vehicleId: 'veh-3',
    vehiclePlate: 'TN-09-BK-3310',
    timestamp: '02 Sep 2026, 19:10',
    fuelBefore: 30,
    fuelAfter: 81,
    fuelAdded: 51,
    location: 'Ennore Port Access',
    stationName: 'Portside Marine & Truck Fuelers',
    driverName: 'Suresh Mani',
    odometer: 96120,
    receiptNumber: 'PMT-ENN-1092',
    cost: 172
  },
  {
    id: 'ref-5',
    vehicleId: 'veh-5',
    vehiclePlate: 'TN-22-CX-5509',
    timestamp: '01 Sep 2026, 12:15',
    fuelBefore: 25,
    fuelAfter: 74,
    fuelAdded: 49,
    location: 'Poonamallee',
    stationName: 'HPCL Auto-Fuel Terminal',
    driverName: 'Venkatesh Rao',
    odometer: 132100,
    receiptNumber: 'HPCL-PNM-3199',
    cost: 160
  }
];

export const INITIAL_DRAIN_HISTORY: FuelDrainEvent[] = [
  {
    id: 'drn-1',
    vehicleId: 'veh-9',
    vehiclePlate: 'TN-10-LK-6043',
    timestamp: '2026-09-02 23:45',
    amountDrained: 28,
    location: 'Maraimalai Nagar Unattended Parking',
    suspectedTheft: true
  },
  {
    id: 'drn-2',
    vehicleId: 'veh-7',
    vehiclePlate: 'TN-18-GH-4421',
    timestamp: '2026-08-28 04:15',
    amountDrained: 18,
    location: 'Sriperumbudur Service Bay',
    suspectedTheft: false
  }
];

// Generates time series data for the interactive fuel chart
export function generateFuelHistory(range: 'Today' | '7 Days' | '30 Days' | 'Custom', baseCapacity: number = 350, currentPct: number = 67): FuelTelemetryPoint[] {
  const points: FuelTelemetryPoint[] = [];
  const now = new Date('2026-09-03T21:30:00');

  let count = 24;
  let stepMinutes = 60;

  if (range === 'Today') {
    count = 24;
    stepMinutes = 60;
  } else if (range === '7 Days') {
    count = 28;
    stepMinutes = 360; // 6 hours
  } else if (range === '30 Days') {
    count = 30;
    stepMinutes = 1440; // 24 hours
  } else {
    // Custom
    count = 20;
    stepMinutes = 120;
  }

  let runningPct = Math.min(95, currentPct + 25);
  let distance = 148000;

  for (let i = count; i >= 0; i--) {
    const t = new Date(now.getTime() - i * stepMinutes * 60000);
    const timeLabel =
      range === 'Today'
        ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : t.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });

    // Simulate steady burn and occasional refuel or drain
    const isRefuel = i === Math.floor(count * 0.4);
    const isDrain = i === Math.floor(count * 0.75);

    if (isRefuel) {
      runningPct = Math.min(96, runningPct + 35);
    } else if (isDrain) {
      runningPct = Math.max(15, runningPct - 14);
    } else {
      runningPct = Math.max(12, runningPct - (Math.random() * 1.8 + 0.5));
    }

    if (i === 0) {
      runningPct = currentPct;
    }

    const liters = Math.round((runningPct / 100) * baseCapacity);
    distance += Math.round(Math.random() * 35);

    points.push({
      timestamp: timeLabel,
      fuelLevelPercent: Math.round(runningPct),
      fuelLiters: liters,
      speed: i % 3 === 0 ? 0 : Math.round(45 + Math.random() * 25),
      distanceKm: distance,
      isRefuel,
      isDrain
    });
  }

  return points;
}

// Aliases for component convenience
export const INITIAL_ALERT_EVENTS = INITIAL_ALERT_HISTORY;
export const INITIAL_REFUEL_EVENTS = INITIAL_REFUEL_HISTORY;
export const INITIAL_DRAIN_EVENTS = INITIAL_DRAIN_HISTORY;

/**
 * Simulates real-time IoT GPS and fuel telemetry updates across the fleet
 */
export function simulateTelemetryTick(vehicles: Vehicle[], activeImuVehicleId?: string): Vehicle[] {
  return vehicles.map((v) => {
    // If this vehicle is actively controlled by the physical GY-521 IMU, preserve its live IMU speed & status
    if (v.id === activeImuVehicleId) {
      return v;
    }

    // If ignition is off, vehicle remains stationary
    if (!v.ignition) {
      return {
        ...v,
        currentSpeed: 0,
        status: 'Ignition Off',
        lastUpdated: 'Just now'
      };
    }

    // Moving vehicles advance slightly along heading
    if (v.status === 'Moving') {
      const deltaLat = (Math.cos((v.heading * Math.PI) / 180) * 0.0008) + (Math.random() - 0.5) * 0.0001;
      const deltaLng = (Math.sin((v.heading * Math.PI) / 180) * 0.0008) + (Math.random() - 0.5) * 0.0001;
      const newSpeed = Math.max(35, Math.min(85, v.currentSpeed + Math.round((Math.random() - 0.5) * 6)));
      
      // Slight fuel consumption
      const fuelDrop = Math.random() > 0.6 ? 1 : 0;
      const newFuelLiters = Math.max(10, v.currentFuelLiters - fuelDrop);
      const newFuelLevel = Math.round((newFuelLiters / v.fuelCapacity) * 100);

      return {
        ...v,
        coordinates: {
          lat: Number((v.coordinates.lat + deltaLat).toFixed(6)),
          lng: Number((v.coordinates.lng + deltaLng).toFixed(6))
        },
        currentSpeed: newSpeed,
        fuelLevel: newFuelLevel,
        currentFuelLiters: newFuelLiters,
        mileage: v.mileage + 1,
        lastUpdated: 'Just now'
      };
    }

    // Idling vehicles with ignition ON
    if (v.status === 'Idling') {
      const currentIdle = v.idleMinutes || 16;
      return {
        ...v,
        idleMinutes: currentIdle + 1,
        lastUpdated: 'Just now'
      };
    }

    return { ...v, lastUpdated: 'Just now' };
  });
}

