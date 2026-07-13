export function applyMapPin(current, latitude, longitude) {
  return {
    ...current,
    latitude,
    longitude,
    source: 'MAP_PIN',
    verified: true,
  };
}

export function clearAddressVerification(current, address) {
  return {
    ...current,
    address,
    latitude: null,
    longitude: null,
    source: 'MANUAL',
    verified: false,
  };
}
