export function getAddressVerificationError(error, fallback = 'Unable to verify this address.') {
  const status = Number(error?.response?.status);
  if (status === 422) return 'Address not found. Check it or confirm the location on the map.';
  if (status === 503) return 'Address verification is temporarily unavailable. Confirm the location on the map.';
  return error?.response?.data?.message || fallback;
}
