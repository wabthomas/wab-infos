import type { AiChatAction } from '@/components/redaction/ai-editor-chat';

/** Actions Wab Ai produites hors de l'éditeur (bouton flottant), appliquées à l'ouverture de /nouveau. */
const KEY = 'wab_ai_pending_actions';

export function storePendingAiActions(actions: AiChatAction[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ actions, at: Date.now() }));
  } catch {
    // stockage indisponible : l'utilisateur relancera la demande dans l'éditeur
  }
}

export function takePendingAiActions(): AiChatAction[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { actions?: AiChatAction[]; at?: number };
    if (!parsed.at || Date.now() - parsed.at > 10 * 60_000) return [];
    return Array.isArray(parsed.actions) ? parsed.actions : [];
  } catch {
    return [];
  }
}
