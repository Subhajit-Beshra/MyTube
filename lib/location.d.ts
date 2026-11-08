export function requestLocationPermission(
  provider?: Pick<Geolocation, "getCurrentPosition">,
): Promise<void>;
