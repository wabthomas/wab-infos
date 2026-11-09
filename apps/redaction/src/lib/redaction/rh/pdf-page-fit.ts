/** Scale a captured document onto one A4 page without cropping or stretching. */
export function fitA4Page(width: number, height: number, margin = 10) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || margin < 0 || margin >= 105)
    throw new Error('Dimensions du document invalides.');
  const scale = Math.min((210 - 2 * margin) / width, (297 - 2 * margin) / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return { x: (210 - fittedWidth) / 2, y: margin, width: fittedWidth, height: fittedHeight };
}
