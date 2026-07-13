export const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

export const FREQUENCY_OPTIONS = [
  { value: 'QD', label: 'QD (1x daily)' },
  { value: 'BID', label: 'BID (2x daily)' },
  { value: 'TID', label: 'TID (3x daily)' },
  { value: 'QID', label: 'QID (4x daily)' },
];

const VALID_TIMINGS = new Set(TIMING_OPTIONS.map((option) => option.value));

export function normalizeTimings(value) {
  const timings = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(
    timings
      .map((timing) => String(timing).trim().toUpperCase())
      .filter((timing) => VALID_TIMINGS.has(timing)),
  )];
}

export function toggleTiming(value, timing) {
  const normalized = normalizeTimings(value);
  const selectedTiming = String(timing).trim().toUpperCase();
  return normalized.includes(selectedTiming)
    ? normalized.filter((currentTiming) => currentTiming !== selectedTiming)
    : [...normalized, selectedTiming];
}

export function serializeTimings(value) {
  return normalizeTimings(value).join(',');
}

export function getFrequencyOptions(value) {
  const frequency = String(value || '').trim();
  return frequency && !FREQUENCY_OPTIONS.some((option) => option.value === frequency)
    ? [...FREQUENCY_OPTIONS, { value: frequency, label: frequency }]
    : FREQUENCY_OPTIONS;
}

export function serializeFrequency(value) {
  return String(value || '').trim();
}
