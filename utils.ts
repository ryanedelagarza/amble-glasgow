import { Coordinates } from './types';

// Haversine formula to calculate distance between two points in km
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLng = deg2rad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Convert km to approximate walking minutes (avg 5km/h = 12 mins/km)
export function getWalkingMinutes(km: number): number {
  return Math.ceil(km * 12);
}

export function formatDistance(km: number): string {
  const mins = getWalkingMinutes(km);
  if (mins > 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours} hr ${remainingMins} min`;
  }
  return `${mins} min walk`;
}
