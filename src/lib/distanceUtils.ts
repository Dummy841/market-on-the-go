/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Get delivery time based on distance
 * @param distanceKm Distance in kilometers
 * @returns Delivery time string
 */
export const getDeliveryTime = (distanceKm: number): string => {
  if (distanceKm < 5) {
    return "25-35 min";
  } else if (distanceKm <= 10) {
    return "35-45 min";
  } else {
    return "60-75 min";
  }
};

/**
 * Get expected delivery time for checkout display
 * @param distanceKm Distance in kilometers
 * @returns Expected delivery time string
 */
export const getExpectedDeliveryTime = (distanceKm: number): string => {
  if (distanceKm <= 5) return "30 min";
  if (distanceKm <= 10) return "60 min";
  if (distanceKm <= 20) return "1-2 days";
  return "2-5 days";
};

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string
 */
export const formatDistance = (distanceKm: number): string => {
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Get delivery fee based on distance and order amount
 * @param distanceKm Distance in kilometers
 * @param orderAmount Order total in rupees
 * @returns Delivery fee amount
 */
export const getDeliveryFee = (distanceKm: number, orderAmount: number): number => {
  if (orderAmount >= 5000) return 0;
  if (distanceKm <= 5) return orderAmount >= 499 ? 0 : 19;
  if (distanceKm <= 10) return orderAmount >= 799 ? 0 : 29;
  if (distanceKm <= 20) return orderAmount >= 2000 ? 0 : 59;
  return 99;
};
