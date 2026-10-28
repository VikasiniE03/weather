/**
 * Serious Weather Problem & Extreme Meteorological Event Detector
 * Analyzes telemetry streams for severe real-world weather threats:
 * 1. Tropical Cyclone / Deep Barometric Depression (< 998 hPa)
 * 2. Severe Heatwave & Thermal Spike (> 38.5°C)
 * 3. Torrential Cloudburst & Flash Flood Risk (> 94% Humidity with low pressure)
 * 4. Coastal Squall & Gale Surge
 */

export class WeatherAlertDetector {
  constructor() {
    // Simulated weather emergency overrides keyed by stationId
    this.emergencyOverrides = {};

    // Standard meteorological thresholds for Chennai / Tamil Nadu IMD criteria
    this.thresholds = {
      heatwaveTemp: 38.5,       // IMD Chennai heatwave criteria
      extremeHeatTemp: 41.0,    // IMD Severe heatwave criteria
      cyclonePressure: 998.0,   // Tropical depression / cyclone eye wall
      severeCyclonePressure: 994.0,
      floodHumidity: 94.0,      // Intense atmospheric moisture saturation
      floodPressureCeiling: 1005.0
    };
  }

  /**
   * Inject or toggle a simulated severe weather problem on target station
   */
  setEmergencyOverride(stationId, emergencyType = "CYCLONE") {
    if (!emergencyType || emergencyType === "NONE") {
      delete this.emergencyOverrides[stationId];
      return {
        stationId,
        active: false,
        type: null,
        message: `Weather emergency cleared for ${stationId}. Normal ambient patterns resumed.`
      };
    }

    // Ensure strict single-station isolation: clear emergency on other stations
    this.emergencyOverrides = {};

    let overrideData = null;
    let label = "";

    switch (emergencyType) {
      case "CYCLONE":
        overrideData = {
          type: "TROPICAL_CYCLONE_WARNING",
          label: "Severe Tropical Cyclone & Storm Surge",
          pressure: 992.8,
          humidity: 96.2,
          temperature: 28.1,
          severity: "CRITICAL",
          action: "IMMEDIATE EVACUATION & HARBOR ALERT. Deep cyclonic vortex (992.8 hPa). High risk of gale wind damage and tidal surge."
        };
        label = "Tropical Cyclone Warning";
        break;

      case "HEATWAVE":
        overrideData = {
          type: "EXTREME_HEATWAVE_WARNING",
          label: "Severe Heatwave & Thermal Hazard",
          temperature: 42.4,
          humidity: 32.5,
          pressure: 1007.8,
          severity: "CRITICAL",
          action: "RED ALERT: Severe Heatwave. Ambient temperature 42.4°C exceeding critical threshold. Implement municipal cooling protocols."
        };
        label = "Extreme Heatwave Warning";
        break;

      case "FLOOD_STORM":
        overrideData = {
          type: "FLASH_FLOOD_PRECIPITATION_RISK",
          label: "Torrential Cloudburst & Flood Emergency",
          humidity: 98.4,
          pressure: 996.2,
          temperature: 26.5,
          severity: "CRITICAL",
          action: "RED ALERT: Cloudburst & Urban Inundation. Saturated atmospheric column (98.4% RH, 996.2 hPa). Activate stormwater pump stations."
        };
        label = "Cloudburst & Flash Flood Risk";
        break;

      default:
        overrideData = {
          type: "SEVERE_WEATHER_ALERT",
          label: "Severe Meteorological Disturbance",
          temperature: 39.5,
          humidity: 92.0,
          pressure: 999.0,
          severity: "HIGH",
          action: "Monitor station closely. Weather metrics diverging from microclimatic bounds."
        };
        label = "Severe Weather Disturbance";
    }

    this.emergencyOverrides[stationId] = {
      ...overrideData,
      stationId,
      timestamp: new Date().toISOString()
    };

    return {
      stationId,
      active: true,
      type: emergencyType,
      label,
      details: this.emergencyOverrides[stationId],
      message: `Severe Weather Emergency [${label}] injected on ${stationId}.`
    };
  }

  /**
   * Apply any active emergency override to telemetry reading
   */
  applyEmergencyReading(stationId, naturalReading) {
    const override = this.emergencyOverrides[stationId];
    if (!override) {
      return { reading: naturalReading, isWeatherEmergency: false, emergency: null };
    }

    return {
      reading: {
        ...naturalReading,
        temperature: override.temperature,
        humidity: override.humidity,
        pressure: override.pressure,
        isWeatherEmergency: true,
        emergencyType: override.type
      },
      isWeatherEmergency: true,
      emergency: override
    };
  }

  /**
   * Evaluate a station reading for serious weather hazards
   */
  evaluateWeatherReading(station, reading) {
    if (!reading) return null;

    // 1. Check if direct emergency override is active
    if (this.emergencyOverrides[station.id]) {
      const override = this.emergencyOverrides[station.id];
      return {
        stationId: station.id,
        stationName: station.name,
        isEmergency: true,
        alertType: override.type,
        label: override.label,
        severity: override.severity,
        triggerMetric: "composite",
        currentTemp: reading.temperature,
        currentHum: reading.humidity,
        currentPress: reading.pressure,
        description: override.action,
        recommendedAction: override.action,
        timestamp: new Date().toISOString()
      };
    }

    const { temperature, humidity, pressure } = reading;

    // 2. Severe Tropical Cyclone / Pressure Depression
    if (pressure <= this.thresholds.cyclonePressure) {
      const isSevere = pressure <= this.thresholds.severeCyclonePressure;
      return {
        stationId: station.id,
        stationName: station.name,
        isEmergency: true,
        alertType: "TROPICAL_CYCLONE_WARNING",
        label: isSevere ? "Severe Cyclonic Storm (IMD Code Red)" : "Deep Depression Cyclone Alert",
        severity: "CRITICAL",
        triggerMetric: "pressure",
        currentPress: pressure,
        currentHum: humidity,
        currentTemp: temperature,
        threshold: this.thresholds.cyclonePressure,
        description: `Barometric pressure plummeted to ${pressure} hPa (< ${this.thresholds.cyclonePressure} hPa threshold). High cyclone landfall & gale storm surge risk.`,
        recommendedAction: "Issue coastal gale warning, secure outdoor sensor arrays, and alert disaster response teams.",
        timestamp: new Date().toISOString()
      };
    }

    // 3. Extreme Heatwave Warning
    if (temperature >= this.thresholds.heatwaveTemp) {
      const isSevere = temperature >= this.thresholds.extremeHeatTemp;
      return {
        stationId: station.id,
        stationName: station.name,
        isEmergency: true,
        alertType: "EXTREME_HEATWAVE_WARNING",
        label: isSevere ? "Severe Heatwave Emergency (Code Red)" : "Extreme Heatwave Warning",
        severity: isSevere ? "CRITICAL" : "HIGH",
        triggerMetric: "temperature",
        currentTemp: temperature,
        currentHum: humidity,
        threshold: this.thresholds.heatwaveTemp,
        description: `Ambient temperature climbed to ${temperature}°C, exceeding hazardous threshold (${this.thresholds.heatwaveTemp}°C).`,
        recommendedAction: "Issue thermal safety alert to public works, protect solar arrays from thermal overload, alert municipal hospitals.",
        timestamp: new Date().toISOString()
      };
    }

    // 4. Cloudburst & Flash Flood Risk
    if (humidity >= this.thresholds.floodHumidity && pressure <= this.thresholds.floodPressureCeiling) {
      return {
        stationId: station.id,
        stationName: station.name,
        isEmergency: true,
        alertType: "FLASH_FLOOD_PRECIPITATION_RISK",
        label: "Cloudburst & Flash Flood Emergency",
        severity: "CRITICAL",
        triggerMetric: "humidity_and_pressure",
        currentHum: humidity,
        currentPress: pressure,
        description: `Atmospheric column supersaturated at ${humidity}% with low pressure trough (${pressure} hPa). Extreme precipitation & drainage overflow hazard.`,
        recommendedAction: "Dispatch emergency drainage crews, monitor retention basins, and issue flash flood warnings.",
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  getActiveEmergencies() {
    return this.emergencyOverrides;
  }

  clearEmergencies() {
    this.emergencyOverrides = {};
    return { success: true, message: "All weather emergency overrides cleared." };
  }
}

export const weatherAlertDetector = new WeatherAlertDetector();
