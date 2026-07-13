export function applyManualGeocodeResult(inputAddress, result) {
  const latitude = Number(result?.latitude);
  const longitude = Number(result?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('Geocoding result must include valid coordinates.');
  }

  return {
    address: String(inputAddress ?? '').trim(),
    latitude,
    longitude,
    provider: result?.provider,
  };
}
