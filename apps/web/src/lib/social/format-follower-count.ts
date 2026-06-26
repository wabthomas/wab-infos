export function formatFollowerCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')} M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)} k`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands.toFixed(1).replace(/\.0$/, '')} k`;
  }
  return value.toLocaleString('fr-FR');
}
