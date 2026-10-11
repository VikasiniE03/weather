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
    isFaultTarget: false
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
    isFaultTarget: false
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
    isFaultTarget: true
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
    isFaultTarget: false
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
    isFaultTarget: false
  }
];

export const FAULT_CONFIG = {
  targetStationId: "STN-003",
  stuckThresholdCycles: 5,
  stuckTemperature: 32.40,
  stuckHumidity: 68.00,
  stuckPressure: 1011.20,
  maxRadiusKm: 15.0
};
