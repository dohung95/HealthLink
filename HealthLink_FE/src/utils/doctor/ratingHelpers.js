export function renderStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return '★'.repeat(full) + (hasHalf ? '½' : '') + '☆'.repeat(5 - full - (hasHalf ? 1 : 0));
}
