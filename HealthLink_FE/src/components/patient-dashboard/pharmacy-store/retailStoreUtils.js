export const money = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(value ?? 0));

export function getMedicineDisplayName(medicine = {}) {
  const brand = medicine.brandName || '';
  const generic = medicine.genericName || medicine.name || '';
  return brand && generic && brand.toLowerCase() !== generic.toLowerCase()
    ? `${brand} (${generic})`
    : brand || generic || `Medicine #${medicine.medicineId || 'N/A'}`;
}

export function getShortDescription(medicine = {}) {
  return medicine.description || medicine.activeIngredients || medicine.indications || 'No description available.';
}

export function cartSubtotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

export function toCartPayload(items) {
  return items.map((item) => ({
    medicineId: item.medicineId,
    quantity: Number(item.quantity || 1),
  }));
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';

export function getImageUrl(medicine) {
  if (!medicine?.imageUrl) return null;
  const url = medicine.imageUrl;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
}
