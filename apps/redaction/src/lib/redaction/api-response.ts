/** Lit une réponse API sans planter si le corps n'est pas du JSON (ex. 500 Passenger). */
export async function readApiJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(res.ok ? 'Réponse vide du serveur' : `Erreur serveur (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      res.ok ? 'Réponse serveur invalide' : snippet || `Erreur serveur (${res.status})`
    );
  }
}
