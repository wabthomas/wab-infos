/**
 * Données de démo (Jean Mukendi, picsum.photos, etc.) :
 * uniquement en développement local, sauf si USE_MOCK_DATA=true.
 */
export function useMockData(): boolean {
  if (process.env.USE_MOCK_DATA === 'true') return true;
  if (process.env.USE_MOCK_DATA === 'false') return false;
  return process.env.NODE_ENV === 'development';
}
