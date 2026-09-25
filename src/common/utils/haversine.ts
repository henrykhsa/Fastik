/**
 * Calcula a distância entre dois pontos na superfície da Terra
 * usando a fórmula de Haversine.
 *
 * @param lat1 - Latitude do ponto 1 (graus decimais)
 * @param lng1 - Longitude do ponto 1 (graus decimais)
 * @param lat2 - Latitude do ponto 2 (graus decimais)
 * @param lng2 - Longitude do ponto 2 (graus decimais)
 * @returns Distância em quilômetros
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const EARTH_RADIUS_KM = 6371;

  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
