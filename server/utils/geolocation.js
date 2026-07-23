/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if a point is within a given radius of a target location
 * @param {number} userLat
 * @param {number} userLng
 * @param {number} targetLat
 * @param {number} targetLng
 * @param {number} radiusMeters - Default 200m
 * @returns {{isWithin: boolean, distance: number}}
 */
const isWithinRadius = (userLat, userLng, targetLat, targetLng, radiusMeters = 200) => {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
  return {
    isWithin: distance <= radiusMeters,
    distance: Math.round(distance),
  };
};

module.exports = { calculateDistance, isWithinRadius };
