/**
 * Spatial Mathematics & Haversine Distance Engine
 * Computes great-circle distances between geospatial coordinates on WGS-84 Earth sphere
 * and provides Inverse Distance Weighting (IDW) spatial interpolation.
 */

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculate Haversine distance between two coordinates in kilometers.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Great-circle distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimals
}

/**
 * Compute the full pairwise distance matrix for all provided stations.
 * @param {Array} stations Array of station objects with { id, lat, lon }
 * @returns {Object} Nested dictionary: distanceMatrix[stnIdA][stnIdB] = distance in km
 */
export function computeDistanceMatrix(stations) {
  const matrix = {};

  for (const stnA of stations) {
    matrix[stnA.id] = {};
    for (const stnB of stations) {
      if (stnA.id === stnB.id) {
        matrix[stnA.id][stnB.id] = 0;
      } else {
        const dist = calculateHaversineDistance(stnA.lat, stnA.lon, stnB.lat, stnB.lon);
        matrix[stnA.id][stnB.id] = dist;
      }
    }
  }

  return matrix;
}

/**
 * Find neighboring stations within a specified radius (excluding self).
 * Sorted by proximity (closest first).
 * @param {string} targetStationId
 * @param {Array} allStations
 * @param {number} maxRadiusKm
 * @returns {Array} List of neighbor station objects augmented with `distanceKm`
 */
export function getNeighborsWithinRadius(targetStationId, allStations, maxRadiusKm = 15.0) {
  const target = allStations.find((s) => s.id === targetStationId);
  if (!target) return [];

  const neighbors = [];

  for (const stn of allStations) {
    if (stn.id === targetStationId) continue;

    const distanceKm = calculateHaversineDistance(target.lat, target.lon, stn.lat, stn.lon);
    if (distanceKm <= maxRadiusKm) {
      neighbors.push({
        ...stn,
        distanceKm
      });
    }
  }

  // Sort ascending by distance (nearest first)
  neighbors.sort((a, b) => a.distanceKm - b.distanceKm);

  return neighbors;
}

/**
 * Perform Inverse Distance Weighting (IDW) interpolation on a specific metric
 * using neighbor station readings.
 * 
 * Formula:
 * weight_i = 1 / (distance_i ^ power)
 * expected = sum(weight_i * metric_i) / sum(weight_i)
 * 
 * @param {Array} neighbors Array of neighbor objects containing { distanceKm, currentReading: { [metric]: number } }
 * @param {string} metric 'temperature' | 'humidity' | 'pressure'
 * @param {number} power IDW distance exponent (typically 1 or 2)
 * @returns {Object} { expectedValue, totalWeight, neighborWeights, neighborVariance }
 */
export function calculateIDWInterpolation(neighbors, metric = "temperature", power = 1.5) {
  if (!neighbors || neighbors.length === 0) {
    return { expectedValue: null, neighborVariance: 0, neighborValues: [] };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const values = [];
  const neighborWeights = [];

  for (const neighbor of neighbors) {
    const defaultFallback = metric === "humidity" ? neighbor.baseHumidity : neighbor.baseTemp;
    const val = neighbor.currentReading ? neighbor.currentReading[metric] : defaultFallback;
    if (val === undefined || val === null) continue;

    // Prevent division by zero if two stations share exact coordinate
    const effectiveDist = Math.max(neighbor.distanceKm, 0.1);
    const weight = 1 / Math.pow(effectiveDist, power);

    weightedSum += weight * val;
    totalWeight += weight;
    values.push(val);
    neighborWeights.push({
      stationId: neighbor.id,
      distanceKm: neighbor.distanceKm,
      value: val,
      rawWeight: weight
    });
  }

  if (totalWeight === 0) {
    return { expectedValue: null, neighborVariance: 0, neighborValues: [] };
  }

  const expectedValue = Math.round((weightedSum / totalWeight) * 100) / 100;

  // Calculate arithmetic variance among neighbor values to detect dynamic ambient movement
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

  return {
    expectedValue,
    neighborVariance: Math.round(variance * 1000) / 1000,
    neighborStdDev: stdDev,
    neighborValues: values,
    neighborWeights: neighborWeights.map((nw) => ({
      ...nw,
      normalizedWeightPct: Math.round((nw.rawWeight / totalWeight) * 1000) / 10
    }))
  };
}
