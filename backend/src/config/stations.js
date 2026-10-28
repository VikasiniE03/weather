/**
 * Weather Stations Configuration
 * Representing 5 IoT weather monitoring stations deployed across Chennai, India.
 * Includes geographic coordinates (WGS84), microclimatic characteristics, and base parameters.
 */
export const STATIONS = [
  {
    id: "STN-001",
    name: "Marina Coastline",
    code: "STN-001",
    location: "Marina Beach Promenade, Chennai",
    lat: 13.0827,
    lon: 80.2707,
    elevation: 6, // meters
    zone: "Coastal Maritime",
    description: "High humidity, sea breeze buffer, rapid cooling at twilight",
    baseTemp: 31.8,
    baseHumidity: 78.5,
    basePressure: 1010.8,
    baseWindSpeed: 18.2, // km/h
    baseWindDirection: "ENE", // East-North-East coastal sea breeze
    baseRainfall: 0.0, // mm/h
    isFaultTarget: false,
    operator: {
      id: "OP-001",
      name: "Rajesh Kumar",
      role: "Lead Coastal Station Engineer",
      phone: "+91 98401 11001", // Demo placeholder for STN-001
      email: "operator1@aerosense.gov.in",
      shift: "Morning (06:00 - 18:00 IST)",
      smsAlertsEnabled: true,
      weatherAlertsEnabled: true
    }
  },
  {
    id: "STN-002",
    name: "T. Nagar Urban Hub",
    code: "STN-002",
    location: "Thyagaraya Nagar Central, Chennai",
    lat: 13.0418,
    lon: 80.2341,
    elevation: 12,
    zone: "Commercial Heat Island",
    description: "Dense concrete urban heat island effect, slightly lower humidity",
    baseTemp: 33.2,
    baseHumidity: 65.2,
    basePressure: 1010.2,
    baseWindSpeed: 8.5,
    baseWindDirection: "SE",
    baseRainfall: 0.0,
    isFaultTarget: false,
    operator: {
      id: "OP-002",
      name: "Priya Sharma",
      role: "Urban Microclimate Field Specialist",
      phone: "+91 98402 22002", // Demo placeholder for STN-002
      email: "operator2@aerosense.gov.in",
      shift: "General (09:00 - 17:00 IST)",
      smsAlertsEnabled: true,
      weatherAlertsEnabled: true
    }
  },
  {
    id: "STN-003",
    name: "Guindy Tech Park",
    code: "STN-003",
    location: "Guindy Industrial Estate / IIT Madras, Chennai",
    lat: 13.0067,
    lon: 80.2206,
    elevation: 15,
    zone: "Suburban Industrial Canopy",
    description: "Inland vegetation & tech park canopy. Targeted for Fault Injection testing.",
    baseTemp: 32.4, // Targeted stuck value
    baseHumidity: 68.0,
    basePressure: 1011.2,
    baseWindSpeed: 10.4,
    baseWindDirection: "ESE",
    baseRainfall: 0.0,
    isFaultTarget: true,
    operator: {
      id: "OP-003",
      name: "Dr. Karthik Subramanian",
      role: "Chief IoT Hardware & Transducer Lead",
      phone: "+91 98403 33003", // Demo placeholder for STN-003
      email: "operator3@aerosense.gov.in",
      shift: "24/7 Rapid Response",
      smsAlertsEnabled: true,
      weatherAlertsEnabled: true
    }
  },
  {
    id: "STN-004",
    name: "Velachery Basin",
    code: "STN-004",
    location: "Velachery Lowlands Lake Area, Chennai",
    lat: 12.9815,
    lon: 80.2180,
    elevation: 9,
    zone: "Wetland Basin",
    description: "Low-lying retention basin, moderate thermal inertia",
    baseTemp: 32.1,
    baseHumidity: 72.8,
    basePressure: 1011.0,
    baseWindSpeed: 11.0,
    baseWindDirection: "SSE",
    baseRainfall: 0.0,
    isFaultTarget: false,
    operator: {
      id: "OP-004",
      name: "Ananya Iyer",
      role: "Hydrological & Basin Flood Watcher",
      phone: "+91 98404 44004", // Demo placeholder for STN-004
      email: "operator4@aerosense.gov.in",
      shift: "Evening (14:00 - 22:00 IST)",
      smsAlertsEnabled: true,
      weatherAlertsEnabled: true
    }
  },
  {
    id: "STN-005",
    name: "Adyar Estuary",
    code: "STN-005",
    location: "Adyar Eco Park / River Mouth, Chennai",
    lat: 13.0012,
    lon: 80.2565,
    elevation: 8,
    zone: "Estuarine Green Corridor",
    description: "River mouth breeze convergence, stable pressure profile",
    baseTemp: 31.9,
    baseHumidity: 75.0,
    basePressure: 1010.5,
    baseWindSpeed: 15.6,
    baseWindDirection: "E",
    baseRainfall: 0.0,
    isFaultTarget: false,
    operator: {
      id: "OP-005",
      name: "Vikram Nathan",
      role: "Estuarine Atmospheric Observer",
      phone: "+91 98405 55005", // Demo placeholder for STN-005
      email: "operator5@aerosense.gov.in",
      shift: "Night Vigil (22:00 - 06:00 IST)",
      smsAlertsEnabled: true,
      weatherAlertsEnabled: true
    }
  }
];

export const FAULT_CONFIG = {
  targetStationId: "STN-003",
  stuckThresholdCycles: 5,
  stuckTemperature: 32.40,
  stuckHumidity: 68.00,
  stuckPressure: 1011.20,
  maxRadiusKm: 15.0,
  // Thresholds for anomaly detection
  spikeTempThreshold: 5.0,      // Max allowed deg C rate-of-change in 1 cycle
  spikeHumidityThreshold: 18.0, // Max allowed % humidity rate-of-change in 1 cycle
  spatialDeviationThreshold: 3.5, // Deg C difference from IDW neighbor baseline
  spatialDeviationHumThreshold: 15.0, // % difference from IDW neighbor baseline
  timeoutOfflineSeconds: 25,   // Connectivity failure threshold
  // Physical validity ranges
  validityRanges: {
    temperature: { min: -10, max: 65 }, // deg C
    humidity: { min: 0, max: 100 },      // %
    pressure: { min: 870, max: 1085 },   // hPa
    windSpeed: { min: 0, max: 250 },     // km/h
    rainfall: { min: 0, max: 300 }       // mm/h
  }
};
